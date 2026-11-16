from __future__ import annotations

import logging
from pathlib import Path

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from .config import Settings

logger = logging.getLogger(__name__)


class ObjectStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=BotoConfig(
                signature_version="s3v4",
                s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
                connect_timeout=3,
                read_timeout=30,
                retries={"max_attempts": 2},
            ),
        )

    def download(self, key: str, destination: Path, bucket: str | None = None) -> None:
        try:
            self.client.download_file(bucket or self.settings.s3_bucket, key, str(destination))
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"Could not download video from object storage: {exc}") from exc

    def upload(self, source: Path, key: str, content_type: str = "image/jpeg") -> None:
        try:
            self.client.upload_file(
                str(source),
                self.settings.s3_bucket,
                key,
                ExtraArgs={"ContentType": content_type, "CacheControl": "private, max-age=3600"},
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"Could not upload evidence frame: {exc}") from exc

    def health(self) -> bool:
        try:
            self.client.head_bucket(Bucket=self.settings.s3_bucket)
            return True
        except Exception:
            return False
