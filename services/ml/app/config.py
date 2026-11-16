from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the private inference service."""

    model_config = SettingsConfigDict(
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    app_name: str = "VeriFrame ML"
    environment: str = Field(default="development", validation_alias="NODE_ENV")
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")

    ml_internal_token: str = Field(
        default="development-internal-token-change-me",
        validation_alias="ML_INTERNAL_TOKEN",
    )

    model_backend: Literal["auto", "hf", "mock"] = Field(
        default="mock", validation_alias="MODEL_BACKEND"
    )
    model_id: str = Field(
        default="dima806/deepfake_vs_real_image_detection", validation_alias="MODEL_ID"
    )
    model_device: str = Field(default="cpu", validation_alias="MODEL_DEVICE")
    calibration_temperature: float = Field(
        default=1.0, validation_alias="MODEL_CALIBRATION_TEMPERATURE"
    )
    fake_label_index: int = Field(default=1, validation_alias="FAKE_LABEL_INDEX")
    allow_mock_fallback: bool = Field(default=True, validation_alias="ALLOW_MOCK_FALLBACK")
    hf_home: str = Field(default="/models/hf-cache", validation_alias="HF_HOME")
    hf_offline: bool = Field(default=False, validation_alias="HF_HUB_OFFLINE")
    trusted_remote_code: bool = Field(default=False, validation_alias="HF_TRUST_REMOTE_CODE")

    sample_fps: float = Field(default=1.0, validation_alias="SAMPLE_FPS")
    max_frames: int = Field(default=120, validation_alias="MAX_FRAMES")
    max_video_seconds: int = Field(default=600, validation_alias="MAX_VIDEO_SECONDS")
    max_thumbnail_count: int = 6
    max_model_dimension: int = 1024

    s3_endpoint: str = Field(default="http://localhost:9000", validation_alias="S3_ENDPOINT")
    s3_region: str = Field(default="us-east-1", validation_alias="S3_REGION")
    s3_access_key: str = Field(default="minioadmin", validation_alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", validation_alias="S3_SECRET_KEY")
    s3_bucket: str = Field(default="deepfake", validation_alias="S3_BUCKET")
    s3_force_path_style: bool = Field(default=True, validation_alias="S3_FORCE_PATH_STYLE")

    temp_root: str = "/tmp/veriframe"
    max_concurrent_analyses: int = Field(default=1, validation_alias="MAX_CONCURRENT_ANALYSES")

    @property
    def effective_backend(self) -> str:
        if self.model_backend == "auto":
            return "hf"
        return self.model_backend

    @property
    def is_mock(self) -> bool:
        return self.effective_backend == "mock"

    def ensure_directories(self) -> None:
        Path(self.temp_root).mkdir(parents=True, exist_ok=True)
        try:
            Path(self.hf_home).mkdir(parents=True, exist_ok=True)
        except PermissionError:
            # Local development may not be able to create /models. Docker gives
            # the unprivileged user ownership, so this only affects workstations.
            fallback = Path.home() / ".cache" / "huggingface"
            fallback.mkdir(parents=True, exist_ok=True)
            self.hf_home = str(fallback)
            import os

            os.environ.setdefault("HF_HOME", self.hf_home)
