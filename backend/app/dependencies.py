from __future__ import annotations

from .config import Settings, get_settings


def get_settings_dependency() -> Settings:
    """Return cached Settings instance for dependency injection."""
    return get_settings()
