"""Score aggregation, calibration and verdict bands.

Keeping this pure makes the important part of the detector testable without
loading a model or decoding a video.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class ScoreResult:
    fake_probability: float
    fake_score: int
    verdict: str
    confidence: float
    visual_score: float
    temporal_score: float


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = _mean(values)
    return math.sqrt(sum((value - mean) ** 2 for value in values) / len(values))


def calibrate_probability(probability: float, temperature: float, logit_bias: float = 0.0) -> float:
    """Temperature-scale a probability in logit space.

    ``logit_bias`` shifts the decision boundary. It is used only by backends
    that declare a locally calibrated offset; it is recorded in the analysis
    details so a score can be audited against the model that produced it.
    """
    temperature = max(0.1, float(temperature))
    p = _clamp(probability, 1e-6, 1 - 1e-6)
    logit = math.log(p / (1 - p))
    scaled = logit / temperature + float(logit_bias)
    return 1.0 / (1.0 + math.exp(-scaled))


def temporal_anomaly(frame_probabilities: list[float]) -> float:
    """
    Frame-to-frame flicker is a weak signal, not proof. Normalize the standard
    deviation so 0.25 std maps to the maximum temporal anomaly.
    """
    if len(frame_probabilities) < 4:
        return 0.0
    return _clamp(_std(frame_probabilities) / 0.25)


def verdict_for(probability: float) -> str:
    if probability >= 0.70:
        return "LIKELY_FAKE"
    if probability <= 0.30:
        return "LIKELY_REAL"
    return "UNCERTAIN"


def aggregate_scores(
    frame_probabilities: list[float],
    *,
    temperature: float = 1.0,
    top_fraction: float = 0.30,
    logit_bias: float = 0.0,
    temporal_weight: float = 0.15,
) -> ScoreResult:
    if not frame_probabilities:
        raise ValueError("At least one frame score is required")

    probabilities = [_clamp(float(value)) for value in frame_probabilities]
    ordered = sorted(probabilities, reverse=True)
    top_count = max(1, math.ceil(len(ordered) * _clamp(top_fraction, 0.05, 1.0)))
    visual_raw = _mean(ordered[:top_count])
    visual = calibrate_probability(visual_raw, temperature, logit_bias)

    temporal = temporal_anomaly(probabilities)
    # Temporal instability can increase suspicion, but a stable clip is never
    # pushed below its visual evidence.
    combined = _clamp(visual + temporal_weight * temporal * (1.0 - visual))

    confidence = _clamp(abs(combined - 0.5) * 2.0)
    return ScoreResult(
        fake_probability=round(combined, 6),
        fake_score=int(round(combined * 100)),
        verdict=verdict_for(combined),
        confidence=round(confidence, 6),
        visual_score=round(visual, 6),
        temporal_score=round(temporal, 6),
    )
