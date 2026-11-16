from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AnalyzeRequest(CamelModel):
    video_key: str = Field(min_length=3, max_length=600)
    bucket: str | None = Field(default=None, max_length=120)
    video_id: str = Field(min_length=1, max_length=80)
    user_id: str = Field(min_length=1, max_length=80)
    model_id: str = Field(min_length=1, max_length=250)
    backend: Literal["hf", "mock"] = "mock"
    calibration_temperature: float = Field(default=1.0, ge=0.1, le=10.0)
    sample_fps: float = Field(default=1.0, ge=0.1, le=10.0)
    max_frames: int = Field(default=120, ge=1, le=600)
    max_duration_seconds: int = Field(default=600, ge=5, le=7200)


class HealthResponse(CamelModel):
    status: str
    backend: str
    model_id: str
    mock: bool
    device: str
    version: str
