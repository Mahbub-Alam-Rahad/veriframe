# Model and inference

This document explains what VeriFrame's ML service does, what it does **not** do, and how to run,
evaluate and replace the model responsibly.

## Pipeline

1. **Download & probe.** The worker sends the internal S3 key to the ML service. The service
   downloads the object, probes duration/dimensions with `ffprobe`, and rejects clips that exceed
   the plan duration.
2. **Frame sampling.** Frames are sampled at a configurable rate (`SAMPLE_FPS`, default 1 fps) up
   to `MAX_FRAMES` (default 120). Sampling, not full decode, keeps CPU inference practical.
3. **Face detection & crops.** Haar cascade detection selects the largest face per sampled frame
   and produces a padded crop. When no face is found, a centre crop is used and a warning is
   recorded.
4. **Classification.** Each crop is scored by the selected backend to produce a per-frame fake
   probability in `[0, 1]`.
5. **Aggregation & calibration.** Scores are calibrated with a temperature parameter, the visual
   score is derived from the mean of the top 30% frame scores, and a temporal instability signal is
   blended in. The result is mapped to `LIKELY_REAL` / `UNCERTAIN` / `LIKELY_FAKE` with a
   confidence value.
6. **Evidence.** The highest-scoring frames are annotated with a face box and score label, uploaded
   as thumbnails and returned as `flaggedFrames`. This is recorded evidence, **not** Grad-CAM or
   saliency attribution.

The raw per-frame scores, aggregation details, warnings, processing time and model metadata are
stored in `analysis.details` and surfaced in the UI and report.

## Backends

| Backend | `MODEL_BACKEND` | Behaviour | Use |
| --- | --- | --- | --- |
| Hugging Face image classifier | `hf` | Loads a transformers image-classification checkpoint and scores crops | Real inference |
| Auto | `auto` | Resolves to `hf`; may fall back to mock only if `ALLOW_MOCK_FALLBACK=true` | Development convenience |
| Mock | `mock` | Deterministic scores derived from image statistics | Pipeline/demo testing only |

**The mock backend is not a detector.** It exists to exercise the end-to-end system without model
weights. It is labelled in the ML response (`details.mock`, warnings), in the web UI and in the
PDF report. Never treat mock output as evidence, and set `ALLOW_MOCK_FALLBACK=false` in
production.

## Default model

The default checkpoint is `dima806/deepfake_vs_real_image_detection`, a frame-level image
classifier. Important implications:

- It classifies **images/crops**, not temporal video dynamics or audio.
- Performance is highly dependent on face visibility, crop quality, compression, resolution and the
  manipulation method. Results on unseen generators may be poor.
- The `FAKE_LABEL_INDEX` must match the model's label ordering; the default is configured for this
  checkpoint and recorded in the response.
- The model license is separate from this repository. Review it before redistribution or
  commercial use.

**Do not publish a single "accuracy" number.** Report performance on a labelled dataset that
matches your deployment's media distribution, with precision/recall/F1, calibration and failure
cases.

## Configuration

Key environment variables (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODEL_BACKEND` | `mock` | `hf`, `auto` or `mock` |
| `MODEL_ID` | `dima806/deepfake_vs_real_image_detection` | Hugging Face model id or local path |
| `MODEL_DEVICE` | `cpu` | `cpu` or a CUDA device if available in the image |
| `MODEL_CALIBRATION_TEMPERATURE` | `1.0` | Temperature scaling applied during aggregation |
| `FAKE_LABEL_INDEX` | `1` | Index of the "fake" class in model logits |
| `SAMPLE_FPS` | `1.0` | Frames sampled per second |
| `MAX_FRAMES` | `120` | Upper bound per analysis |
| `MAX_VIDEO_SECONDS` | `600` | Hard duration ceiling |
| `MAX_CONCURRENT_ANALYSES` | `1` | Serialized by default for modest CPUs |
| `ALLOW_MOCK_FALLBACK` | `true` | Allow fallback when HF load fails (`auto`) |
| `HF_HOME` | `/models/hf-cache` | Model cache (persisted as a Docker volume) |
| `HF_HUB_OFFLINE` | `false` | Use cached weights only |

The API/worker and ML service share logical defaults; the **ModelVersion** registry in the database
can record the active model, backend and calibration temperature used for an analysis.

## Swapping models

1. Identify or train a compatible image/video-classification checkpoint and verify its label order.
2. Register it in the admin **Models** view (or via the database seed/registry) with the correct
   `backend`, `modelId`, `version`, `calibrationTemperature` and evaluation notes.
3. Set `MODEL_BACKEND=hf`, `MODEL_ID=<id-or-path>` and `FAKE_LABEL_INDEX` appropriately. If the
   model is not pre-baked into the image, ensure `HF_HOME` is on a persistent volume and the host
   can reach the Hugging Face Hub on first load (or pre-populate the cache and set
   `HF_HUB_OFFLINE=true`).
4. Rebuild/restart the ML service and worker: `docker compose ... up -d --build ml worker`.
5. Run a labelled evaluation on representative media before exposing the change to users. Keep the
   previous model version recorded for comparison.

CPU-only hosts should prefer smaller checkpoints and conservative `SAMPLE_FPS`/`MAX_FRAMES` values.
GPU inference requires a CUDA-capable PyTorch build in the ML image and `MODEL_DEVICE=cuda` (or a
specific device); this is not the default deployment path.

## Calibration and evaluation

- **Calibration.** Temperature scaling (`MODEL_CALIBRATION_TEMPERATURE`) adjusts confidence, not the
  underlying separability. Fit it on a held-out set that resembles production media.
- **Thresholds.** The verdict bands are a product decision. Revisit them against false-positive and
  false-negative costs in your domain (journalism, trust & safety, legal intake, etc.).
- **Datasets.** Evaluate across generators, codecs, resolutions, face sizes and benign edits
  (recompression, overlays, stabilization). Do not rely on a single benchmark.
- **Drift.** New synthesis methods and post-processing pipelines change the signal. Re-evaluate on
  a schedule and after major model or preprocessing changes.

The `training/` directory contains offline scripts and notes for dataset preparation and
evaluation. Training is never performed by the running application.

## Explainability and limitations

- **What you get:** per-frame scores, a temporal/consistency signal, ranked flagged frames with
  face boxes, and the processing/warning metadata needed to audit a run.
- **What you do not get:** Grad-CAM/heatmaps, audio analysis, provenance/watermark verification, or
  a guarantee that the absence of a signal means authenticity.
- **Common failure modes:** heavy compression, low light, occlusion, non-frontal faces, cartoons/
  CGI, screen recordings, very short clips, and manipulations outside the face crop.

Present results as one input to a broader verification workflow. See [SECURITY.md](../SECURITY.md).
