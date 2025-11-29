from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from mysql.connector.errors import IntegrityError

from ..config import get_settings
from ..database import get_connection
from ..schemas.expense import Expense
from ..schemas.group import (
    GroupBalance,
    GroupCreate,
    GroupDetail,
    GroupMember,
    GroupPublic,
)
from ..utils.validation import normalize_name
from .exceptions import (
    GroupMembershipError,
    GroupNotFoundError,
    GroupOwnershipError,
    UserNotFoundError,
)
from .file_storage import ExpenseRecord, GroupRecord, UserRecord, load_groups, load_users, save_groups


def list_user_groups(user_id: str) -> list[GroupPublic]:
    settings = get_settings()
    if settings.use_file_storage:
        _ensure_user_exists_file(user_id)
        return _list_user_groups_file(user_id)
    _ensure_user_exists_db(user_id)
    return _list_user_groups_db(user_id)


def create_group(payload: GroupCreate) -> GroupDetail:
    settings = get_settings()
    if settings.use_file_storage:
        return _create_group_file(payload)
    return _create_group_db(payload)


def get_group(group_id: str) -> GroupDetail:
    settings = get_settings()
    if settings.use_file_storage:
        return _get_group_file(group_id)
    return _get_group_db(group_id)


def add_member_to_group(group_id: str, requester_id: str, user_email: str) -> GroupDetail:
    settings = get_settings()
    if settings.use_file_storage:
        return _add_member_to_group_file(group_id, requester_id, user_email)
    return _add_member_to_group_db(group_id, requester_id, user_email)


# --- Database helpers -----------------------------------------------------


def _list_user_groups_db(user_id: str) -> list[GroupPublic]:
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT g.id, g.name, g.description, g.owner_id, g.created_at,
                   (SELECT COUNT(*) FROM user_groups ug2 WHERE ug2.group_id = g.id) AS member_count
            FROM `groups` g
            INNER JOIN user_groups ug ON ug.group_id = g.id
            WHERE ug.user_id = %s
            ORDER BY g.name
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()
        connection.close()
    return [_group_public_from_row(row) for row in rows]


def _create_group_db(payload: GroupCreate) -> GroupDetail:
    connection = get_connection()
    cursor = connection.cursor()
    group_id = str(uuid4())
    created_at = datetime.utcnow()
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s", (payload.owner_id,))
        if cursor.fetchone() is None:
            raise UserNotFoundError
        cursor.execute(
            "INSERT INTO `groups` (id, name, description, owner_id, created_at) VALUES (%s, %s, %s, %s, %s)",
            (
                group_id,
                normalize_name(payload.name),
                payload.description,
                payload.owner_id,
                created_at,
            ),
        )
        cursor.execute(
            "INSERT INTO user_groups (user_id, group_id) VALUES (%s, %s)",
            (payload.owner_id, group_id),
        )
        connection.commit()
    except IntegrityError as err:
        connection.rollback()
        raise ValueError("Group with this name already exists") from err
    finally:
        cursor.close()
        connection.close()
    return _get_group_db(group_id)


def _get_group_db(group_id: str) -> GroupDetail:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT id, name, description, owner_id, created_at FROM `groups` WHERE id = %s",
            (group_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise GroupNotFoundError
        cursor.close()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT u.id, u.name, u.email
            FROM user_groups ug
            INNER JOIN users u ON u.id = ug.user_id
            WHERE ug.group_id = %s
            ORDER BY u.name
            """,
            (group_id,),
        )
        members = [GroupMember(**member) for member in cursor.fetchall()]
        cursor.execute(
            """
            SELECT e.id,
                   eg.group_id,
                   e.payer_id,
                   e.amount,
                   e.note,
                   e.status,
                   e.created_at,
                   u.name AS payer_name,
                   u.email AS payer_email
            FROM expenses e
            INNER JOIN expense_groups eg ON eg.expense_id = e.id
            INNER JOIN users u ON u.id = e.payer_id
            WHERE eg.group_id = %s
            ORDER BY e.created_at DESC
            """,
            (group_id,),
        )
        expenses = [_expense_from_db_row(expense) for expense in cursor.fetchall()]
    finally:
        cursor.close()
        connection.close()
    return _compose_group_detail(
        group_id=row[0],
        name=row[1],
        description=row[2],
        owner_id=row[3],
        created_at=row[4],
        members=members,
        expenses=expenses,
    )


def _add_member_to_group_db(group_id: str, requester_id: str, user_email: str) -> GroupDetail:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT owner_id FROM `groups` WHERE id = %s",
            (group_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise GroupNotFoundError
        owner_id = row[0]
        if owner_id != requester_id:
            raise GroupOwnershipError
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,),
        )
        user_row = cursor.fetchone()
        if not user_row:
            raise UserNotFoundError
        target_user_id = user_row[0]
        cursor.execute(
            "SELECT 1 FROM user_groups WHERE user_id = %s AND group_id = %s",
            (target_user_id, group_id),
        )
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO user_groups (user_id, group_id) VALUES (%s, %s)",
                (target_user_id, group_id),
            )
            connection.commit()
    finally:
        cursor.close()
        connection.close()
    return _get_group_db(group_id)


def _ensure_user_exists_db(user_id: str) -> None:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
        if cursor.fetchone() is None:
            raise UserNotFoundError
    finally:
        cursor.close()
        connection.close()


def _group_public_from_row(row: dict) -> GroupPublic:
    return GroupPublic(
        id=row["id"],
        name=row["name"],
        owner_id=row["owner_id"],
        description=row.get("description"),
        created_at=row["created_at"],
        member_count=row.get("member_count"),
    )


def _compose_group_detail(
    group_id: str,
    name: str,
    description: Optional[str],
    owner_id: str,
    created_at: datetime,
    members: list[GroupMember],
    expenses: list[Expense],
) -> GroupDetail:
    balances, total_amount = _calculate_balances(members, expenses)
    return GroupDetail(
        id=group_id,
        name=name,
        description=description,
        owner_id=owner_id,
        created_at=created_at,
        member_count=len(members),
        members=members,
        expenses=expenses,
        total_expense=total_amount,
        balances=balances,
    )


def _expense_from_db_row(row: dict) -> Expense:
    return Expense(
        id=row["id"],
        group_id=row["group_id"],
        payer_id=row["payer_id"],
        payer_name=row["payer_name"],
        payer_email=row["payer_email"],
        amount=float(row["amount"]),
        note=row.get("note"),
        status=row.get("status", "assigned"),
        created_at=row["created_at"],
    )


def _calculate_balances(
    members: list[GroupMember], expenses: list[Expense]
) -> tuple[list[GroupBalance], float]:
    if not members:
        total_amount = round(sum(float(exp.amount) for exp in expenses), 2)
        return [], total_amount

    paid_map = {member.id: 0.0 for member in members}
    owed_map = {member.id: 0.0 for member in members}
    total_amount = 0.0
    member_count = len(members)

    for expense in expenses:
        amount = float(expense.amount)
        total_amount += amount
        share = amount / member_count if member_count else 0.0
        for member in members:
            owed_map[member.id] += share
        if expense.payer_id in paid_map:
            paid_map[expense.payer_id] += amount

    balances = []
    for member in members:
        paid_value = round(paid_map[member.id], 2)
        owed_value = round(owed_map[member.id], 2)
        balances.append(
            GroupBalance(
                user_id=member.id,
                name=member.name,
                email=member.email,
                paid=paid_value,
                owed=owed_value,
                balance=round(owed_value - paid_value, 2),
            )
        )
    return balances, round(total_amount, 2)


# --- File storage helpers -------------------------------------------------


def _create_group_file(payload: GroupCreate) -> GroupDetail:
    users = load_users()
    if not any(user["id"] == payload.owner_id for user in users):
        raise UserNotFoundError
    groups = load_groups()
    if any(group["name"].lower() == payload.name.lower() for group in groups):
        raise ValueError("Group with this name already exists")
    created_at = datetime.utcnow()
    record: GroupRecord = {
        "id": str(uuid4()),
        "name": payload.name.strip(),
        "owner_id": payload.owner_id,
        "description": payload.description,
        "created_at": created_at.isoformat(),
        "members": [payload.owner_id],
        "expenses": [],
    }
    groups.append(record)
    save_groups(groups)
    return _group_detail_from_record(record)


def _get_group_file(group_id: str) -> GroupDetail:
    groups = load_groups()
    for group in groups:
        if group["id"] == group_id:
            return _group_detail_from_record(group)
    raise GroupNotFoundError


def _list_user_groups_file(user_id: str) -> list[GroupPublic]:
    groups = load_groups()
    result = [
        _group_public_from_record(group)
        for group in groups
        if user_id in group.get("members", [])
    ]
    return sorted(result, key=lambda g: g.name.lower())


def _add_member_to_group_file(group_id: str, requester_id: str, user_email: str) -> GroupDetail:
    users = load_users()
    email_map = {user["email"].lower(): user for user in users}
    groups = load_groups()
    group = next((g for g in groups if g["id"] == group_id), None)
    if not group:
        raise GroupNotFoundError
    if group["owner_id"] != requester_id:
        raise GroupOwnershipError
    target = email_map.get(user_email.lower())
    if not target:
        raise UserNotFoundError
    members = group.setdefault("members", [])
    if target["id"] not in members:
        members.append(target["id"])
    save_groups(groups)
    return _group_detail_from_record(group)


def _ensure_user_exists_file(user_id: str) -> None:
    users = load_users()
    if not any(user["id"] == user_id for user in users):
        raise UserNotFoundError


def _group_public_from_record(record: GroupRecord) -> GroupPublic:
    created_at_value = record["created_at"]
    created_at_dt = (
        datetime.fromisoformat(created_at_value)
        if isinstance(created_at_value, str)
        else created_at_value
    )
    return GroupPublic(
        id=record["id"],
        name=record["name"],
        owner_id=record["owner_id"],
        description=record.get("description"),
        created_at=created_at_dt,
        member_count=len(record.get("members", [])),
    )


def _group_detail_from_record(record: GroupRecord) -> GroupDetail:
    members: list[GroupMember] = []
    users = {user["id"]: user for user in load_users()}
    for member_id in record.get("members", []):
        user = users.get(member_id)
        if user:
            members.append(
                GroupMember(id=user["id"], name=user["name"], email=user["email"])
            )
    expenses: list[Expense] = []
    for entry in record.get("expenses", []):
        payer = users.get(entry["payer_id"])
        payer_name = payer["name"] if payer else "Unknown"
        payer_email = payer["email"] if payer else "unknown@example.com"
        created_at_value = entry["created_at"]
        created_at_dt = (
            datetime.fromisoformat(created_at_value)
            if isinstance(created_at_value, str)
            else created_at_value
        )
        expenses.append(
            Expense(
                id=entry["id"],
                group_id=record["id"],
                payer_id=entry["payer_id"],
                payer_name=payer_name,
                payer_email=payer_email,
                amount=entry["amount"],
                note=entry.get("note"),
                status=entry.get("status", "assigned"),
                created_at=created_at_dt,
            )
        )
    public = _group_public_from_record(record)
    return _compose_group_detail(
        group_id=record["id"],
        name=public.name,
        description=public.description,
        owner_id=public.owner_id,
        created_at=public.created_at,
        members=members,
        expenses=expenses,
    )


__all__ = [
    "add_member_to_group",
    "create_group",
    "get_group",
    "list_user_groups",
    "GroupNotFoundError",
    "GroupMembershipError",
    "GroupOwnershipError",
    "UserNotFoundError",
    "_compose_group_detail",
    "_calculate_balances",
    "_get_group_db",
    "_get_group_file",
]
