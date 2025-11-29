from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

# Load environment variables from backend/.env if present so local dev is easy.
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)

APP_ENV = os.getenv("APP_ENV", "dev").lower()
DEFAULT_USE_FILE_STORAGE = APP_ENV != "prod"


def _env_str(name: str, default: str) -> str:
    return os.getenv(name, default)


def _env_int(name: str, default: str) -> int:
    return int(os.getenv(name, default))


def _env_bool(name: str, default: bool) -> bool:
    return _str_to_bool(os.getenv(name), default)


def _str_to_bool(raw_value: Optional[str], default: bool) -> bool:
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_origins(raw_value: Optional[str]) -> list[str]:
    if not raw_value:
        return ["*"]
    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    return origins or ["*"]


@dataclass(frozen=True)
class Settings:
    project_name: str = "Signup API"
    version: str = "1.0.0"
    environment: str = APP_ENV
    aws_region: str = field(default_factory=lambda: _env_str("AWS_REGION", "us-east-1"))
    db_host: str = field(default_factory=lambda: _env_str("DB_HOST", "127.0.0.1"))
    db_port: int = field(default_factory=lambda: _env_int("DB_PORT", "3306"))
    db_user: str = field(default_factory=lambda: _env_str("DB_USER", "expense_settlement_app"))
    db_password: str = field(default_factory=lambda: _env_str("DB_PASSWORD", "a)#~_@pC]Y2DZvbpBP+d"))
    db_name: str = field(default_factory=lambda: _env_str("DB_NAME", "expense_settlement"))
    db_pool_size: int = field(default_factory=lambda: _env_int("DB_POOL_SIZE", "5"))
    use_file_storage: bool = field(
        default_factory=lambda: _env_bool("USE_FILE_STORAGE", DEFAULT_USE_FILE_STORAGE)
    )
    data_file_path: str = field(
        default_factory=lambda: _env_str("DATA_FILE_PATH", str(BASE_DIR / "data" / "users.json"))
    )
    media_root: str = field(default_factory=lambda: _env_str("MEDIA_ROOT", str(BASE_DIR / "media")))
    groups_file_path: str = field(
        default_factory=lambda: _env_str("GROUPS_FILE_PATH", str(BASE_DIR / "data" / "groups.json"))
    )
    log_level: str = field(default_factory=lambda: _env_str("LOG_LEVEL", "INFO"))
    s3_bucket_name: Optional[str] = field(
        default_factory=lambda: os.getenv("MEDIA_S3_BUCKET")
    )
    s3_public_base_url: Optional[str] = field(
        default_factory=lambda: os.getenv("MEDIA_S3_BASE_URL")
    )
    cors_allow_origins: List[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:  # type: ignore[misc]
        object.__setattr__(
            self,
            "cors_allow_origins",
            _parse_origins(os.getenv("CORS_ALLOW_ORIGINS", "*")),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
