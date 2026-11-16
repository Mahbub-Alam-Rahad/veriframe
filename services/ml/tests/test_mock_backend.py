from __future__ import annotations

import numpy as np
from PIL import Image

from app.backends.base import MockBackend


def make_image(seed: int = 1, size: int = 128) -> Image.Image:
    rng = np.random.default_rng(seed)
    array = rng.integers(0, 255, size=(size, size, 3), dtype=np.uint8)
    return Image.fromarray(array, mode="RGB")


def test_mock_backend_is_deterministic_and_bounded() -> None:
    backend = MockBackend()
    images = [make_image(1), make_image(2), make_image(3)]

    first = backend.predict(images)
    second = backend.predict(images)

    assert first == second
    assert len(first) == len(images)
    assert all(0.0 <= value <= 1.0 for value in first)
    assert backend.mock is True
    assert backend.describe()["mock"] is True


def test_mock_backend_handles_empty_batch() -> None:
    assert MockBackend().predict([]) == []
