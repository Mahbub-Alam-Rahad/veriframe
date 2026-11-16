#!/usr/bin/env python3
"""Sample frames from videos into class-labelled image folders (offline utility).

Examples:
  python scripts/extract_frames.py --input /data/videos/real --output data/frames/real --fps 1
  python scripts/extract_frames.py --input clip.mp4 --output data/frames/fake --max-frames 120
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2


VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"}


def iter_videos(path: Path):
    if path.is_file():
        yield path
        return
    for candidate in sorted(path.rglob("*")):
        if candidate.suffix.lower() in VIDEO_EXTS:
            yield candidate


def extract(video: Path, out_dir: Path, fps: float, max_frames: int, jpeg_quality: int) -> int:
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open {video}")

    native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    step = max(1, int(round(native_fps / max(fps, 0.1))))
    stem = video.stem.replace(" ", "_")
    out_dir.mkdir(parents=True, exist_ok=True)

    frame_idx = 0
    saved = 0
    while saved < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % step == 0:
            target = out_dir / f"{stem}_f{frame_idx:06d}.jpg"
            cv2.imwrite(str(target), frame, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])
            saved += 1
        frame_idx += 1
    cap.release()
    return saved


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Video file or directory of videos")
    parser.add_argument("--output", required=True, help="Directory to write JPEG frames")
    parser.add_argument("--fps", type=float, default=1.0, help="Target sampling rate (frames/sec)")
    parser.add_argument("--max-frames", type=int, default=120, help="Maximum frames per video")
    parser.add_argument("--jpeg-quality", type=int, default=92)
    args = parser.parse_args()

    in_path = Path(args.input)
    out_root = Path(args.output)
    videos = list(iter_videos(in_path))
    if not videos:
        print(f"No videos found under {in_path}")
        return 1

    total = 0
    for video in videos:
        try:
            count = extract(video, out_root, args.fps, args.max_frames, args.jpeg_quality)
            total += count
            print(f"{video.name}: {count} frames")
        except Exception as exc:
            print(f"{video.name}: skipped ({exc})")
    print(f"wrote {total} frames from {len(videos)} video(s) to {out_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
