from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from PIL import Image


class BackendUnavailable(RuntimeError):
    pass


class ModelBackend(ABC):
    """One interface for every detector. Surrounding code never changes when a
    model is swapped."""

    name: str = "base"
    mock: bool = False

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


class HfBackend(ModelBackend):
    """Hugging Face image classifier loaded locally (never the hosted API)."""

    name = "hf"
    mock = False

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
