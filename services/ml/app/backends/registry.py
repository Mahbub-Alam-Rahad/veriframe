from __future__ import annotations

import logging
import threading

from ..config import Settings
from .base import (
    TORCHVISION_MODEL_PREFIX,
    BackendUnavailable,
    HfBackend,
    MockBackend,
    ModelBackend,
    TorchvisionEfficientNetBackend,
)
from .gend import GEND_MODEL_PREFIX, GenDBackend

logger = logging.getLogger(__name__)


class BackendRegistry:
    """Lazily creates and caches the active backend."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = threading.Lock()
        self._hf: dict[str, HfBackend] = {}
        self._torchvision: dict[str, TorchvisionEfficientNetBackend] = {}
        self._gend: dict[str, GenDBackend] = {}
        self._mock = MockBackend()

    def mock_backend(self) -> ModelBackend:
        return self._mock

    def _torchvision_backend(self, model_id: str) -> TorchvisionEfficientNetBackend:
        with self._lock:
            if model_id in self._torchvision:
                return self._torchvision[model_id]
            backend = TorchvisionEfficientNetBackend(
                model_id,
                device=self.settings.model_device,
                cache_dir=self.settings.hf_home,
                fake_label_index=self.settings.fake_label_index,
                offline=self.settings.hf_offline,
            )
            self._torchvision[model_id] = backend
            return backend

    def _gend_backend(self, model_id: str) -> GenDBackend:
        with self._lock:
            if model_id in self._gend:
                return self._gend[model_id]
            backend = GenDBackend(
                model_id,
                device=self.settings.model_device,
                cache_dir=self.settings.hf_home,
                offline=self.settings.hf_offline,
            )
            self._gend[model_id] = backend
            return backend

    def hf_backend(self, model_id: str) -> ModelBackend:
        if model_id.startswith(TORCHVISION_MODEL_PREFIX):
            return self._torchvision_backend(model_id)
        if model_id.startswith(GEND_MODEL_PREFIX):
            return self._gend_backend(model_id)
        with self._lock:
            if model_id in self._hf:
                return self._hf[model_id]
            if len(self._hf) >= 2:
                # Bound memory on CPU-only machines with 12 GB RAM.
                self._hf.pop(next(iter(self._hf)))
            backend = HfBackend(
                model_id,
                device=self.settings.model_device,
                fake_label_index=self.settings.fake_label_index,
                trusted_remote_code=self.settings.trusted_remote_code,
            )
            self._hf[model_id] = backend
            return backend

    def get(self, backend: str, model_id: str) -> tuple[ModelBackend, list[str]]:
        warnings: list[str] = []
        configured = self.settings.effective_backend

        if backend == "mock" or configured == "mock":
            if self.settings.environment == "production" and self.settings.model_backend == "mock":
                warnings.append(
                    "Mock backend is active in production. Scores are not model-based."
                )
            return self._mock, warnings

        try:
            return self.hf_backend(model_id), warnings
        except BackendUnavailable as exc:
            if self.settings.allow_mock_fallback:
                logger.warning("HF backend unavailable, falling back to mock: %s", exc)
                warnings.append(
                    "The requested model could not be loaded; a development-only mock score was returned."
                )
                return self._mock, warnings
            raise
