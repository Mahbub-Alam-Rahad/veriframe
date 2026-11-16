#!/bin/sh
# Dump the PostgreSQL database on a fixed interval and prune old dumps.
# Invoked by the optional `backup-db` Compose service.
set -eu

: "${PGHOST:=postgres}"
: "${PGUSER:=deepfake}"
: "${PGDATABASE:=deepfake}"
: "${BACKUP_RETENTION_DAYS:=14}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"

mkdir -p /backups/postgres

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  target="/backups/postgres/veriframe-${timestamp}.sql.gz"
  echo "[backup-db] writing ${target}"

  if pg_dump \
    --host="${PGHOST}" \
    --username="${PGUSER}" \
    --dbname="${PGDATABASE}" \
    --no-owner \
    --no-privileges \
    --format=plain | gzip -9 > "${target}.tmp"; then
    mv "${target}.tmp" "${target}"
    echo "[backup-db] complete: $(du -h "${target}" | cut -f1)"
  else
    rm -f "${target}.tmp"
    echo "[backup-db] dump failed" >&2
  fi

  # Remove dumps older than the retention window.
  find /backups/postgres -type f -name 'veriframe-*.sql.gz' \
    -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete || true

  sleep "${BACKUP_INTERVAL_SECONDS}"
done
