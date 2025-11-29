from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserModel:
    id: str
    name: str
    email: str
    password_hash: str
    created_at: datetime
