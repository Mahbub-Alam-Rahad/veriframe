#!/usr/bin/env python3
"""Detect faces and write padded crops for training/evaluation (offline utility).

Uses OpenCV's Haar cascade to mirror the runtime preprocessing. Falls back to a
centre crop when no face is detected so coverage stays comparable to inference.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def detect_crop(image, cascade, padding: float, fallback: bool):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    h, w = image.shape[:2]
    if len(faces) == 0:
        if not fallback:
            return None, False
        side = min(h, w)
        x = (w - side) // 2
        y = (h - side) // 2
        return image[y : y + side, x : x + side], False

    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    pad_x = int(fw * padding)
    pad_y = int(fh * padding)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + fw + pad_x)
    y2 = min(h, y + fh + pad_y)
    return image[y1:y2, x1:x2], True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Directory of images/frames")
    parser.add_argument("--output", required=True, help="Directory to write crops")
    parser.add_argument("--padding", type=float, default=0.2, help="Padding ratio around face box")
    parser.add_argument("--size", type=int, default=224, help="Output square size")
    parser.add_argument("--no-fallback", action="store_true", help="Skip frames with no face")
    args = parser.parse_args()

    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(str(cascade_path))
    if cascade.empty():
        raise SystemExit(f"Failed to load Haar cascade: {cascade_path}")

    in_dir = Path(args.input)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    images = [p for p in sorted(in_dir.rglob("*")) if p.suffix.lower() in IMAGE_EXTS]
    if not images:
        print(f"No images found under {in_dir}")
        return 1

    faces = written = 0
    for path in images:
        image = cv2.imread(str(path))
        if image is None:
            print(f"{path.name}: unreadable, skipped")
            continue
        crop, has_face = detect_crop(image, cascade, args.padding, fallback=not args.no_fallback)
        if crop is None or crop.size == 0:
            continue
        crop = cv2.resize(crop, (args.size, args.size), interpolation=cv2.INTER_AREA)
        target = out_dir / f"{path.stem}.jpg"
        cv2.imwrite(str(target), crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        written += 1
        faces += int(has_face)

    print(f"wrote {written} crops to {out_dir} ({faces} with detected faces)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
