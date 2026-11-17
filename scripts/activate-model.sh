#!/usr/bin/env bash
# Register MODEL_ID from .env as the active model version in the admin registry.
# The worker reads the active ModelVersion row, not .env, so changing MODEL_ID
# alone does not switch models on an existing installation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

read_env() {
  python3 - "$ENV_FILE" "$1" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
for line in open(path, encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    name, value = line.split("=", 1)
    if name.strip() == key:
        print(value.strip().strip('"').strip("'"))
        break
PY
}

BASE_URL="$(read_env PUBLIC_WEB_URL)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
ADMIN_EMAIL="$(read_env ADMIN_EMAIL)"
ADMIN_PASSWORD="$(read_env ADMIN_PASSWORD)"
MODEL_ID="$(read_env MODEL_ID)"
TEMPERATURE="$(read_env MODEL_CALIBRATION_TEMPERATURE)"
TEMPERATURE="${TEMPERATURE:-0.5}"

if [[ -z "$MODEL_ID" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "MODEL_ID, ADMIN_EMAIL and ADMIN_PASSWORD must be set in $ENV_FILE" >&2
  exit 1
fi

LOGIN_PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.argv[2]}))' "$ADMIN_EMAIL" "$ADMIN_PASSWORD")"
MODEL_PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"name":"Configured local detector","version":"env","backend":"HF","modelId":sys.argv[1],"calibrationTemperature":float(sys.argv[2]),"activate":True,"notes":"Registered from .env. Input mode and aggregation calibration come from the ML backend. Probabilistic, not proof."}))' "$MODEL_ID" "$TEMPERATURE")"

COOKIES="$(mktemp)"
RESPONSE="$(mktemp)"
trap 'rm -f "$COOKIES" "$RESPONSE"' EXIT

STATUS="$(curl -sS -o "$RESPONSE" -w '%{http_code}' -c "$COOKIES" \
  -X POST "$BASE_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' --data-binary "$LOGIN_PAYLOAD")"
if [[ "$STATUS" != "200" ]]; then
  echo "Admin login failed (HTTP $STATUS): $(cat "$RESPONSE")" >&2
  exit 1
fi

STATUS="$(curl -sS -o "$RESPONSE" -w '%{http_code}' -b "$COOKIES" \
  -X POST "$BASE_URL/api/v1/admin/models" \
  -H 'Content-Type: application/json' --data-binary "$MODEL_PAYLOAD")"

if [[ "$STATUS" == "409" ]]; then
  # Already registered: find the matching version and activate it instead.
  STATUS="$(curl -sS -o "$RESPONSE" -w '%{http_code}' -b "$COOKIES" \
    "$BASE_URL/api/v1/admin/models")"
  if [[ "$STATUS" != "200" ]]; then
    echo "Could not list models (HTTP $STATUS): $(cat "$RESPONSE")" >&2
    exit 1
  fi
  EXISTING_ID="$(python3 - "$RESPONSE" "$MODEL_ID" <<'PY'
import json, sys
models = json.load(open(sys.argv[1], encoding="utf-8"))
items = models.get("items", models) if isinstance(models, dict) else models
for item in items:
    if item.get("modelId") == sys.argv[2]:
        print(item.get("id", ""))
        break
PY
)"
  if [[ -z "$EXISTING_ID" ]]; then
    echo "Model is registered but could not be found in the admin list: $MODEL_ID" >&2
    exit 1
  fi
  STATUS="$(curl -sS -o "$RESPONSE" -w '%{http_code}' -b "$COOKIES" \
    -X POST "$BASE_URL/api/v1/admin/models/$EXISTING_ID/activate")"
  if [[ "$STATUS" != "200" && "$STATUS" != "201" ]]; then
    echo "Model activation failed (HTTP $STATUS): $(cat "$RESPONSE")" >&2
    exit 1
  fi
  echo "Activated existing model: $MODEL_ID"
  cat "$RESPONSE"
  echo
  exit 0
fi

if [[ "$STATUS" != "201" && "$STATUS" != "200" ]]; then
  echo "Model registration failed (HTTP $STATUS): $(cat "$RESPONSE")" >&2
  exit 1
fi

echo "Activated model: $MODEL_ID"
cat "$RESPONSE"
echo
