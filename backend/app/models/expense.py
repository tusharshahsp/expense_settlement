from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ExpenseModel:
    id: str
    group_id: str
    payer_id: str
    amount: float
    note: Optional[str]
    status: str
    created_at: datetime
