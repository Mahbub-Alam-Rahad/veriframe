# Model and inference

This document explains what VeriFrame's ML service does, what it does **not** do, and how to run,
evaluate and replace the model responsibly.

## Pipeline

1. **Download & probe.** The worker sends the internal S3 key to the ML service. The service
   downloads the object, probes duration/dimensions with `ffprobe`, and rejects clips that exceed
   the plan duration.
2. **Frame sampling.** Frames are sampled at a configurable rate (`SAMPLE_FPS`, default 1 fps) up
   to `MAX_FRAMES` (default 120). Sampling, not full decode, keeps CPU inference practical.
3. **Input selection.** Models declare whether they expect padded face crops or whole frames. The
   resolved `inputMode` is recorded in the response. For face-crop models, Haar cascade detection
   selects the largest face per sampled frame; a centre crop is used when no face is found and a
   warning is recorded.
4. **Classification.** Each input is scored by the selected backend to produce a per-frame fake
   probability in `[0, 1]`.
5. **Aggregation & calibration.** Backends declare their own top-frame window and optional logit
   offset. The default window is the mean of the top 30% of frames; the bundled GenD model uses the
   top 20% with a `+2.0` logit bias. A temperature parameter and the backend offset are applied in
   logit space, then a temporal instability signal is blended in. The result is mapped to
   `LIKELY_REAL` / `UNCERTAIN` / `LIKELY_FAKE` with a confidence value.
6. **Evidence.** The highest-scoring frames are annotated with a face box and score label, uploaded
   as thumbnails and returned as `flaggedFrames`. This is recorded evidence, **not** Grad-CAM or
   saliency attribution.

The raw per-frame scores, aggregation details, warnings, processing time and model metadata are
stored in `analysis.details` and surfaced in the UI and report.

## Backends

| Backend | `MODEL_BACKEND` | Behaviour | Use |
| --- | --- | --- | --- |
| Hugging Face image classifier | `hf` | Loads a transformers image-classification checkpoint and scores sampled frames | Alternative frame classifier |
| Local GenD CLIP loader | `hf` | `gend:` model IDs use a vendored GenD head with the standard transformers CLIP vision encoder | Default real inference |
| Hugging Face torchvision weights | `hf` | `tv-efficientnet:` model IDs load a raw EfficientNet-B0 state dict locally | Optional evaluation only |
| Auto | `auto` | Resolves to `hf`; may fall back to mock only if `ALLOW_MOCK_FALLBACK=true` | Development convenience |
| Mock | `mock` | Deterministic scores derived from image statistics | Pipeline/demo testing only |

**The mock backend is not a detector.** It exists to exercise the end-to-end system without model
weights. It is labelled in the ML response (`details.mock`, warnings), in the web UI and in the
PDF report. Never treat mock output as evidence, and set `ALLOW_MOCK_FALLBACK=false` in
production.

## Default model

The default checkpoint is the FaceForensics++-trained GenD model
`HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF`, selected through the local
`gend:` loader:

```dotenv
MODEL_ID=gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF
MODEL_INPUT_MODE=face-crop
MODEL_CALIBRATION_TEMPERATURE=0.5
```

The upstream repository ships custom remote code. To preserve the project's
`HF_TRUST_REMOTE_CODE=false` boundary, only the small GenD head is vendored in
`services/ml/app/backends/gend.py`; the backbone is the standard transformers CLIP vision encoder.
Weights are downloaded once into `HF_HOME` and inference stays in this service. The `gend:` prefix
accepts only the two reviewed CLIP checkpoints (patch-14 and patch-14-336). The DINOv3 release was
not adopted because its `facebook/dinov3-vitl16-pretrain-lvd1689m` backbone is gated.

GenD expects padded face crops, so `MODEL_INPUT_MODE=face-crop` is part of its calibration. Its
response records `details.inputMode`, `details.topFraction`, `details.logitBias` and the calibrated
score. Do not change the input mode without re-evaluating it.

### Local evaluation and calibration

The previous default, `dima806/deepfake_vs_real_image_detection`, was conservative on this
installation: with whole frames it scored the latest AI clip at 3/100 while TruthScan reported 81%.
It also scored all known-AI clips below the fake threshold. The CLIP-L/336 GenD variant looked strong
in an early evaluation, but under the deployed `ffmpeg fps=1` sampling one 0.56 real-clip frame drove
a top-5% aggregate to 67/`UNCERTAIN`. CLIP-L/14 with a wider top-20% window is stronger on the weak
`AQNp…` clip and less sensitive to a single frame:

| Clip | Ground truth | Mean frame score | Final score / verdict |
| --- | --- | --- | --- |
| `AQP6LVDTH90PIev7aK…` | real | 0.052 | 7 / `LIKELY_REAL` |
| `AQNpNJkP3MadjAZ537…` | AI | 0.222 | 76 / `LIKELY_FAKE` |
| `AQOJE0D8kg4EtGRcMg…` | AI | 0.432 | 99 / `LIKELY_FAKE` |
| `AQMk9wcbxwYFMkzfJx…` | AI | 0.240 | 81 / `LIKELY_FAKE` |

Scores above use the same frame midpoints that the production frame extractor samples. These are
**four clips, not a benchmark**. The `+2.0` logit offset and top-20% window were fitted on them to
make that separation explicit; they are not a general accuracy claim and will need re-fitting on a
larger labelled set. TruthScan's number is an external comparison, not a target the model is
guaranteed to reproduce. A low score is never proof of authenticity.

Important limitations still apply:

- GenD was trained on face manipulations; fully synthetic scenes, cartoons/CGI, voice and motion
  artifacts are outside its training domain.
- Results depend on face visibility, compression, resolution and the manipulation method.
- Per-frame scores, flagged frames and the temporal signal are evidence for review, not attribution
  or proof.

### Optional FF++ EfficientNet checkpoint

`Sujithg684/efficientnet` (a mirror of `Xicor9/efficientnet-b0-ffpp-c23`) is still supported but is
**not the default**. It is an EfficientNet-B0 trained on FaceForensics++ C23 and published as a raw
torchvision `.pth` state dict, so `tv-efficientnet:` model IDs load it with a dedicated local
loader:

```dotenv
MODEL_ID=tv-efficientnet:Sujithg684/efficientnet@efficientnet_b0_ffpp_c23.pth
```

The loader downloads weights once into `HF_HOME`, loads with `weights_only=True`, rebuilds
torchvision `efficientnet_b0` with a two-class head and applies the model card's `Resize(224) +
ToTensor` preprocessing. Re-encoding the weights into a transformers EfficientNet changes padding
and batch-norm behaviour and was measured to shift scores, so it is deliberately not done.

When checked against a known-original clip from this installation, **every sampled frame scored
0.996–1.000 fake**, including with full-frame input and temperature 2.0. That is model saturation,
not an aggregation or threshold problem; temperature scaling and top-frame selection cannot fix it.
Use this checkpoint only for its original FF++ domain after a local labelled evaluation. The upstream
card restricts it to research/educational use.

**Do not publish a single "accuracy" number.** Report performance on a labelled dataset that
matches your deployment's media distribution, with precision/recall/F1, calibration and failure
cases.

## Configuration

Key environment variables (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODEL_BACKEND` | `mock` | `hf`, `auto` or `mock` |
| `MODEL_ID` | `gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF` | Hugging Face model id, reviewed `gend:` checkpoint, local path or `tv-efficientnet:` state-dict spec |
| `MODEL_INPUT_MODE` | `face-crop` | `auto`, `full-frame` or `face-crop`; must match the model's evaluation |
| `MODEL_DEVICE` | `cpu` | `cpu` or a CUDA device if available in the image |
| `MODEL_CALIBRATION_TEMPERATURE` | `0.5` | Temperature scaling applied during aggregation |
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

1. Identify or train a compatible image/video-classification checkpoint and verify its label order,
   expected input shape (whole frame vs face crop), aggregation window and calibration. Plain
   transformers checkpoints use a model id; reviewed GenD CLIP checkpoints use
   `gend:<owner>/<repo>`; raw torchvision EfficientNet-B0 `.pth` weights use
   `tv-efficientnet:<owner>/<repo>@<filename>`.
2. Register it in the admin **Models** view (or via the database seed/registry) with the correct
   `backend`, `modelId`, `version`, `calibrationTemperature` and evaluation notes.
3. Set `MODEL_BACKEND=hf`, `MODEL_ID=<id-or-path>`, `MODEL_INPUT_MODE` and `FAKE_LABEL_INDEX`
   appropriately. If the model is not pre-baked into the image, ensure `HF_HOME` is on a persistent volume and the host
   can reach the Hugging Face Hub on first load (or pre-populate the cache and set
   `HF_HUB_OFFLINE=true`).
4. Rebuild/restart the ML service and worker: `docker compose ... up -d --build ml worker`.
5. Run a labelled evaluation on representative media before exposing the change to users. Keep the
   previous model version recorded for comparison.

On an existing installation, changing `.env` is not enough: the worker uses the active
**ModelVersion** row. Run `bash scripts/activate-model.sh` after the stack is up to register and
activate the `MODEL_ID` from `.env` (using `ADMIN_EMAIL`/`ADMIN_PASSWORD`, or use the Admin → Models
view).

CPU-only hosts should prefer smaller checkpoints and conservative `SAMPLE_FPS`/`MAX_FRAMES` values.
GPU inference requires a CUDA-capable PyTorch build in the ML image and `MODEL_DEVICE=cuda` (or a
specific device); this is not the default deployment path.

## Calibration and evaluation

- **Calibration.** Temperature scaling (`MODEL_CALIBRATION_TEMPERATURE`) adjusts confidence, not the
  underlying separability. Backend-declared `topFraction` and `logitBias` are part of the decision
  rule and are recorded in `details`. Fit all three on a held-out set that resembles production
  media; the bundled GenD values are based on only four local clips and must not be treated as
  general accuracy.
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
