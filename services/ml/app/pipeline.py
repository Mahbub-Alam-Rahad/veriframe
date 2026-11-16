from __future__ import annotations

import logging
import tempfile
import threading
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .backends.registry import BackendRegistry
from .config import Settings
from .core.faces import extract_face_crop
from .core.scoring import aggregate_scores
from .core.video import MediaError, extract_frames, probe_video
from .schemas import AnalyzeRequest
from .storage import ObjectStorage

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Deepfake detection is probabilistic. This score is not proof that media is "
    "authentic or manipulated. New generators, compression, occlusion and adversarial "
    "edits can change the result."
)


class AnalysisPipeline:
    def __init__(
        self,
        settings: Settings,
        registry: BackendRegistry,
        storage: ObjectStorage,
    ) -> None:
        self.settings = settings
        self.registry = registry
        self.storage = storage
        # CPU scoring is expensive; serialize by default to keep the API responsive.
        self._slots = threading.BoundedSemaphore(
            max(1, int(getattr(settings, "max_concurrent_analyses", 1)))
        )

    def analyze(self, request: AnalyzeRequest) -> dict:
        started = time.perf_counter()
        backend, warnings = self.registry.get(request.backend, request.model_id)
        if backend.mock:
            warnings.append(
                "MOCK BACKEND ACTIVE: these numbers come from image statistics, not a trained detector."
            )

        with self._slots:
            with tempfile.TemporaryDirectory(
                prefix=f"job-{request.video_id[:12]}-", dir=self.settings.temp_root
            ) as temporary:
                workdir = Path(temporary)
                video_path = workdir / "input-video"
                frames_dir = workdir / "frames"
                evidence_dir = workdir / "evidence"
                evidence_dir.mkdir(parents=True, exist_ok=True)

                self.storage.download(
                    request.video_key,
                    video_path,
                    request.bucket or self.settings.s3_bucket,
                )

                metadata = probe_video(video_path)
                if metadata.duration_seconds > request.max_duration_seconds + 0.5:
                    raise MediaError(
                        f"Video duration {metadata.duration_seconds:.1f}s exceeds the "
                        f"{request.max_duration_seconds}s limit for this plan"
                    )

                effective_fps = max(
                    0.01,
                    min(
                        request.sample_fps,
                        request.max_frames / max(metadata.duration_seconds, 0.001),
                    ),
                )

                frame_paths = extract_frames(
                    video_path,
                    frames_dir,
                    duration_seconds=metadata.duration_seconds,
                    sample_fps=request.sample_fps,
                    max_frames=request.max_frames,
                )

                crops: list[Image.Image] = []
                frame_details: list[dict] = []
                faces_detected = 0

                for index, frame_path in enumerate(frame_paths):
                    face = extract_face_crop(
                        frame_path, max_dimension=self.settings.max_model_dimension
                    )
                    if face.face_detected:
                        faces_detected += 1
                    crops.append(face.image)
                    frame_details.append(
                        {
                            "index": index,
                            "timestampSeconds": round((index + 0.5) / effective_fps, 3),
                            "faceDetected": face.face_detected,
                            "box": list(face.box) if face.box else None,
                        }
                    )

                probabilities = backend.predict(crops)
                if len(probabilities) != len(frame_paths):
                    raise RuntimeError("Backend returned a different number of scores than frames")

                for detail, probability in zip(frame_details, probabilities, strict=True):
                    detail["score"] = round(float(probability), 6)

                result = aggregate_scores(
                    probabilities,
                    temperature=request.calibration_temperature
                    if request.calibration_temperature > 0
                    else self.settings.calibration_temperature,
                )

                if faces_detected == 0:
                    warnings.append(
                        "No faces were detected; the classifier scored center crops of each frame."
                    )
                elif faces_detected < len(frame_paths) / 2:
                    warnings.append(
                        "Faces were detected in fewer than half of the sampled frames."
                    )

                flagged = self._build_evidence(
                    frame_paths,
                    frame_details,
                    evidence_dir,
                    request.user_id,
                    request.video_id,
                )

                elapsed_ms = int((time.perf_counter() - started) * 1000)
                backend_info = backend.describe()

                return {
                    "fakeScore": result.fake_score,
                    "fakeProbability": result.fake_probability,
                    "verdict": result.verdict,
                    "confidence": result.confidence,
                    "temporalScore": result.temporal_score,
                    "facesDetected": faces_detected,
                    "framesAnalyzed": len(frame_paths),
                    "frameScores": frame_details,
                    "flaggedFrames": flagged,
                    "details": {
                        "backend": backend_info.get("backend", backend.name),
                        "modelId": backend_info.get("modelId", request.model_id),
                        "mock": bool(backend_info.get("mock", backend.mock)),
                        "device": str(backend_info.get("device", self.settings.model_device)),
                        "sampleFps": round(effective_fps, 4),
                        "durationSeconds": round(metadata.duration_seconds, 3),
                        "width": metadata.width,
                        "height": metadata.height,
                        "processingMs": elapsed_ms,
                        "calibrationTemperature": request.calibration_temperature,
                        "aggregation": "mean of top 30% frames, calibrated, blended with temporal instability",
                        "visualScore": result.visual_score,
                        "disclaimer": DISCLAIMER,
                        "warnings": warnings,
                    },
                }

    def _build_evidence(
        self,
        frame_paths: list[Path],
        frame_details: list[dict],
        evidence_dir: Path,
        user_id: str,
        video_id: str,
    ) -> list[dict]:
        ranked = sorted(frame_details, key=lambda item: item["score"], reverse=True)
        selected = ranked[: self.settings.max_thumbnail_count]
        flagged: list[dict] = []

        for rank, detail in enumerate(selected):
            index = int(detail["index"])
            try:
                output = evidence_dir / f"frame-{index:05d}.jpg"
                self._annotate(frame_paths[index], output, detail)
                key = f"thumbnails/{user_id}/{video_id}/{index:05d}.jpg"
                self.storage.upload(output, key)
                flagged.append({**detail, "key": key, "rank": rank + 1})
            except Exception as exc:  # evidence is best-effort; never fail the job
                logger.warning("Could not create evidence thumbnail for frame %s: %s", index, exc)

        return flagged

    @staticmethod
    def _annotate(frame_path: Path, output: Path, detail: dict) -> None:
        with Image.open(frame_path) as opened:
            image = opened.convert("RGB")

        original_width, original_height = image.size
        if max(image.size) > 960:
            image.thumbnail((960, 960), Image.Resampling.LANCZOS)

        draw = ImageDraw.Draw(image)
        box = detail.get("box")
        if box:
            x, y, width, height = [int(value) for value in box]
            ratio_x = image.size[0] / max(1, original_width)
            ratio_y = image.size[1] / max(1, original_height)
            x, y, width, height = (
                int(x * ratio_x),
                int(y * ratio_y),
                int(width * ratio_x),
                int(height * ratio_y),
            )
            color = "#f43f5e" if detail["score"] >= 0.7 else "#f59e0b"
            draw.rectangle(
                [x, y, x + width, y + height],
                outline=color,
                width=max(2, image.size[0] // 300),
            )

        try:
            font = ImageFont.load_default(size=max(14, image.size[0] // 35))
        except TypeError:
            font = ImageFont.load_default()

        label = f"Fake score {detail['score'] * 100:.0f}%"
        text_height = getattr(font, "size", 16) + 14
        draw.rectangle([0, 0, image.size[0], text_height], fill="#0f172a")
        draw.text((8, 6), label, fill="#ffffff", font=font)
        image.save(output, "JPEG", quality=86, optimize=True)

    def health(self) -> dict:
        return {
            "storage": self.storage.health(),
        }
