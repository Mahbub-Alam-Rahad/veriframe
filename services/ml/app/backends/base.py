from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from threading import Lock

from PIL import Image


class BackendUnavailable(RuntimeError):
    pass


# Model IDs with this prefix are raw torchvision state dicts hosted on the Hub,
# e.g. tv-efficientnet:Sujithg684/efficientnet@efficientnet_b0_ffpp_c23.pth
TORCHVISION_MODEL_PREFIX = "tv-efficientnet:"


def parse_torchvision_model_id(model_id: str) -> tuple[str, str]:
    """Split ``tv-efficientnet:<repo>@<weights-file>`` into repo and filename."""
    if not model_id.startswith(TORCHVISION_MODEL_PREFIX):
        raise BackendUnavailable(f"Not a torchvision EfficientNet model id: {model_id}")
    spec = model_id[len(TORCHVISION_MODEL_PREFIX) :]
    repo_id, separator, filename = spec.partition("@")
    if not separator or not repo_id or not filename or "/" not in repo_id:
        raise BackendUnavailable(
            "Expected tv-efficientnet:<owner>/<repo>@<weights-file> (for example "
            "tv-efficientnet:Sujithg684/efficientnet@efficientnet_b0_ffpp_c23.pth)"
        )
    return repo_id, filename


class ModelBackend(ABC):
    """One interface for every detector. Surrounding code never changes when a
    model is swapped."""

    name: str = "base"
    mock: bool = False
    # Frame-level detectors trained on full video frames must not receive face crops.
    prefers_full_frame: bool = False
    # Backend-specific aggregation defaults. A model that was calibrated with a
    # small top-frame window or a logit offset can declare it here so swapping
    # models does not silently reuse another checkpoint's decision rule.
    top_fraction: float = 0.30
    logit_bias: float = 0.0

    @abstractmethod
    def predict(self, images: list[Image.Image]) -> list[float]:
        """Return a fake probability in [0, 1] for each image."""

    @abstractmethod
    def describe(self) -> dict[str, str | bool]:
        """Small metadata blob for responses and health checks."""


class MockBackend(ModelBackend):
    """
    Deterministic development backend based on image statistics.

    It exists so the product can be exercised without downloading weights. It is
    NOT a deepfake detector and every response marks it as mock. Production must
    use the HF backend or a fine-tuned model.
    """

    name = "mock"
    mock = True

    def describe(self) -> dict[str, str | bool]:
        return {
            "backend": self.name,
            "mock": True,
            "modelId": "heuristic-mock-v1",
            "note": "Development-only image statistics. Not a trained detector.",
        }

    def predict(self, images: list[Image.Image]) -> list[float]:
        import numpy as np
        from PIL import ImageOps

        scores: list[float] = []
        for image in images:
            gray = ImageOps.grayscale(image).resize((256, 256))
            array = np.asarray(gray, dtype=np.float32) / 255.0

            # High-frequency residual: smooth synthetic faces often carry less
            # sensor noise, while recompressed footage carries block artefacts.
            blur = _box_blur(array)
            residual = float(np.mean(np.abs(array - blur)))

            # Saturation variation and channel spread.
            rgb = np.asarray(image.convert("RGB").resize((128, 128)), dtype=np.float32) / 255.0
            saturation = float(np.mean(np.std(rgb, axis=2)))

            # Local blockiness at 8-pixel boundaries.
            vertical = np.abs(np.diff(array, axis=1))[:, 7::8]
            horizontal = np.abs(np.diff(array, axis=0))[7::8, :]
            blockiness = float(vertical.mean() + horizontal.mean()) / 2.0

            logit = (
                (residual - 0.035) * 22.0
                + (saturation - 0.18) * 6.0
                + (blockiness - 0.03) * 12.0
                - 0.25
            )
            score = 1.0 / (1.0 + np.exp(-logit))
            scores.append(float(max(0.001, min(0.999, score))))
        return scores


def _box_blur(array):
    import numpy as np

    padded = np.pad(array, 1, mode="edge")
    stacked = np.stack(
        [
            padded[dy : dy + array.shape[0], dx : dx + array.shape[1]]
            for dy in range(3)
            for dx in range(3)
        ]
    )
    return stacked.mean(axis=0)


class TorchvisionEfficientNetBackend(ModelBackend):
    """
    torchvision EfficientNet-B0 checkpoint distributed as a raw ``.pth`` file.

    Some published deepfake detectors are torchvision state dicts rather than
    transformers checkpoints. Re-encoding their weights into a transformers
    EfficientNet changes padding and batch-norm behaviour, so this loader uses
    the publisher's reference architecture instead. Weights are still downloaded
    once from the Hub into the local model cache; no hosted inference is used.
    """

    name = "hf"
    mock = False
    # The FF++ checkpoint was trained on full 224x224 frames, not face crops.
    prefers_full_frame = True

    def __init__(
        self,
        model_id: str,
        *,
        device: str = "cpu",
        cache_dir: str = "/models/hf-cache",
        fake_label_index: int = 1,
        offline: bool = False,
    ) -> None:
        repo_id, filename = parse_torchvision_model_id(model_id)

        try:
            import torch
            import torchvision.models as torchvision_models
            from huggingface_hub import hf_hub_download
            from torch import nn
            from torchvision.transforms import Compose, Resize, ToTensor
        except ImportError as exc:  # pragma: no cover - exercised in Docker
            raise BackendUnavailable(
                "torch/torchvision are not installed; install the CPU wheels from the image"
            ) from exc

        try:
            weights_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                cache_dir=cache_dir,
                local_files_only=offline,
            )
            state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
            model = torchvision_models.efficientnet_b0(weights=None)
            classifier = model.classifier[1]
            model.classifier[1] = nn.Linear(classifier.in_features, 2)
            model.load_state_dict(state_dict)
        except Exception as exc:  # pragma: no cover - network/model dependent
            raise BackendUnavailable(f"Could not load torchvision model {model_id}: {exc}") from exc

        resolved_device = device
        if resolved_device == "auto":
            resolved_device = "cuda" if torch.cuda.is_available() else "cpu"

        self._torch = torch
        self.model = model.to(resolved_device).eval()
        self.device = resolved_device
        self.model_id = model_id
        # The FF++ checkpoint is trained as 0=real, 1=fake. Keep the configured
        # index so operators can audit it via FAKE_LABEL_INDEX if it ever changes.
        self.fake_index = fake_label_index if fake_label_index in (0, 1) else 1
        self.transform = Compose([Resize((224, 224)), ToTensor()])
        self._lock = Lock()

    def describe(self) -> dict[str, str | bool]:
        labels = {1 - self.fake_index: "real", self.fake_index: "fake"}
        return {
            "backend": self.name,
            "mock": False,
            "modelId": self.model_id,
            "device": self.device,
            "loader": "torchvision-efficientnet-b0",
            "labels": str(labels),
        }

    def predict(self, images: list[Image.Image]) -> list[float]:
        if not images:
            return []

        torch = self._torch
        scores: list[float] = []
        with self._lock:
            for start in range(0, len(images), 8):
                batch = images[start : start + 8]
                tensors = torch.stack([self.transform(image.convert("RGB")) for image in batch])
                tensors = tensors.to(self.device)
                with torch.inference_mode():
                    probabilities = torch.softmax(self.model(tensors), dim=-1).cpu().numpy()
                scores.extend(float(row[self.fake_index]) for row in probabilities)
        return scores


class HfBackend(ModelBackend):
    """Hugging Face image classifier loaded locally (never the hosted API)."""

    name = "hf"
    mock = False
    # Tested detectors in this repo score full frames better than Haar crops.
    # MODEL_INPUT_MODE=face-crop can override this when a model requires crops.
    prefers_full_frame = True

    def __init__(
        self,
        model_id: str,
        *,
        device: str = "cpu",
        fake_label_index: int = 1,
        trusted_remote_code: bool = False,
    ) -> None:
        try:
            import torch
            from transformers import AutoImageProcessor, AutoModelForImageClassification
        except ImportError as exc:  # pragma: no cover - exercised in Docker
            raise BackendUnavailable(
                "torch/transformers are not installed; install the CPU torch wheel and requirements"
            ) from exc

        self._torch = torch
        self.model_id = model_id
        self.device = self._resolve_device(device)
        self._lock = __import__("threading").Lock()

        try:
            self.processor = AutoImageProcessor.from_pretrained(
                model_id,
                trust_remote_code=trusted_remote_code,
            )
            self.model = AutoModelForImageClassification.from_pretrained(
                model_id,
                trust_remote_code=trusted_remote_code,
                use_safetensors=True,
            )
            self.model.to(self.device)
            self.model.eval()
        except Exception as exc:  # pragma: no cover - network/model dependent
            raise BackendUnavailable(f"Could not load model {model_id}: {exc}") from exc

        self.fake_index = self._resolve_label_index(fake_label_index)

    def _resolve_device(self, device: str) -> str:
        if device != "auto":
            return device
        if self._torch.cuda.is_available():
            return "cuda"
        if getattr(self._torch.backends, "mps", None) and self._torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _resolve_label_index(self, fallback: int) -> int:
        labels = {int(key): str(value).lower() for key, value in (self.model.config.id2label or {}).items()}
        fake_tokens = ("fake", "deepfake", "ai", "generated", "synthetic", "manipulated")
        for index, label in labels.items():
            if any(token in label for token in fake_tokens):
                return index
        if len(labels) <= 1:
            return 0
        return fallback if fallback in labels else max(labels)

    def describe(self) -> dict[str, str | bool]:
        return {
            "backend": self.name,
            "mock": False,
            "modelId": self.model_id,
            "device": self.device,
            "labels": str(self.model.config.id2label),
        }

    def predict(self, images: list[Image.Image]) -> list[float]:
        if not images:
            return []

        torch = self._torch
        scores: list[float] = []
        batch_size = 8

        with self._lock:
            for start in range(0, len(images), batch_size):
                batch = images[start : start + batch_size]
                inputs = self.processor(images=batch, return_tensors="pt")
                inputs = {key: value.to(self.device) for key, value in inputs.items()}
                with torch.inference_mode():
                    logits = self.model(**inputs).logits
                    probabilities = torch.softmax(logits, dim=-1).cpu().numpy()
                if probabilities.shape[1] == 1:
                    scores.extend(float(value[0]) for value in probabilities)
                else:
                    scores.extend(float(row[self.fake_index]) for row in probabilities)

        return [max(0.0, min(1.0, value)) for value in scores]
