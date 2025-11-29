from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, TypedDict

from ..config import get_settings


class UserRecord(TypedDict, total=False):
    id: str
    name: str
    email: str
    password_hash: str
    created_at: str
    role: str
    age: Optional[int]
    gender: Optional[str]
    address: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]


class ExpenseRecord(TypedDict, total=False):
    id: str
    group_id: str
    payer_id: str
    amount: float
    note: Optional[str]
    status: str
    created_at: str


class GroupRecord(TypedDict, total=False):
    id: str
    name: str
    owner_id: str
    description: Optional[str]
    created_at: str
    members: list[str]
    expenses: list[ExpenseRecord]


def _ensure_file(path: Path, default: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(default, encoding="utf-8")
    return path


def user_file_path() -> Path:
    settings = get_settings()
    return _ensure_file(Path(settings.data_file_path), "[]")


def group_file_path() -> Path:
    settings = get_settings()
    return _ensure_file(Path(settings.groups_file_path), "[]")


def load_users() -> list[UserRecord]:
    path = user_file_path()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_users(users: list[UserRecord]) -> None:
    path = user_file_path()
    path.write_text(json.dumps(users, indent=2), encoding="utf-8")


def load_groups() -> list[GroupRecord]:
    path = group_file_path()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_groups(groups: list[GroupRecord]) -> None:
    path = group_file_path()
    path.write_text(json.dumps(groups, indent=2), encoding="utf-8")

