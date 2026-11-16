#!/bin/sh
# Mirror the object bucket into /backups. Files deleted from the live bucket are
# intentionally kept here until the retention window expires.
set -eu

: "${S3_BUCKET:=deepfake}"
: "${BACKUP_RETENTION_DAYS:=14}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"

mkdir -p "/backups/minio/${S3_BUCKET}"

until mc alias set source "http://minio:9000" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  echo "[backup-media] waiting for MinIO"
  sleep 2
done

while true; do
  echo "[backup-media] mirroring bucket ${S3_BUCKET}"
  if mc mirror --overwrite "source/${S3_BUCKET}" "/backups/minio/${S3_BUCKET}"; then
    echo "[backup-media] complete"
  else
    echo "[backup-media] mirror failed" >&2
  fi

  find "/backups/minio/${S3_BUCKET}" -type f \
    -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete || true

  sleep "${BACKUP_INTERVAL_SECONDS}"
done
