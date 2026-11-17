from __future__ import annotations

import math

import pytest

from app.core.scoring import (
    aggregate_scores,
    calibrate_probability,
    temporal_anomaly,
    verdict_for,
)


def test_low_scores_are_likely_real() -> None:
    result = aggregate_scores([0.05, 0.08, 0.1, 0.12, 0.2])
    assert result.verdict == "LIKELY_REAL"
    assert result.fake_score <= 30
    assert 0 <= result.confidence <= 1


def test_high_scores_are_likely_fake() -> None:
    result = aggregate_scores([0.8, 0.85, 0.9, 0.95, 0.99])
    assert result.verdict == "LIKELY_FAKE"
    assert result.fake_score >= 70


def test_top_fraction_drives_the_score() -> None:
    # The top 30% of ten frames is three frames, so a few suspicious frames
    # should dominate a mostly clean clip.
    result = aggregate_scores([0.05] * 7 + [0.9, 0.9, 0.9])
    assert result.visual_score > 0.75


def test_empty_input_is_rejected() -> None:
    with pytest.raises(ValueError):
        aggregate_scores([])


def test_temperature_pulls_probability_towards_half() -> None:
    confident = calibrate_probability(0.95, 1.0)
    softened = calibrate_probability(0.95, 3.0)
    assert confident > softened > 0.5
    assert math.isclose(calibrate_probability(0.5, 5.0), 0.5, abs_tol=1e-9)


def test_positive_logit_bias_raises_fake_probability() -> None:
    uncalibrated = calibrate_probability(0.42, 0.5)
    calibrated = calibrate_probability(0.42, 0.5, logit_bias=1.4)
    assert calibrated > uncalibrated
    assert aggregate_scores([0.42] * 4, temperature=0.5).fake_score < aggregate_scores(
        [0.42] * 4, temperature=0.5, logit_bias=1.4
    ).fake_score


def test_top_fraction_is_configurable() -> None:
    scores = [0.05] * 7 + [0.8, 0.9, 0.95]
    narrow = aggregate_scores(scores, top_fraction=0.05, temporal_weight=0.0)
    wide = aggregate_scores(scores, top_fraction=0.30, temporal_weight=0.0)
    assert narrow.visual_score > wide.visual_score


def test_temporal_anomaly_requires_enough_frames() -> None:
    assert temporal_anomaly([0.1, 0.9]) == 0.0
    assert temporal_anomaly([0.5, 0.5, 0.5, 0.5]) == 0.0
    assert temporal_anomaly([0.1, 0.9, 0.1, 0.9]) > 0.0


def test_temporal_instability_never_lowers_the_visual_score() -> None:
    stable = aggregate_scores([0.4] * 8)
    unstable = aggregate_scores([0.1, 0.7, 0.1, 0.7, 0.1, 0.7, 0.1, 0.7])
    assert unstable.fake_probability >= unstable.visual_score
    assert stable.fake_probability == pytest.approx(stable.visual_score, abs=1e-6)


@pytest.mark.parametrize(
    ("probability", "verdict"),
    [
        (0.0, "LIKELY_REAL"),
        (0.3, "LIKELY_REAL"),
        (0.31, "UNCERTAIN"),
        (0.69, "UNCERTAIN"),
        (0.7, "LIKELY_FAKE"),
        (1.0, "LIKELY_FAKE"),
    ],
)
def test_verdict_bands(probability: float, verdict: str) -> None:
    assert verdict_for(probability) == verdict
