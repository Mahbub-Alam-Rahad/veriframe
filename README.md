# VeriFrame

Self-hosted deepfake detection for video. Upload a clip, inspect frame-level manipulation
signals, review the frames that drove the result and export a PDF evidence report. Every
component — web app, API, analysis worker, ML service, database, queue and object storage —
runs on infrastructure you control.

> **Scores are probabilistic, not proof.** VeriFrame produces a statistical signal that must be
> calibrated, interpreted by a human and combined with other evidence. It does not certify that a
> video is authentic or manipulated. Read [MODEL.md](docs/MODEL.md) and
> [SECURITY.md](SECURITY.md) before using results in a decision.

---

## What is included

- **Web application** — marketing site, authentication, analysis workspace, video results with
  score gauge, frame timeline, evidence thumbnails, reports, API keys, billing/plan view,
  settings and a complete admin console.
- **NestJS API** — cookie-based JWT authentication with rotating refresh sessions, Argon2id
  passwords, email verification, password reset, RBAC, API keys, rate limits, audit logs,
  retention jobs and PDF reports.
- **Analysis worker** — a separate BullMQ consumer that calls the private ML service and owns
  all database writes. HTTP requests never block on inference.
- **FastAPI ML service** — frame sampling with ffmpeg, Haar face detection, face crops, a
  Hugging Face image-classifier backend, a deterministic mock backend, calibration, temporal
  aggregation and annotated evidence thumbnails.
- **PostgreSQL + Prisma** — users, sessions, API keys, videos, analyses, usage, contact
  messages, audit logs and a model registry.
- **Redis + BullMQ** — durable analysis queue with retries and stalled-job recovery.
- **MinIO / any S3-compatible store** — private media and evidence storage with short-lived
  signed URLs.
- **Caddy** — single public ingress with automatic HTTPS when deployed against a DNS name.
- **Optional profiles** — scheduled database/object-storage backups, Prometheus + Grafana
  monitoring, and an MLflow tracking server for offline experiments.

The default Compose configuration uses **`MODEL_BACKEND=mock`** so the stack is runnable without
downloading model weights. Mock scores are generated from image statistics, are clearly labelled
throughout the UI and API, and are **not real detection results**. Switch to `MODEL_BACKEND=hf`
for model-based inference.

## Architecture

```text
                        ┌──────────────────────────── Caddy :80/:443 ───────────────────────────┐
                        │                                                                        │
             /api/*     │                                                                        │
        ┌───────────────┴───────────────┐                                        ┌───────────────┴───────────────┐
        │        NestJS API :3001       │                                        │        Next.js web :3000       │
        │ auth · RBAC · videos · reports│                                        │ dashboard · admin · marketing  │
        └───────┬───────────────┬───────┘                                        └───────────────────────────────┘
                │               │
        ┌───────┴──────┐  ┌─────┴──────┐        ┌──────────────────────────────┐
        │ PostgreSQL   │  │   Redis    │        │  FastAPI ML service :8000    │
        │ Prisma       │  │  BullMQ    │        │  ffmpeg · faces · classifier │
        └───────┬──────┘  └─────┬──────┘        └──────────────┬───────────────┘
                │               │                              │
                │        ┌──────┴────────┐                     │
                │        │ Analysis      │  private HTTP call  │
                └────────┤ worker        ├─────────────────────┘
                         └──────┬────────┘
                                │
                         ┌──────┴────────┐
                         │ MinIO / S3    │
                         │ private media │
                         └───────────────┘
```

Request lifecycle: the browser uploads to the API → the API validates the file, stores it in S3
and enqueues a BullMQ job → the worker downloads the object and calls the ML service over the
private network → the ML service samples frames, detects/crops faces, scores them, creates
evidence thumbnails and returns the result → the worker persists the analysis → the web app polls
the API and renders the result. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

**Production / Compose**

- Linux host (Kali/Debian/Ubuntu), Docker Engine 24+ and Compose v2
- 8 GB RAM minimum, 12 GB recommended for the full stack with the HF backend
- 4 CPU cores minimum; CPU-only inference is supported and expected on modest hardware
- Disk: 10 GB plus media volume; the HF model cache grows to roughly 1 GB
- A DNS name and ports 80/443 for automatic HTTPS (local HTTP works without one)

**Local development**

- Node.js 20.11+ and pnpm 9 (`corepack enable`)
- Python 3.11 for the ML service
- PostgreSQL 16, Redis 7 and MinIO (or `make dev-infra`)
- `ffmpeg` and `ffprobe` on the host for local processing

## Quick start (Docker Compose)

```bash
git clone <your-fork> veriframe
cd veriframe

# Generates .env with strong secrets and prints the bootstrap admin password.
./scripts/setup.sh

# Review the important values before starting.
$EDITOR .env

# Build and start the stack.
make up
```

Open **http://localhost:3000**. Sign in with the `ADMIN_EMAIL` / generated `ADMIN_PASSWORD`
printed by the setup script. The admin console is at `/admin`. MinIO's console is available on
loopback at http://127.0.0.1:9001.

The first `make up` builds four images and can take several minutes. Services start in dependency
order: Postgres → MinIO bucket → migrations/seed → API → worker → ML → web → Caddy.

Useful commands:

```bash
make ps             # service status
make logs           # follow all logs
make down           # stop, keep volumes
make restart        # restart API + worker
make config         # validate the Compose file
make backup         # run the opt-in backup profile
make monitoring     # Prometheus + Grafana (loopback only)
make mlflow         # MLflow tracking server (loopback only)
```

### Before you rely on a score

The stack starts in mock mode. To run real inference:

```dotenv
MODEL_BACKEND=hf
MODEL_ID=gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF
MODEL_INPUT_MODE=face-crop
MODEL_CALIBRATION_TEMPERATURE=0.5
MODEL_DEVICE=cpu
ALLOW_MOCK_FALLBACK=false
```

The bundled GenD checkpoint expects padded face crops and ships with an explicit local logit-bias
calibration; both are part of its evaluation (see [MODEL.md](docs/MODEL.md)). Do not switch it to
`full-frame` without re-evaluating.

Then rebuild/restart the ML service and confirm the health endpoint reports the HF backend:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build ml worker
bash scripts/activate-model.sh   # register/activate MODEL_ID in the admin registry
curl -s http://localhost:3000/api/v1/health | jq
```

Changing `.env` is not enough on an existing install: the worker uses the active **ModelVersion**
row, so re-run `scripts/activate-model.sh` after changing `MODEL_ID` or the calibration temperature.

Model output still needs evaluation on representative data for your use case. See
[`docs/MODEL.md`](docs/MODEL.md) for calibration, model swapping and evaluation guidance.

## Local development

```bash
corepack enable
pnpm install
cp .env.example .env
./scripts/setup.sh                 # only if .env does not exist yet
pnpm --filter @deepfake/api prisma:generate
pnpm --filter @deepfake/api prisma:migrate
pnpm --filter @deepfake/api prisma:seed
```

Start the infrastructure dependencies with Docker:

```bash
make dev-infra
```

Run the ML service and applications in separate terminals:

```bash
cd services/ml
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
# For the HF backend, also install CPU torch/torchvision (see services/ml/Dockerfile).
uvicorn app.main:app --reload --port 8000

# Terminal 2 — API
pnpm --filter @deepfake/api dev

# Terminal 3 — analysis worker
pnpm --filter @deepfake/api dev:worker

# Terminal 4 — web
pnpm --filter @deepfake/web dev
```

The Next.js dev server proxies `/api/v1/*` to `API_INTERNAL_URL` (default
`http://localhost:3001`), so cookies stay same-origin. MinIO must be reachable by the browser at
`S3_PUBLIC_ENDPOINT` (default `http://localhost:9000`) for signed video and thumbnail URLs.

## Configuration

All runtime configuration lives in `.env`; `.env.example` documents every variable. The most
important groups:

| Group | Variables | Notes |
| --- | --- | --- |
| Database | `DATABASE_URL`, `POSTGRES_*` | Prisma/PostgreSQL connection |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECURE`, `TRUST_PROXY` | Secrets must be 32+ chars; placeholders are rejected in production |
| Storage | `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_BUCKET`, `S3_*KEY` | Public endpoint must be browser-reachable |
| ML | `ML_SERVICE_URL`, `ML_INTERNAL_TOKEN`, `MODEL_BACKEND`, `MODEL_ID` | Internal token is 24+ chars |
| Limits | `MAX_UPLOAD_BYTES`, `MAX_VIDEO_SECONDS`, `RETENTION_DAYS` | Plan limits are the effective minimum |
| Plans | `FREE_MONTHLY_ANALYSES`, `PRO_MONTHLY_ANALYSES`, `ENTERPRISE_MONTHLY_ANALYSES` | Admin-managed; no payment provider |
| Compose | `SITE_ADDRESS`, `PUBLIC_WEB_URL`, `WEB_ORIGIN`, `MINIO_BIND` | `SITE_ADDRESS=http://localhost:3000` for local HTTP |

Production requires `NODE_ENV=production` (set by Compose), strong non-placeholder secrets,
`COOKIE_SECURE=true` and HTTPS. `scripts/setup.sh` generates compliant values. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Tests

```bash
pnpm --filter @deepfake/api typecheck
pnpm --filter @deepfake/api test          # Jest unit tests
pnpm --filter @deepfake/web typecheck
pnpm --filter @deepfake/web lint
pnpm --filter @deepfake/web build

cd services/ml && python -m pytest       # 19 pipeline/API tests
```

Playwright tests live in `apps/web/e2e`:

```bash
pnpm --filter @deepfake/web build
pnpm --filter @deepfake/web exec playwright install --with-deps chromium

# Public-site and auth smoke tests (no backend required):
pnpm --filter @deepfake/web exec playwright test e2e/public.spec.ts e2e/auth.spec.ts

# Full upload → analysis → result flow (requires the complete stack and a verified account):
E2E_EMAIL=admin@example.com \
E2E_PASSWORD='...' \
E2E_EXPECT_MOCK=true \
pnpm --filter @deepfake/web exec playwright test e2e/analysis.spec.ts
```

CI (`.github/workflows/ci.yml`) runs API typecheck/build/tests, web typecheck/lint/build,
Playwright smoke tests, ML pytest and a Compose configuration check.

## Repository layout

```text
apps/
  api/                 NestJS API, BullMQ worker, Prisma schema and seed
  web/                 Next.js app router UI, Playwright tests
services/
  ml/                  FastAPI inference service and pytest suite
infra/
  docker-compose.yml   Full deployment topology
  caddy/               Reverse proxy and TLS configuration
  backup/              Database and object-storage backup loops
  monitoring/          Prometheus config and Grafana provisioning
training/              Offline dataset preparation, training and evaluation scripts
docs/                  Architecture, deployment, model, API and security notes
scripts/setup.sh       Generate .env with strong secrets
Makefile               Operational entry points
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — components, data flow, storage layout, failure modes
- [Deployment](docs/DEPLOYMENT.md) — TLS, DNS, backups/restore, monitoring, upgrades, troubleshooting
- [Model](docs/MODEL.md) — pipeline, mock vs real inference, calibration, evaluation, model swapping
- [API](docs/API.md) — browser and public endpoints with examples
- [Security](SECURITY.md) — threat model, controls, hardening checklist, vulnerability reporting
- [Training](training/README.md) — offline dataset preparation and model evaluation
- [Agent guide](AGENTS.md) — conventions for automated contributors

## Scope and limitations

VeriFrame is an analysis aid, not an authenticity oracle. In particular:

- The default pretrained checkpoint is a **frame-level image classifier**, not a purpose-trained
  video model. Temporal signals are aggregation heuristics, not a learned video representation.
- Performance varies with generator family, compression, resolution, lighting, occlusion, face
  size and the calibration data. Generic accuracy claims would be misleading.
- Audio is not analyzed by the default pipeline. `audioScore` exists in the data model but is not
  populated.
- Evidence thumbnails show sampled frames, face boxes and per-frame scores. There is **no fake
  Grad-CAM heatmap**; no explainability method is implied beyond what is displayed.
- Plans and quotas are enforced by the application, but this build does not collect payments.
  Upgrades are performed by an administrator.
- Legal pages are templates, not legal advice. Operators must adapt them to their jurisdiction.

## License

MIT — see [LICENSE](LICENSE). The bundled model checkpoint carries its own license; review it
before commercial use.
