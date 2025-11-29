from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .group import GroupPublic


class UserSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime
    role: str = "user"
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[str] = None
    address: Optional[str] = Field(default=None, max_length=255)
    bio: Optional[str] = Field(default=None, max_length=500)
    avatar_url: Optional[str] = None
    groups: Optional[list[GroupPublic]] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=255)
    bio: Optional[str] = Field(default=None, max_length=500)

