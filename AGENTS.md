# VeriFrame for coding agents

Guidance for automated contributors working in this repository. Keep changes narrow, verifiable and
consistent with the existing architecture.

## Project shape

- **Monorepo (pnpm workspaces):** `apps/web` (Next.js), `apps/api` (NestJS + Prisma + BullMQ
  worker), `services/ml` (FastAPI). Infra in `infra/`, docs in `docs/`, offline ML work in
  `training/`.
- **Package manager:** `pnpm@9.15.4` via Corepack. Prefer `corepack pnpm ...` in environments where
  `pnpm` is not on PATH.
- **Node:** 20.11+. **Python:** 3.11 for the ML service.

## Core invariants — do not break these

1. **No hosted inference.** User media is processed only by the self-hosted ML service. Do not add
   third-party inference calls or upload media outside the configured S3/MinIO bucket.
2. **Probabilistic, never proof.** Do not introduce copy, UI states or API semantics that present a
   score as definitive. Keep warnings/disclaimers accurate. Never emit silent mock scores as real
   results.
3. **Worker owns analysis writes.** The API enqueues work; the BullMQ worker calls the ML service
   and persists `Analysis`/status transitions. Do not move scoring onto the HTTP request path.
4. **Security boundaries.** Keep ML and storage internal. Preserve ownership checks, RBAC, rate
   limits, audit logging, hashed secrets/tokens and input validation. Do not weaken cookie/CORS/
   auth defaults.
5. **Honest explainability.** Evidence is sampled frames, face boxes and per-frame scores. Do not
   fabricate Grad-CAM/heatmaps or other attribution methods that are not actually computed.

## Conventions

- **API responses** are camelCase, prefixed `/api/v1`, and use the standard error shape
  `{ statusCode, error, message, requestId, timestamp, path }`. Keep `apps/web/lib/types.ts` and
  `apps/api/src/common/utils/serializers.ts` in sync when changing payloads.
- **Plans/limits** live in `apps/api/src/config/plans.ts` and are mirrored for the web in
  `apps/web/lib/plans.ts` — update both together.
- **Config/env** is validated in `apps/api/src/config/configuration.ts` and documented in
  `.env.example`. Add new variables in all relevant places (validation, example, Compose, docs) and
  never commit real secrets or a populated `.env`.
- **Database changes** go through Prisma (`apps/api/prisma/schema.prisma` + migrations). Do not
  hand-edit generated migration SQL unless necessary and understood.
- **ML changes** must keep the mock backend clearly labelled and functional for tests/demos, and
  must preserve the `details.mock`, warnings and disclaimer contract consumed by the UI/report.
- **Frontend** uses the App Router, Tailwind and existing UI primitives. Reuse components in
  `apps/web/components/` and keep pages accessible, responsive and consistent with the current
  visual language.
- **Compose** is the source of deployment truth (`infra/docker-compose.yml`). Validate with
  `docker compose --env-file .env -f infra/docker-compose.yml config --quiet` after edits.

## Verification

Run the smallest relevant checks, then broader ones before finishing substantial work:

```bash
# API
corepack pnpm --filter @deepfake/api typecheck
corepack pnpm --filter @deepfake/api build
corepack pnpm --filter @deepfake/api test

# Web
corepack pnpm --filter @deepfake/web typecheck
corepack pnpm --filter @deepfake/web lint
corepack pnpm --filter @deepfake/web build

# ML
cd services/ml && python -m pytest

# Playwright smoke (requires a prior web build)
corepack pnpm --filter @deepfake/web exec playwright test e2e/public.spec.ts e2e/auth.spec.ts
```

`ffmpeg`/`ffprobe`, Docker and the full stack may be unavailable in some environments; note any
checks you cannot run and why. Do not claim end-to-end verification you did not perform.

## Common pitfalls

- Changing `NEXT_PUBLIC_*` or the public URL requires rebuilding the web image/bundle.
- `S3_PUBLIC_ENDPOINT` must be browser-reachable; it is not the same concern as the internal
  `S3_ENDPOINT`.
- The ML image installs PyTorch from the CPU index in the Dockerfile — do not add `torch` to
  `services/ml/requirements.txt`.
- Compose maps the MinIO image to the pinned `pgsty/minio` community build (upstream stopped
  publishing images). Keep tags intentional and reproducible.
- Tests for `sanitizeFilename` and similar helpers reflect security behaviour; update tests and
  implementation together when tightening validation.
- Avoid committing generated artifacts, local caches, `.env`, backups, model weights or `data/`
  contents (see `.gitignore`).
