# Architecture

This document describes the runtime components, request paths, data model and operational
boundaries of VeriFrame.

## Components

| Component | Runtime | Responsibility |
| --- | --- | --- |
| Caddy (`caddy`) | Reverse proxy | Public ingress, optional automatic TLS, security headers, `/api/*` routing |
| Web (`web`) | Next.js 15 / Node 20 | Marketing pages, auth UI, dashboard, admin console, server-side data fetches |
| API (`api`) | NestJS 10 / Node 20 | Authentication, RBAC, uploads, public API, reports, admin, health |
| Worker (`worker`) | NestJS 10 / Node 20 | BullMQ consumer; calls ML, persists analysis results, performs retries |
| ML (`ml`) | FastAPI / Python 3.11 | Frame extraction, face detection, scoring, aggregation, evidence thumbnails |
| Database (`postgres`) | PostgreSQL 16 | Durable application state and model registry |
| Queue (`redis`) | Redis 7 | BullMQ job queue and job state |
| Storage (`minio`) | S3-compatible object storage | Private video objects and evidence thumbnails |
| Migrate (`migrate`) | One-shot API image | `prisma migrate deploy` and bootstrap seed |

Optional profiles: `backup-db`/`backup-media` (`backup`), Prometheus/Grafana/exporters
(`monitoring`) and MLflow (`mlflow`).

## Network topology

```text
Internet
  │
  ▼
Caddy :80/:443/:3000
  ├── /api/*  ───────────────▶  api:3001 (NestJS)
  └── /*      ───────────────▶  web:3000 (Next.js)
                                     │
                                     └─(server-side rewrite, dev)─▶ api:3001

Internal Docker network
  api:3001 ──▶ postgres:5432
           ──▶ redis:6379
           ──▶ minio:9000
           ──▶ ml:8000  (not called by the API on the request path except health)

  worker ──▶ postgres:5432
         ──▶ redis:6379
         ──▶ minio:9000
         ──▶ ml:8000  (analysis requests, authenticated by ML_INTERNAL_TOKEN)

  ml:8000 ──▶ minio:9000  (download video, upload thumbnails)
```

The browser never talks to MinIO directly except through short-lived presigned GET URLs whose host
is `S3_PUBLIC_ENDPOINT`. All other components communicate on the internal Compose network.

## Request and analysis flow

### Browser analysis

1. **Upload.** The user submits a file to `POST /api/v1/videos` (multipart). The Next.js rewrite
   keeps the request same-origin in development; in Compose, Caddy proxies `/api/*` directly to the
   API.
2. **Validation.** The API enforces plan/size/duration limits, validates the container signature,
   probes duration/dimensions with `ffprobe`, stores the file under `videos/<userId>/<uuid>-<name>`
   in S3, creates a `Video` row (`UPLOADED`) and enqueues a BullMQ job. The API never decodes or
   scores media on the request path.
3. **Queue.** Redis persists the job. The worker consumes it with a configurable concurrency
   (`WORKER_CONCURRENCY`, default 2).
4. **Inference.** The worker marks the video `PROCESSING`, resolves the active model, and calls
   `POST /v1/analyze` on the ML service with an `x-internal-token` header and an internal S3 key.
   The ML service downloads the video, extracts sampled frames, detects/crops faces, runs the
   selected backend, aggregates scores, renders evidence thumbnails, uploads them to
   `thumbnails/<userId>/<videoId>/...` and returns the result payload.
5. **Persistence.** The worker writes the `Analysis` row and transitions the video to `DONE` (or
   `FAILED` with a user-visible error). It is the single writer for analysis state.
6. **Presentation.** The dashboard polls `GET /api/v1/videos/:id`, which returns the analysis plus
   presigned GET URLs for the video and thumbnails. The PDF report is generated on demand from the
   stored analysis.

### Public API

`/api/v1/public/v1/videos` mirrors upload/get/delete but authenticates with an `x-api-key` header,
enforces the PRO/ENTERPRISE plan and uses a dedicated 60 req/min bucket. Keys are stored as a
SHA-256 hash with a visible prefix for identification.

## Data model (high level)

- **User** — email, Argon2id password hash, role (`USER|ADMIN|SUPER_ADMIN`), plan, verification
  and ban timestamps.
- **Session** — hashed refresh token, device metadata, expiry and revocation (rotation with reuse
  detection).
- **VerificationToken** — hashed one-time tokens for email verification and password reset.
- **ApiKey** — name, prefix, hash, last-used and revocation timestamps.
- **Video** — owner, storage key, file metadata, status, expiry and job id.
- **Analysis** — scores, verdict, confidence, temporal score, frame-level details, flagged frames,
  model metadata and the raw `details` JSON returned by the ML service.
- **UsageRecord** — per-user monthly analysis and byte counters.
- **ModelVersion** — registered backends/checkpoints, calibration temperature, metrics and active
  flag.
- **ContactMessage / AuditLog** — operator inbox and security/audit trail.

Statuses: `UPLOADED → QUEUED → PROCESSING → DONE|FAILED`. Verdicts: `LIKELY_REAL`, `UNCERTAIN`,
`LIKELY_FAKE`.

## Storage layout

All objects are private. Keys are scoped by owner:

```text
videos/<userId>/<uuid>-<sanitized-name>.<ext>
thumbnails/<userId>/<videoId>/<frame>.jpg
```

The API signs download URLs at read time (short TTL) against `S3_PUBLIC_ENDPOINT`. Thumbnails are
best-effort: a failure to annotate or upload a frame does not fail the analysis.

## Security boundaries

- **Browser ↔ API:** HTTP-only, same-site cookies; JWT access/refresh with rotation. CORS is
  restricted to `WEB_ORIGIN`. CSRF relies on SameSite cookies and same-origin requests.
- **API/Worker ↔ ML:** private network plus `ML_INTERNAL_TOKEN`. The ML service is not exposed by
  Caddy.
- **Service ↔ MinIO:** internal endpoint for reads/writes, separate public endpoint for browser
  signatures. Bucket access is not anonymous.
- **Ownership:** every read/delete is scoped to the authenticated user unless the caller is an
  admin. Admin actions are audited.

## Failure modes and resilience

- **Queue retries:** BullMQ retries failed jobs with backoff. Repeated or terminal failures mark the
  video `FAILED` with a message the owner can see.
- **Worker is authoritative:** the API never marks a job `DONE` from the request path.
- **ML fallback:** when `MODEL_BACKEND=auto` and `ALLOW_MOCK_FALLBACK=true`, the service may fall
  back to the mock backend and include a warning. This is convenient for development but should be
  disabled in production.
- **Retention:** a daily maintenance cron removes expired media/thumbnails, stale sessions/tokens
  and abandoned job records. Plan retention is capped by `RETENTION_DAYS`.
- **Health:** `/api/v1/health` reports database/Redis/storage/ML checks and is used by Compose and
  monitoring probes. ML exposes `/health` for the internal network.

## Frontend structure

- `app/(marketing)` — public pages and legal templates.
- `app/(auth)` — login, registration, verification and password reset.
- `app/dashboard` — overview, analyze workspace, video library/detail, reports, API keys, billing
  and settings.
- `app/admin` — users, videos, messages, models, audit and system views.
- `middleware.ts` — protects dashboard/admin routes, refreshes access tokens, and enforces admin
  role for `/admin`.
- `lib/api.ts` — typed fetch helpers that talk to the same-origin `/api/v1` base in the browser and
  `API_INTERNAL_URL` on the server.

## Not in this build

- Real-time video streaming analysis or per-frame live inference.
- Audio/voice-clone detection in the default pipeline.
- Payment processing, invoices or automated plan upgrades.
- Multi-tenant organization isolation beyond per-user ownership and roles.
- A Prometheus metrics endpoint on the API (monitoring uses blackbox/exporter probes).
- Training at runtime. Training scripts are offline and live in `training/`.
