# Deployment

This guide covers running VeriFrame with Docker Compose, enabling TLS, operating backups and
monitoring, and upgrading safely. Read [SECURITY.md](../SECURITY.md) and [MODEL.md](MODEL.md)
alongside it.

## Prerequisites

- Docker Engine 24+ with the Compose v2 plugin
- A host with ~12 GB RAM and ~10 GB free disk (plus media and model cache)
- Outbound access on first HF-model startup (unless the cache is pre-populated)
- For public HTTPS: a DNS A/AAAA record pointing to the host and inbound TCP 80/443

## 1. Configure the environment

```bash
./scripts/setup.sh
$EDITOR .env
```

`setup.sh` generates strong secrets, a bootstrap admin password and a Grafana password. Review at
minimum:

```dotenv
PUBLIC_WEB_URL=https://detect.example.com   # or http://localhost:3000 locally
WEB_ORIGIN=https://detect.example.com
SITE_ADDRESS=detect.example.com            # bare host enables automatic HTTPS in Caddy
COOKIE_SECURE=true
COOKIE_DOMAIN=detect.example.com           # optional, recommended in production
COMPOSE_EXPOSE_DEV_TOKENS=false
COMPOSE_SWAGGER_ENABLED=false
MODEL_BACKEND=mock                         # switch to hf for real inference
ALLOW_MOCK_FALLBACK=false                  # once hf is working
```

`S3_PUBLIC_ENDPOINT` must be reachable by end users' browsers so signed video/thumbnail URLs work.
The default Compose binds MinIO to `127.0.0.1:9000`; for a public deployment either expose MinIO
through its own HTTPS name/proxy or serve it behind Caddy on a dedicated host/path and set
`S3_PUBLIC_ENDPOINT` accordingly. Keep the bucket private.

## 2. Start the stack

```bash
make config   # validate interpolation and compose syntax
make up
```

Startup order is enforced with health checks: Postgres/Redis/MinIO → bucket init → migrations and
seed → API/worker/ML → web → Caddy. Check status and logs:

```bash
make ps
make logs
curl -s http://localhost:3000/api/v1/health
```

The seed creates a super-admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) and registers the active
model. Sign in at the public URL and change the bootstrap password immediately.

## 3. TLS and reverse proxy

Caddy is the only public entry point. `infra/caddy/Caddyfile` routes `/api/*` to the API and all
other traffic to the web app, and applies baseline security headers.

- **Local HTTP:** `SITE_ADDRESS=:3000` serves plain HTTP on all container interfaces on port 3000
  (mapped by Compose), so both `localhost` and private-LAN Host headers are accepted.
- **Private LAN clients:** set `PUBLIC_WEB_URL`/`NEXT_PUBLIC_APP_URL` to `http://<host-lan-ip>:3000`,
  add that origin to `WEB_ORIGIN`, set `S3_PUBLIC_ENDPOINT=http://<host-lan-ip>:9000`, and set
  `MINIO_BIND=0.0.0.0`. Rebuild the web image because `NEXT_PUBLIC_*` values are baked into the
  bundle. This exposes MinIO to the LAN; keep credentials strong and the bucket private.
- **Automatic HTTPS:** set `SITE_ADDRESS` to a DNS name (no scheme), provide `ACME_EMAIL`, and
  ensure 80/443 are reachable. Caddy will obtain and renew certificates via ACME. Set
  `COOKIE_SECURE=true` and align `PUBLIC_WEB_URL`/`WEB_ORIGIN`.
- **Behind another proxy:** terminate TLS upstream, forward `X-Forwarded-*` headers, keep
  `TRUST_PROXY` accurate, and set `SITE_ADDRESS`/origins to match the public URL.

The web image bakes `NEXT_PUBLIC_APP_URL` at build time. **Changing the public URL requires
rebuilding the web image** (`docker compose ... up -d --build web caddy`).

## 4. Object storage and signed URLs

- `S3_ENDPOINT` is the internal address (`http://minio:9000` in Compose).
- `S3_PUBLIC_ENDPOINT` is embedded in presigned URLs and must resolve from the browser. A mismatch
  is the most common cause of videos/thumbnails failing to load in the UI.
- `S3_ACCESS_KEY`/`S3_SECRET_KEY` are also the MinIO root credentials in the bundled stack. Change
  them from the generated defaults only by rotating consistently across services and MinIO data.
- Bucket objects are private; the API signs GET URLs with a short TTL.

## 5. Backups and restore

Enable the optional backup loops:

```bash
make backup
# or: docker compose --env-file .env -f infra/docker-compose.yml --profile backup up -d
```

Backups are written under `./backups` (host-mounted): compressed Postgres dumps (`backup-db`) and a
mirror of the media bucket (`backup-media`). Retention/interval are controlled by
`BACKUP_RETENTION_DAYS` and `BACKUP_INTERVAL_SECONDS`.

**Restore database (example):**

```bash
# stop writers
docker compose --env-file .env -f infra/docker-compose.yml stop api worker
# restore into a running postgres container
gunzip -c backups/db/<dump>.sql.gz | docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose --env-file .env -f infra/docker-compose.yml start api worker
```

**Restore media:** copy/mirror the saved bucket contents back into MinIO (for example with `mc
mirror` against the running MinIO endpoint). Always test restores on a non-production copy and
store backups off-host with appropriate access controls — they contain user media and metadata.

## 6. Monitoring and MLflow

```bash
make monitoring  # Prometheus :9090, Grafana :3002 on loopback
make mlflow      # MLflow :5000 on loopback
```

The monitoring profile provisions Prometheus, postgres/redis exporters and blackbox probes of the
API, web and ML health endpoints, plus a prebuilt Grafana dashboard. Grafana credentials come from
`GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD`. Ports bind to `127.0.0.1` by default; expose them
only through a secured channel.

MLflow is for **offline** experiment tracking during model work in `training/`. It is not part of
the request path.

## 7. Real inference and model cache

```dotenv
MODEL_BACKEND=hf
MODEL_ID=gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF
MODEL_INPUT_MODE=face-crop
MODEL_CALIBRATION_TEMPERATURE=0.5
MODEL_DEVICE=cpu
ALLOW_MOCK_FALLBACK=false
```

The model cache is stored in the `ml-models` Docker volume mounted at `HF_HOME`. The first run may
download weights; ensure outbound HTTPS access or pre-populate the cache. Confirm the active
backend via `/api/v1/health` and the admin Models view. Evaluate on representative data before
relying on results (see [MODEL.md](MODEL.md)).

## 8. Upgrades

```bash
git pull
make config
docker compose --env-file .env -f infra/docker-compose.yml pull   # if using remote images
make up
```

Migrations run automatically via the `migrate` one-shot service on startup. Review release notes
for breaking env/schema changes, take a backup before upgrading, and rebuild images after changes
to `NEXT_PUBLIC_*` build args or Python/Node dependencies. Pin image tags in production rather
than tracking floating tags.

## 9. Operations checklist

- [ ] Strong, unique secrets; bootstrap admin password rotated.
- [ ] HTTPS, `COOKIE_SECURE=true`, correct public origins, Swagger/dev-tokens disabled.
- [ ] `MODEL_BACKEND=hf`, `ALLOW_MOCK_FALLBACK=false`, mock banner absent.
- [ ] Database/Redis/ML/MinIO not publicly exposed; MinIO console restricted.
- [ ] `S3_PUBLIC_ENDPOINT` reachable by browsers; signed URLs load in the UI.
- [ ] Backups enabled, off-host, and restore tested.
- [ ] Retention matches policy; disk usage monitored.
- [ ] Audit logs reviewed; admin access limited.
- [ ] Legal templates adapted by the operator.

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Videos/thumbnails fail to load | `S3_PUBLIC_ENDPOINT` not browser-reachable or wrong host/scheme | Signed URL host in the browser network tab; MinIO bind/Caddy route |
| Upload accepted but stuck in QUEUED | Worker not running or cannot reach Redis/ML | `make logs` for `worker`/`ml`, queue health in `/api/v1/health` |
| Analysis fails immediately | ML internal token mismatch, missing ffmpeg, or model load failure | `ml` logs; `ML_INTERNAL_TOKEN` matches; `ALLOW_MOCK_FALLBACK` |
| Login/session issues behind proxy | `TRUST_PROXY`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, or origin mismatch | Forwarded headers, HTTPS, `WEB_ORIGIN` |
| Web shows stale public URL | `NEXT_PUBLIC_APP_URL` baked at build time | Rebuild `web` image |
| Compose refuses to start | Missing/placeholder required env values | `make config`, `.env` values, required `:?` variables |

For API errors, the response includes a `requestId`; correlate it with API/worker logs.
