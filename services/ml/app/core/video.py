from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path


class MediaError(ValueError):
    pass


@dataclass(frozen=True)
class VideoMetadata:
    duration_seconds: float
    width: int
    height: int
    codec: str
    container: str
    has_audio: bool


def probe_video(path: Path) -> VideoMetadata:
    try:
        completed = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(path),
            ],
            check=True,
            capture_output=True,
            timeout=30,
            text=True,
        )
    except (subprocess.SubprocessError, OSError) as exc:
        raise MediaError("ffprobe could not read the uploaded media") from exc

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise MediaError("ffprobe returned invalid metadata") from exc

    streams = payload.get("streams") or []
    video = next(
        (
            stream
            for stream in streams
            if stream.get("codec_type") == "video"
            and not stream.get("disposition", {}).get("attached_pic")
        ),
        None,
    )
    if not video:
        raise MediaError("The file does not contain a readable video stream")

    duration = float(
        payload.get("format", {}).get("duration") or video.get("duration") or 0.0
    )
    if duration <= 0:
        raise MediaError("Could not determine video duration")

    return VideoMetadata(
        duration_seconds=duration,
        width=int(video.get("width") or 0),
        height=int(video.get("height") or 0),
        codec=str(video.get("codec_name") or "unknown"),
        container=str(payload.get("format", {}).get("format_name") or "unknown"),
        has_audio=any(stream.get("codec_type") == "audio" for stream in streams),
    )


def extract_frames(
    path: Path,
    output_dir: Path,
    *,
    duration_seconds: float,
    sample_fps: float,
    max_frames: int,
    timeout_seconds: int = 300,
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    if duration_seconds <= 0:
        raise MediaError("Video duration must be positive")

    # Sample uniformly across the whole clip instead of only analyzing the start.
    effective_fps = min(sample_fps, max_frames / max(duration_seconds, 0.001))
    effective_fps = max(effective_fps, 0.01)

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-i",
        str(path),
        "-an",
        "-vf",
        f"fps={effective_fps:.6f}",
        "-frames:v",
        str(max_frames),
        "-q:v",
        "2",
        "-threads",
        "2",
        str(output_dir / "frame-%05d.jpg"),
    ]

    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            timeout=timeout_seconds,
            text=True,
        )
    except subprocess.TimeoutExpired as exc:
        raise MediaError("Frame extraction timed out") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or "")[-400:]
        raise MediaError(f"Frame extraction failed: {detail}") from exc

    frames = sorted(output_dir.glob("frame-*.jpg"))
    if not frames:
        raise MediaError("No frames could be extracted from the video")
    return frames[:max_frames]
