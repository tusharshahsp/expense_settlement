from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, PositiveFloat

ExpenseStatus = Literal["assigned", "paid", "refunded", "approved", "claimed", "denied"]


class Expense(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: str
    payer_email: EmailStr
    amount: float
    note: Optional[str] = None
    status: ExpenseStatus = "assigned"
    created_at: datetime


class ExpenseCreate(BaseModel):
    payer_email: EmailStr
    amount: PositiveFloat
    note: Optional[str] = Field(default=None, max_length=255)
    status: ExpenseStatus = "assigned"


class ExpenseUpdate(BaseModel):
    payer_email: Optional[EmailStr] = None
    amount: Optional[PositiveFloat] = None
    note: Optional[str] = Field(default=None, max_length=255)
    status: Optional[ExpenseStatus] = None
