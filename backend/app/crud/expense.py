from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from ..config import get_settings
from ..database import get_connection
from ..schemas.expense import ExpenseCreate, ExpenseUpdate
from . import group as group_crud
from .exceptions import (
    ExpenseNotFoundError,
    GroupMembershipError,
    GroupNotFoundError,
    UserNotFoundError,
)
from .file_storage import ExpenseRecord, GroupRecord, load_groups, load_users, save_groups


def add_expense_to_group(group_id: str, payload: ExpenseCreate):
    settings = get_settings()
    if settings.use_file_storage:
        return _add_expense_to_group_file(group_id, payload)
    return _add_expense_to_group_db(group_id, payload)


def update_expense_in_group(group_id: str, expense_id: str, payload: ExpenseUpdate):
    settings = get_settings()
    if settings.use_file_storage:
        return _update_expense_in_group_file(group_id, expense_id, payload)
    return _update_expense_in_group_db(group_id, expense_id, payload)


def delete_expense_from_group(group_id: str, expense_id: str):
    settings = get_settings()
    if settings.use_file_storage:
        return _delete_expense_from_group_file(group_id, expense_id)
    return _delete_expense_from_group_db(group_id, expense_id)


# --- Database helpers -----------------------------------------------------


def _add_expense_to_group_db(group_id: str, payload: ExpenseCreate):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT id FROM `groups` WHERE id = %s", (group_id,))
        if cursor.fetchone() is None:
            raise GroupNotFoundError
        cursor.execute(
            "SELECT id, name, email FROM users WHERE email = %s",
            (payload.payer_email,),
        )
        payer_row = cursor.fetchone()
        if not payer_row:
            raise UserNotFoundError
        payer_id, _, _ = payer_row
        cursor.execute(
            "SELECT 1 FROM user_groups WHERE user_id = %s AND group_id = %s",
            (payer_id, group_id),
        )
        if cursor.fetchone() is None:
            raise GroupMembershipError
        expense_id = str(uuid4())
        created_at = datetime.utcnow()
        status = payload.status or "assigned"
        cursor.execute(
            """
            INSERT INTO expenses (id, payer_id, amount, note, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                expense_id,
                payer_id,
                float(payload.amount),
                payload.note,
                status,
                created_at,
            ),
        )
        cursor.execute(
            "INSERT INTO expense_groups (expense_id, group_id) VALUES (%s, %s)",
            (expense_id, group_id),
        )
        connection.commit()
    finally:
        cursor.close()
        connection.close()
    return group_crud.get_group(group_id)


def _update_expense_in_group_db(group_id: str, expense_id: str, payload: ExpenseUpdate):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            SELECT e.id
            FROM expenses e
            INNER JOIN expense_groups eg ON eg.expense_id = e.id
            WHERE e.id = %s AND eg.group_id = %s
            """,
            (expense_id, group_id),
        )
        if cursor.fetchone() is None:
            raise ExpenseNotFoundError

        updates = []
        params: list = []
        if payload.amount is not None:
            updates.append("amount = %s")
            params.append(float(payload.amount))
        if payload.note is not None:
            updates.append("note = %s")
            params.append(payload.note)
        if payload.status is not None:
            updates.append("status = %s")
            params.append(payload.status)
        if payload.payer_email is not None:
            cursor.execute(
                "SELECT id FROM users WHERE email = %s",
                (payload.payer_email,),
            )
            payer_row = cursor.fetchone()
            if not payer_row:
                raise UserNotFoundError
            new_payer_id = payer_row[0]
            cursor.execute(
                "SELECT 1 FROM user_groups WHERE user_id = %s AND group_id = %s",
                (new_payer_id, group_id),
            )
            if cursor.fetchone() is None:
                raise GroupMembershipError
            updates.append("payer_id = %s")
            params.append(new_payer_id)

        if updates:
            params.append(expense_id)
            set_clause = ", ".join(updates)
            cursor.execute(
                f"UPDATE expenses SET {set_clause} WHERE id = %s",
                params,
            )
            connection.commit()
    finally:
        cursor.close()
        connection.close()
    return group_crud.get_group(group_id)


def _delete_expense_from_group_db(group_id: str, expense_id: str):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            SELECT e.id
            FROM expenses e
            INNER JOIN expense_groups eg ON eg.expense_id = e.id
            WHERE e.id = %s AND eg.group_id = %s
            """,
            (expense_id, group_id),
        )
        if cursor.fetchone() is None:
            raise ExpenseNotFoundError
        cursor.execute("DELETE FROM expenses WHERE id = %s", (expense_id,))
        connection.commit()
    finally:
        cursor.close()
        connection.close()
    return group_crud.get_group(group_id)


# --- File storage helpers -------------------------------------------------


def _add_expense_to_group_file(group_id: str, payload: ExpenseCreate):
    groups = load_groups()
    users = load_users()
    group = next((g for g in groups if g["id"] == group_id), None)
    if not group:
        raise GroupNotFoundError
    payer = next(
        (user for user in users if user["email"].lower() == payload.payer_email.lower()),
        None,
    )
    if not payer:
        raise UserNotFoundError
    members = group.setdefault("members", [])
    if payer["id"] not in members:
        raise GroupMembershipError
    expense: ExpenseRecord = {
        "id": str(uuid4()),
        "group_id": group_id,
        "payer_id": payer["id"],
        "amount": float(payload.amount),
        "note": payload.note,
        "status": payload.status or "assigned",
        "created_at": datetime.utcnow().isoformat(),
    }
    group.setdefault("expenses", []).insert(0, expense)
    save_groups(groups)
    return group_crud.get_group(group_id)


def _update_expense_in_group_file(group_id: str, expense_id: str, payload: ExpenseUpdate):
    groups = load_groups()
    users = load_users()
    group = next((g for g in groups if g["id"] == group_id), None)
    if not group:
        raise GroupNotFoundError
    expenses = group.setdefault("expenses", [])
    expense = next((entry for entry in expenses if entry["id"] == expense_id), None)
    if not expense:
        raise ExpenseNotFoundError

    if payload.payer_email is not None:
        payer = next(
            (user for user in users if user["email"].lower() == payload.payer_email.lower()),
            None,
        )
        if not payer:
            raise UserNotFoundError
        if payer["id"] not in group.get("members", []):
            raise GroupMembershipError
        expense["payer_id"] = payer["id"]
    if payload.amount is not None:
        expense["amount"] = float(payload.amount)
    if payload.note is not None:
        expense["note"] = payload.note
    if payload.status is not None:
        expense["status"] = payload.status

    save_groups(groups)
    return group_crud.get_group(group_id)


def _delete_expense_from_group_file(group_id: str, expense_id: str):
    groups = load_groups()
    group = next((g for g in groups if g["id"] == group_id), None)
    if not group:
        raise GroupNotFoundError
    expenses = group.setdefault("expenses", [])
    index = next((idx for idx, entry in enumerate(expenses) if entry["id"] == expense_id), None)
    if index is None:
        raise ExpenseNotFoundError
    expenses.pop(index)
    save_groups(groups)
    return group_crud.get_group(group_id)


__all__ = [
    "add_expense_to_group",
    "update_expense_in_group",
    "delete_expense_from_group",
    "ExpenseNotFoundError",
    "GroupMembershipError",
    "GroupNotFoundError",
    "UserNotFoundError",
]
