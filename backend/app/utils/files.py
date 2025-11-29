from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from ..config import Settings


def save_avatar_file(user_id: str, upload_file: UploadFile, settings: Settings) -> str:
    if settings.use_file_storage or not settings.s3_bucket_name:
        return _save_to_filesystem(user_id, upload_file, settings.media_root)
    return _save_to_s3(user_id, upload_file, settings)


def _save_to_filesystem(user_id: str, upload_file: UploadFile, media_root: str) -> str:
    media_path = Path(media_root)
    media_path.mkdir(parents=True, exist_ok=True)
    user_folder = media_path / user_id
    user_folder.mkdir(parents=True, exist_ok=True)

    original_suffix = Path(upload_file.filename or "avatar").suffix or ".bin"
    filename = f"avatar{original_suffix}"
    destination = user_folder / filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    upload_file.file.seek(0)
    return f"/media/{user_id}/{filename}"


def _save_to_s3(user_id: str, upload_file: UploadFile, settings: Settings) -> str:
    original_suffix = Path(upload_file.filename or "avatar").suffix or ".bin"
    filename = f"{uuid4().hex}{original_suffix}"
    key = f"avatars/{user_id}/{filename}"
    client = boto3.client("s3", region_name=settings.aws_region)
    upload_file.file.seek(0)
    try:
        client.upload_fileobj(
            upload_file.file,
            settings.s3_bucket_name,
            key,
            ExtraArgs={"ContentType": upload_file.content_type or "application/octet-stream"},
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError("Unable to upload avatar to S3") from exc
    finally:
        upload_file.file.seek(0)

    base_url = settings.s3_public_base_url or _default_bucket_url(settings.s3_bucket_name, settings.aws_region)
    return f"{base_url}/{key}"


def _default_bucket_url(bucket: str, region: str) -> str:
    if region == "us-east-1":
        return f"https://{bucket}.s3.amazonaws.com"
    return f"https://{bucket}.s3.{region}.amazonaws.com"
