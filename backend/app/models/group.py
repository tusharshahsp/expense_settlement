from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class GroupModel:
    id: str
    name: str
    owner_id: str
    description: Optional[str]
    created_at: datetime
