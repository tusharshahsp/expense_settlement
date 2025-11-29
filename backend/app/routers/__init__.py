from __future__ import annotations

from fastapi import APIRouter

from . import expenses, groups, users

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(groups.router)
api_router.include_router(expenses.router)

__all__ = ["api_router", "users", "groups", "expenses"]
