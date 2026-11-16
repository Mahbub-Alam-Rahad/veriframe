from __future__ import annotations

import logging
import secrets
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.concurrency import run_in_threadpool

from ..backends.base import BackendUnavailable
from ..backends.registry import BackendRegistry
from ..config import Settings
from ..core.video import MediaError
from ..pipeline import AnalysisPipeline
from ..schemas import AnalyzeRequest
from ..storage import ObjectStorage

logger = logging.getLogger(__name__)
router = APIRouter()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


@lru_cache(maxsize=1)
def get_pipeline() -> AnalysisPipeline:
    settings = get_settings()
    settings.ensure_directories()
    return AnalysisPipeline(
        settings=settings,
        registry=BackendRegistry(settings),
        storage=ObjectStorage(settings),
    )


def verify_internal_token(
    x_internal_token: Annotated[str | None, Header()] = None,
) -> None:
    expected = get_settings().ml_internal_token
    if not x_internal_token or not secrets.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="Invalid internal service token")


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "backend": settings.effective_backend,
        "model_id": settings.model_id,
        "mock": settings.is_mock,
        "device": settings.model_device,
        "version": "1.0.0",
    }


@router.get("/v1/models")
def models() -> dict:
    settings = get_settings()
    return {
        "configuredBackend": settings.effective_backend,
        "modelId": settings.model_id,
        "device": settings.model_device,
        "mock": settings.is_mock,
        "availableBackends": ["hf", "mock"],
        "note": "The active backend is selected per request by the API's ModelVersion row.",
    }


@router.post("/v1/analyze", dependencies=[Depends(verify_internal_token)])
async def analyze(request: AnalyzeRequest) -> dict:
    pipeline = get_pipeline()
    try:
        result = await run_in_threadpool(pipeline.analyze, request)
        return result
    except MediaError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except BackendUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Analysis failed for video %s", request.video_id)
        raise HTTPException(status_code=500, detail="Analysis failed") from exc
