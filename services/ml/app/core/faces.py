from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_CASCADE = cv2.CascadeClassifier(_CASCADE_PATH)


@dataclass(frozen=True)
class FaceCrop:
    image: Image.Image
    box: tuple[int, int, int, int] | None
    face_detected: bool


def _center_crop(image: Image.Image, ratio: float = 0.8) -> Image.Image:
    width, height = image.size
    crop_w = max(1, int(width * ratio))
    crop_h = max(1, int(height * ratio))
    left = (width - crop_w) // 2
    top = (height - crop_h) // 2
    return image.crop((left, top, left + crop_w, top + crop_h))


def extract_face_crop(
    frame_path: Path,
    *,
    max_dimension: int = 1024,
) -> FaceCrop:
    """Detect the largest frontal face and return a padded crop.

    Falls back to a center crop when no face is found so every sampled frame is
    still scored. The response records whether a face was actually detected.
    """
    with Image.open(frame_path) as opened:
        frame = opened.convert("RGB")

    width, height = frame.size
    scale = min(1.0, 960.0 / max(width, height))
    resized = frame.resize((max(1, int(width * scale)), max(1, int(height * scale))))
    gray = cv2.cvtColor(np.asarray(resized), cv2.COLOR_RGB2GRAY)

    faces = (
        _CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if not _CASCADE.empty()
        else ()
    )

    box: tuple[int, int, int, int] | None = None
    if len(faces) > 0:
        x, y, w, h = max(faces, key=lambda rect: int(rect[2]) * int(rect[3]))
        x, y, w, h = int(x / scale), int(y / scale), int(w / scale), int(h / scale)
        margin_x = int(w * 0.30)
        margin_y = int(h * 0.30)
        left = max(0, x - margin_x)
        top = max(0, y - margin_y)
        right = min(width, x + w + margin_x)
        bottom = min(height, y + h + margin_y)
        box = (left, top, right - left, bottom - top)
        crop = frame.crop((left, top, right, bottom))
    else:
        crop = _center_crop(frame)

    if max(crop.size) > max_dimension:
        crop = crop.copy()
        crop.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    return FaceCrop(image=crop, box=box, face_detected=box is not None)
