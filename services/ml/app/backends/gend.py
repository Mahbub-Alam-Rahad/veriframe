from __future__ import annotations

import json
import logging
from pathlib import Path
from threading import Lock

import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F
from transformers import CLIPImageProcessor, CLIPVisionModel
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

from .base import BackendUnavailable, ModelBackend

logger = logging.getLogger(__name__)

GEND_MODEL_PREFIX = "gend:"

# Only checkpoints whose upstream code has been reviewed and reimplemented here
# are accepted. Never enable trust_remote_code for an arbitrary repository.
GEND_CLIP_CHECKPOINTS: dict[str, str] = {
    "HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF": "openai/clip-vit-large-patch14",
    "HoopitAI/video-deepfake-detection-GenD_CLIP_L_336_FF": "openai/clip-vit-large-patch14-336",
}

# The DINOv3 release points at facebook/dinov3-vitl16-pretrain-lvd1689m, which
# is gated. It cannot be downloaded with this deployment's anonymous Hub access.


def parse_gend_model_id(model_id: str) -> str:
    """Return the Hugging Face repo id from a ``gend:<repo>`` model id."""
    if not model_id.startswith(GEND_MODEL_PREFIX):
        raise BackendUnavailable(f"Not a GenD model id: {model_id}")
    repo_id = model_id[len(GEND_MODEL_PREFIX) :]
    if repo_id not in GEND_CLIP_CHECKPOINTS:
        raise BackendUnavailable(
            "Unsupported GenD checkpoint. Reviewed options are: "
            + ", ".join(f"{GEND_MODEL_PREFIX}{repo}" for repo in GEND_CLIP_CHECKPOINTS)
        )
    return repo_id


class _LinearProbe(nn.Module):
    def __init__(self, input_dim: int, num_classes: int = 2, normalize_inputs: bool = True) -> None:
        super().__init__()
        self.linear = nn.Linear(input_dim, num_classes)
        self.normalize_inputs = normalize_inputs

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        if self.normalize_inputs:
            features = F.normalize(features, p=2, dim=1)
        return self.linear(features)


class _CLIPFeatureExtractor(nn.Module):
    def __init__(self, backbone: str, cache_dir: str, offline: bool) -> None:
        super().__init__()
        try:
            clip = CLIPVisionModel.from_pretrained(
                backbone,
                cache_dir=cache_dir,
                local_files_only=offline,
            )
        except Exception as exc:  # pragma: no cover - network/model dependent
            raise BackendUnavailable(f"Could not load CLIP backbone {backbone}: {exc}") from exc
        # The published checkpoints were saved against a newer transformers
        # release where clip.vision_model is the transformer itself. Use the
        # 4.48 inner module so the parameter names match the checkpoint.
        self.vision_model = clip.vision_model
        self.config = clip.config
        # The upstream GenD model keeps the projection head for checkpoint
        # compatibility even though classification uses the pooler output.
        self.visual_projection = nn.Identity()

    @property
    def features_dim(self) -> int:
        return int(self.config.hidden_size)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        return self.vision_model(pixel_values).pooler_output


class _GenD(nn.Module):
    def __init__(self, backbone: str, projection_dim: int, head: str) -> None:
        super().__init__()
        # Constructed by GenDBackend, which injects the real vision model first.
        self.feature_extractor: _CLIPFeatureExtractor
        if head != "LinearNorm":
            raise BackendUnavailable(f"Unsupported GenD head: {head}")
        self.model = _LinearProbe(768 if "patch14-336" in backbone else 768, normalize_inputs=True)
        self._projection_dim = projection_dim

    def attach_feature_extractor(self, extractor: _CLIPFeatureExtractor) -> None:
        self.feature_extractor = extractor
        features_dim = extractor.features_dim
        self.model = _LinearProbe(features_dim, normalize_inputs=True)
        # Replace the Identity placeholder so the checkpoint's projection
        # weights load strictly without changing the forward pass.
        self.feature_extractor.visual_projection = nn.Linear(
            features_dim, self._projection_dim, bias=False
        )

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        features = self.feature_extractor(pixel_values)
        return self.model(features)


class GenDBackend(ModelBackend):
    """Local implementation of the reviewed GenD CLIP checkpoints.

    The upstream repositories ship custom remote code. This loader vendors only
    the small GenD head, uses transformers' standard CLIP vision model, and
    never sets ``trust_remote_code``. Weights are downloaded once into the
    local cache; inference stays inside this service.
    """

    name = "hf"
    mock = False
    # GenD was evaluated on padded face crops; full frames blur the artifact.
    prefers_full_frame = False
    # Calibration fitted on the four labelled clips in this installation using
    # the deployed ffmpeg fps=1 sampling grid (frame midpoints): AQP6 (real),
    # AQNp/AQOJ/AQMk (AI). It is a local decision calibration, not a general
    # accuracy claim. See docs/MODEL.md.
    logit_bias = 2.0
    top_fraction = 0.20

    def __init__(
        self,
        model_id: str,
        *,
        device: str = "cpu",
        cache_dir: str = "/models/hf-cache",
        offline: bool = False,
    ) -> None:
        repo_id = parse_gend_model_id(model_id)
        backbone = GEND_CLIP_CHECKPOINTS[repo_id]

        try:
            config_path = hf_hub_download(
                repo_id=repo_id,
                filename="config.json",
                cache_dir=cache_dir,
                local_files_only=offline,
            )
            weights_path = hf_hub_download(
                repo_id=repo_id,
                filename="model.safetensors",
                cache_dir=cache_dir,
                local_files_only=offline,
            )
            config = json.loads(Path(config_path).read_text())
            if config.get("backbone") != backbone:
                raise BackendUnavailable(
                    f"Unexpected GenD backbone: {config.get('backbone')!r} != {backbone!r}"
                )

            # transformers appends /hub to HF_HOME when no cache_dir is given.
            # Mirror that layout so the CLIP backbone shares the persistent
            # cache with the rest of the service.
            transformer_cache = str(Path(cache_dir) / "hub")
            self.processor = CLIPImageProcessor.from_pretrained(
                backbone,
                cache_dir=transformer_cache,
                local_files_only=offline,
            )
            extractor = _CLIPFeatureExtractor(
                backbone, cache_dir=transformer_cache, offline=offline
            )
            projection_dim = int(
                load_file(weights_path)["feature_extractor.visual_projection.weight"].shape[0]
            )
            model = _GenD(backbone, projection_dim=projection_dim, head=config.get("head", "linear"))
            model.attach_feature_extractor(extractor)
            model.load_state_dict(load_file(weights_path), strict=True)
        except BackendUnavailable:
            raise
        except Exception as exc:  # pragma: no cover - network/model dependent
            raise BackendUnavailable(f"Could not load GenD model {model_id}: {exc}") from exc

        self._torch = torch
        self.model_id = model_id
        self.repo_id = repo_id
        self.backbone = backbone
        self.device = self._resolve_device(device)
        self.model = model.to(self.device).eval()
        self._lock = Lock()

    @staticmethod
    def _resolve_device(device: str) -> str:
        if device != "auto":
            return device
        if torch.cuda.is_available():
            return "cuda"
        mps = getattr(torch.backends, "mps", None)
        if mps and mps.is_available():
            return "mps"
        return "cpu"

    def describe(self) -> dict[str, str | bool]:
        return {
            "backend": self.name,
            "mock": False,
            "modelId": self.model_id,
            "device": self.device,
            "loader": "gend-clip-local",
            "backbone": self.backbone,
            "labels": "{0: 'real', 1: 'fake'}",
            "logitBias": str(self.logit_bias),
        }

    def predict(self, images: list[Image.Image]) -> list[float]:
        if not images:
            return []

        scores: list[float] = []
        batch_size = 4 if "336" in self.backbone else 8
        with self._lock:
            for start in range(0, len(images), batch_size):
                batch = images[start : start + batch_size]
                inputs = self.processor(images=batch, return_tensors="pt")
                pixel_values = inputs["pixel_values"].to(self.device)
                with torch.inference_mode():
                    logits = self.model(pixel_values)
                    probabilities = torch.softmax(logits, dim=-1).cpu().numpy()
                scores.extend(float(row[1]) for row in probabilities)
        return [max(0.0, min(1.0, value)) for value in scores]
