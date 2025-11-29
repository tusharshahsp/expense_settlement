from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .expense import Expense


class GroupCreate(BaseModel):
    owner_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)


class GroupPublic(BaseModel):
    id: str
    name: str
    owner_id: str
    description: Optional[str] = None
    created_at: datetime
    member_count: Optional[int] = None


class GroupMember(BaseModel):
    id: str
    name: str
    email: EmailStr


class GroupBalance(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    paid: float
    owed: float
    balance: float


class GroupDetail(GroupPublic):
    members: list[GroupMember] = Field(default_factory=list)
    expenses: list[Expense] = Field(default_factory=list)
    total_expense: float = 0.0
    balances: list[GroupBalance] = Field(default_factory=list)


class GroupMemberAdd(BaseModel):
    requester_id: str = Field(..., min_length=1)
    user_email: EmailStr
