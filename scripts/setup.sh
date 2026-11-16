#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo ".env already exists - refusing to overwrite. Delete it first if you want a fresh setup."
  exit 0
fi

rand() { openssl rand -hex "${1:-32}"; }

POSTGRES_PASSWORD="$(rand 24)"
MINIO_PASSWORD="$(rand 24)"
ACCESS_SECRET="$(rand 48)"
REFRESH_SECRET="$(rand 48)"
INTERNAL_TOKEN="$(rand 48)"
ADMIN_PASSWORD="Admin-$(rand 12)!"
GRAFANA_PASSWORD="$(rand 16)"

cp "$ROOT/.env.example" "$ENV_FILE"

replace() {
  local key="$1" value="$2"
  python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = []
found = False
for line in open(path, encoding="utf-8"):
    if line.startswith(key + "="):
        lines.append(f"{key}={value}\n")
        found = True
    else:
        lines.append(line)
if not found:
    lines.append(f"{key}={value}\n")
open(path, "w", encoding="utf-8").writelines(lines)
PY
}

replace POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
replace DATABASE_URL "postgresql://deepfake:${POSTGRES_PASSWORD}@localhost:5432/deepfake?schema=public"
replace S3_SECRET_KEY "$MINIO_PASSWORD"
replace JWT_ACCESS_SECRET "$ACCESS_SECRET"
replace JWT_REFRESH_SECRET "$REFRESH_SECRET"
replace ML_INTERNAL_TOKEN "$INTERNAL_TOKEN"
replace ADMIN_PASSWORD "$ADMIN_PASSWORD"
replace GRAFANA_ADMIN_PASSWORD "$GRAFANA_PASSWORD"

chmod 600 "$ENV_FILE"

cat <<EOF

Created .env with generated secrets.

Bootstrap admin credentials:
  email:    $(grep '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
  password: $ADMIN_PASSWORD

Next steps:
  1. Review .env (especially MODEL_BACKEND, SITE_ADDRESS and PUBLIC_WEB_URL).
  2. Run: make up
  3. Open http://localhost:3000 and http://localhost:3000/admin

The default MODEL_BACKEND=mock keeps the demo deterministic without downloading
model weights. Set MODEL_BACKEND=hf (and optionally MODEL_ID) for real inference.
Read MODEL.md before presenting any score as evidence.
EOF
