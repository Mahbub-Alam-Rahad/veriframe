# Training and evaluation (offline)

This directory contains **offline** utilities for preparing data, fine-tuning/evaluating a
frame-level detector and logging experiments. Nothing here runs inside the production web/API/ML
services, and the application never trains a model at request time.

> Treat all training and evaluation outputs as experimental until validated on a labelled dataset
> that matches your deployment's media distribution. Do not claim accuracy you have not measured.

## Contents

- `scripts/extract_frames.py` — sample frames from videos into an image dataset.
- `scripts/extract_faces.py` — run face detection/cropping over extracted frames.
- `scripts/train.py` — fine-tune an image-classification model (Hugging Face `transformers`).
- `scripts/evaluate.py` — compute metrics, calibration stats and a confusion matrix on a held-out
  set.
- `configs/default.yaml` — example configuration values.
- `requirements.txt` — optional dependencies for offline experimentation.

## Setup

Use Python 3.11 in an isolated environment (separate from `services/ml` if you prefer):

```bash
cd training
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

For GPU training install a CUDA-enabled PyTorch build appropriate for your driver. CPU training is
possible but slow.

## Dataset layout

Organize labelled frames or crops into class folders:

```text
training/data/
  train/
    real/    *.jpg
    fake/    *.jpg
  val/
    real/
    fake/
  test/
    real/
    fake/
```

Keep source videos and derived data out of git (see the repository `.gitignore`). Record dataset
provenance, licenses and consent/usage restrictions — especially for biometric/face data.

## 1. Extract frames

```bash
python scripts/extract_frames.py \
  --input /path/to/videos/real --output data/frames/real --fps 1 --max-frames 120
python scripts/extract_frames.py \
  --input /path/to/videos/fake --output data/frames/fake --fps 1 --max-frames 120
```

Frames are sampled with ffmpeg/OpenCV-style stepping to keep datasets manageable. Review a sample
for decode errors, duplicates and label correctness.

## 2. Crop faces (optional but recommended)

```bash
python scripts/extract_faces.py --input data/frames/real --output data/crops/real
python scripts/extract_faces.py --input data/frames/fake --output data/crops/fake
```

The production service detects and crops faces before scoring; training on similar crops usually
improves alignment with runtime behaviour. Centre crops are used as a fallback when no face is
detected.

## 3. Train / fine-tune

```bash
python scripts/train.py \
  --train-dir data/crops/train \
  --val-dir data/crops/val \
  --base-model dima806/deepfake_vs_real_image_detection \
  --output-dir ../models/veriframe-finetuned \
  --epochs 3 --batch-size 16 --lr 5e-5
```

`train.py` uses the Hugging Face image-classification trainer. Adjust label mapping, augmentation
and hyperparameters in `configs/default.yaml` or via CLI flags. Save the resulting checkpoint and
note the class/label order (it must match `FAKE_LABEL_INDEX` at inference time).

## 4. Evaluate

```bash
python scripts/evaluate.py \
  --model-dir ../models/veriframe-finetuned \
  --test-dir data/crops/test \
  --report ../models/veriframe-finetuned/eval.json
```

The evaluation script reports accuracy, precision/recall/F1, ROC-AUC (when both classes are
present), a confusion matrix and simple calibration bins. Evaluate across generators, codecs,
resolutions and benign edits — not on a single split — and compare against the currently deployed
model before promoting a change.

## 5. Register and deploy a model

1. Copy or publish the checkpoint to a location reachable by the ML service (a mounted volume under
   `HF_HOME`, or a Hugging Face model id).
2. Register a `ModelVersion` in the admin console with the correct `modelId`, backend, version,
   calibration temperature and evaluation notes.
3. Update `.env` (`MODEL_BACKEND=hf`, `MODEL_ID`, `FAKE_LABEL_INDEX`) and restart/rebuild `ml` and
   `worker`.
4. Verify `/api/v1/health` and run a smoke analysis in mock-is-off mode.

## MLflow (optional)

The Compose `mlflow` profile provides a local tracking server:

```bash
docker compose --env-file .env -f infra/docker-compose.yml --profile mlflow up -d mlflow
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000
```

Pass `--mlflow` to `train.py`/`evaluate.py` (where supported) to log parameters, metrics and
artifacts. MLflow is for offline work only and should not be exposed publicly.

## Responsible use

- Do not train on data you are not permitted to use. Document consent, licensing and retention.
- Balance classes and sources to avoid encoding demographic or generator-specific bias as a
  general "authenticity" signal.
- A better validation score does not guarantee robustness to novel synthesis methods. Re-evaluate
  regularly and communicate uncertainty to operators and end users.
- Keep checkpoints, datasets and evaluation reports access-controlled; they can be sensitive.
