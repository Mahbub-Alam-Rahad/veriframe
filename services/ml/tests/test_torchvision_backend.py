from __future__ import annotations

import pytest
from PIL import Image

from app.backends import base
from app.backends.gend import GEND_MODEL_PREFIX, GenDBackend, parse_gend_model_id
from app.backends.registry import BackendRegistry
from app.config import Settings
from app.pipeline import AnalysisPipeline

MODEL_ID = "tv-efficientnet:Sujithg684/efficientnet@efficientnet_b0_ffpp_c23.pth"


GEND_ID = "gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF"
GEND_336_ID = "gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_336_FF"


def test_input_mode_contract() -> None:
    assert base.TorchvisionEfficientNetBackend.prefers_full_frame is True
    assert base.HfBackend.prefers_full_frame is True
    assert GenDBackend.prefers_full_frame is False
    assert base.MockBackend.prefers_full_frame is False


def test_gend_default_calibration() -> None:
    assert GenDBackend.top_fraction == 0.20
    assert GenDBackend.logit_bias == 2.0


def test_parse_gend_model_id() -> None:
    assert parse_gend_model_id(GEND_ID) == (
        "HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF"
    )
    assert parse_gend_model_id(GEND_336_ID) == (
        "HoopitAI/video-deepfake-detection-GenD_CLIP_L_336_FF"
    )


@pytest.mark.parametrize(
    "model_id",
    [
        "HoopitAI/video-deepfake-detection-GenD_CLIP_L_336_FF",
        "gend:unknown/model",
        "gend:HoopitAI/video-deepfake-detection-GenD_DINOv3_L_FF",
    ],
)
def test_parse_gend_model_id_rejects_bad_specs(model_id: str) -> None:
    with pytest.raises(base.BackendUnavailable):
        parse_gend_model_id(model_id)


def test_input_mode_override() -> None:
    settings = Settings()
    settings.model_input_mode = "auto"
    pipeline = AnalysisPipeline(settings, BackendRegistry(settings), object())  # type: ignore[arg-type]

    class CropBackend:
        prefers_full_frame = False

    class FullFrameBackend:
        prefers_full_frame = True

    assert pipeline._use_full_frames(CropBackend()) is False
    assert pipeline._use_full_frames(FullFrameBackend()) is True

    settings.model_input_mode = "full-frame"
    assert pipeline._use_full_frames(CropBackend()) is True

    settings.model_input_mode = "face-crop"
    assert pipeline._use_full_frames(FullFrameBackend()) is False


def test_parse_torchvision_model_id() -> None:
    assert base.parse_torchvision_model_id(MODEL_ID) == (
        "Sujithg684/efficientnet",
        "efficientnet_b0_ffpp_c23.pth",
    )


@pytest.mark.parametrize(
    "model_id",
    [
        "dima806/deepfake_vs_real_image_detection",
        "tv-efficientnet:Sujithg684/efficientnet",
        "tv-efficientnet:efficientnet@weights.pth",
        "tv-efficientnet:owner/repo@",
    ],
)
def test_parse_torchvision_model_id_rejects_bad_specs(model_id: str) -> None:
    with pytest.raises(base.BackendUnavailable):
        base.parse_torchvision_model_id(model_id)


def test_torchvision_backend_scores_locally(monkeypatch: pytest.MonkeyPatch) -> None:
    import huggingface_hub
    import torch
    import torchvision.models as torchvision_models
    from torch import nn

    class Tiny(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.classifier = nn.Sequential(nn.Identity(), nn.Linear(4, 2))

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.classifier(x)

    reference = Tiny()
    monkeypatch.setattr(huggingface_hub, "hf_hub_download", lambda **_: "/tmp/weights.pth")
    monkeypatch.setattr(torch, "load", lambda *_args, **_kwargs: reference.state_dict())
    monkeypatch.setattr(torchvision_models, "efficientnet_b0", lambda weights=None: Tiny())

    backend = base.TorchvisionEfficientNetBackend(
        MODEL_ID, cache_dir="/tmp/model-cache", fake_label_index=1, offline=True
    )
    # Skip the real image transform; this test only checks the scoring contract.
    backend.transform = lambda image: torch.tensor([0.1, 0.2, 0.3, 0.4])

    scores = backend.predict([Image.new("RGB", (16, 16)), Image.new("RGB", (16, 16))])
    assert len(scores) == 2
    assert all(0.0 <= score <= 1.0 for score in scores)
    assert backend.predict([]) == []

    info = backend.describe()
    assert info["backend"] == "hf"
    assert info["mock"] is False
    assert info["modelId"] == MODEL_ID
    assert info["loader"] == "torchvision-efficientnet-b0"


def test_registry_routes_torchvision_model_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings()
    settings.model_backend = "hf"
    registry = BackendRegistry(settings)
    sentinel = base.MockBackend()
    seen: list[str] = []

    def fake_backend(model_id: str) -> base.ModelBackend:
        seen.append(model_id)
        return sentinel

    monkeypatch.setattr(registry, "_torchvision_backend", fake_backend)

    backend, warnings = registry.get("hf", MODEL_ID)
    assert backend is sentinel
    assert warnings == []
    assert seen == [MODEL_ID]


def test_registry_routes_gend_model_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings()
    settings.model_backend = "hf"
    registry = BackendRegistry(settings)
    sentinel = base.MockBackend()
    seen: list[str] = []

    def fake_backend(model_id: str) -> base.ModelBackend:
        seen.append(model_id)
        return sentinel

    monkeypatch.setattr(registry, "_gend_backend", fake_backend)

    backend, warnings = registry.get("hf", GEND_ID)
    assert backend is sentinel
    assert warnings == []
    assert seen == [GEND_ID]
