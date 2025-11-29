from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import uuid4

from mysql.connector import errorcode
from mysql.connector.errors import IntegrityError

from ..config import get_settings
from ..database import get_connection
from ..external_services.email import send_welcome_email
from ..external_services.notification import notify_admin
from ..schemas.group import GroupPublic
from ..schemas.user import UserLogin, UserProfileUpdate, UserPublic, UserSignup
from ..utils.authentication import hash_password, verify_password
from ..utils.validation import normalize_name
from . import group as group_crud
from .exceptions import DuplicateEmailError, InvalidCredentialsError, UserNotFoundError
from .file_storage import UserRecord, load_users, save_users

logger = logging.getLogger("signup_app.crud.user")


def create_user(payload: UserSignup) -> UserPublic:
    settings = get_settings()
    normalized_name = normalize_name(payload.name)
    if settings.use_file_storage:
        user = _create_user_file(payload, normalized_name)
        logger.info("Created user %s via file storage", payload.email)
    else:
        user = _create_user_db(payload, normalized_name)
        logger.info("Created user %s via MySQL storage", payload.email)
    send_welcome_email(user.email)
    notify_admin(f"New signup: {user.email}")
    return user


def authenticate_user(credentials: UserLogin) -> UserPublic:
    settings = get_settings()
    if settings.use_file_storage:
        return _authenticate_user_file(credentials)
    return _authenticate_user_db(credentials)


def get_user(user_id: str) -> UserPublic:
    settings = get_settings()
    if settings.use_file_storage:
        return _get_user_file(user_id)
    return _get_user_db(user_id)


def update_user_profile(user_id: str, payload: UserProfileUpdate) -> UserPublic:
    settings = get_settings()
    if settings.use_file_storage:
        return _update_user_file(user_id, payload)
    return _update_user_db(user_id, payload)


def update_user_avatar(user_id: str, avatar_url: str) -> UserPublic:
    settings = get_settings()
    if settings.use_file_storage:
        return _update_avatar_file(user_id, avatar_url)
    return _update_avatar_db(user_id, avatar_url)


def list_users() -> List[UserPublic]:
    settings = get_settings()
    if settings.use_file_storage:
        return _list_users_file()
    return _list_users_db()


# --- Database helpers -----------------------------------------------------


def _create_user_db(payload: UserSignup, normalized_name: str) -> UserPublic:
    connection = get_connection()
    cursor = connection.cursor()
    created_at = datetime.utcnow()
    user_id = str(uuid4())
    try:
        cursor.execute(
            (
                "INSERT INTO users (id, name, email, password_hash, created_at, role, age, gender, address, bio, avatar_url) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            ),
            (
                user_id,
                normalized_name,
                payload.email,
                hash_password(payload.password),
                created_at,
                "user",
                None,
                None,
                None,
                None,
                None,
            ),
        )
        connection.commit()
    except IntegrityError as err:
        connection.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise DuplicateEmailError from err
        raise
    finally:
        cursor.close()
        connection.close()

    return UserPublic(
        id=user_id,
        name=normalized_name,
        email=payload.email,
        created_at=created_at,
        role="user",
        groups=group_crud.list_user_groups(user_id),
    )


def _authenticate_user_db(credentials: UserLogin) -> UserPublic:
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            (
                "SELECT id, name, email, password_hash, created_at, role, age, gender, address, bio, avatar_url "
                "FROM users WHERE email = %s"
            ),
            (credentials.email,),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()
        connection.close()

    if not row or not verify_password(credentials.password, row["password_hash"]):
        logger.warning("Login failed for %s via MySQL storage", credentials.email)
        raise InvalidCredentialsError

    logger.info("Login success for %s via MySQL storage", credentials.email)
    groups = group_crud.list_user_groups(row["id"])
    return _user_public_from_db_row(row, groups=groups)


def _get_user_db(user_id: str) -> UserPublic:
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at, role, age, gender, address, bio, avatar_url FROM users WHERE id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()
        connection.close()

    if not row:
        raise UserNotFoundError
    groups = group_crud.list_user_groups(user_id)
    return _user_public_from_db_row(row, groups=groups)


def _update_user_db(user_id: str, payload: UserProfileUpdate) -> UserPublic:
    updates = {}
    if payload.name is not None:
        updates["name"] = normalize_name(payload.name)
    if payload.age is not None:
        updates["age"] = payload.age
    if payload.gender is not None:
        updates["gender"] = payload.gender
    if payload.address is not None:
        updates["address"] = payload.address
    if payload.bio is not None:
        updates["bio"] = payload.bio

    if updates:
        connection = get_connection()
        cursor = connection.cursor()
        try:
            set_clause = ", ".join(f"{column} = %s" for column in updates.keys())
            params = list(updates.values()) + [user_id]
            cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", params)
            if cursor.rowcount == 0:
                cursor.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
                if cursor.fetchone() is None:
                    raise UserNotFoundError
            connection.commit()
        finally:
            cursor.close()
            connection.close()

    return _get_user_db(user_id)


def _update_avatar_db(user_id: str, avatar_url: str) -> UserPublic:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))
        if cursor.rowcount == 0:
            cursor.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
            if cursor.fetchone() is None:
                raise UserNotFoundError
        connection.commit()
    finally:
        cursor.close()
        connection.close()
    return _get_user_db(user_id)


def _list_users_db() -> List[UserPublic]:
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, created_at, role, age, gender, address, bio, avatar_url FROM users ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()
        connection.close()

    users = []
    for row in rows:
        groups = group_crud.list_user_groups(row["id"])
        users.append(_user_public_from_db_row(row, groups=groups))
    return users


def _user_public_from_db_row(row: dict, groups: Optional[list[GroupPublic]] = None) -> UserPublic:
    return UserPublic(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        created_at=row["created_at"],
        role=row.get("role", "user"),
        age=row.get("age"),
        gender=row.get("gender"),
        address=row.get("address"),
        bio=row.get("bio"),
        avatar_url=row.get("avatar_url"),
        groups=groups,
    )


# --- File storage helpers -------------------------------------------------


def _create_user_file(payload: UserSignup, normalized_name: str) -> UserPublic:
    users = load_users()
    email_key = payload.email.lower()
    if any(user["email"].lower() == email_key for user in users):
        raise DuplicateEmailError

    created_at = datetime.utcnow()
    record: UserRecord = {
        "id": str(uuid4()),
        "name": normalized_name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "created_at": created_at.isoformat(),
        "role": "user",
        "age": None,
        "gender": None,
        "address": None,
        "bio": None,
        "avatar_url": None,
    }
    users.append(record)
    save_users(users)
    return _user_public_from_record(record)


def _authenticate_user_file(credentials: UserLogin) -> UserPublic:
    users = load_users()
    email_key = credentials.email.lower()
    record = next((user for user in users if user["email"].lower() == email_key), None)
    if not record or not verify_password(credentials.password, record["password_hash"]):
        logger.warning("Login failed for %s via file storage", credentials.email)
        raise InvalidCredentialsError
    logger.info("Login success for %s via file storage", credentials.email)
    return _user_public_from_record(record)


def _get_user_file(user_id: str) -> UserPublic:
    _, record = _get_file_record(user_id)
    return _user_public_from_record(record)


def _update_user_file(user_id: str, payload: UserProfileUpdate) -> UserPublic:
    users, record = _get_file_record(user_id)
    if payload.name is not None:
        record["name"] = normalize_name(payload.name)
    if payload.age is not None:
        record["age"] = payload.age
    if payload.gender is not None:
        record["gender"] = payload.gender
    if payload.address is not None:
        record["address"] = payload.address
    if payload.bio is not None:
        record["bio"] = payload.bio
    save_users(users)
    return _user_public_from_record(record)


def _update_avatar_file(user_id: str, avatar_url: str) -> UserPublic:
    users, record = _get_file_record(user_id)
    record["avatar_url"] = avatar_url
    save_users(users)
    return _user_public_from_record(record)


def _list_users_file() -> List[UserPublic]:
    users = sorted(load_users(), key=lambda entry: entry["created_at"], reverse=True)
    return [_user_public_from_record(record) for record in users]


def _get_file_record(user_id: str) -> Tuple[list[UserRecord], UserRecord]:
    users = load_users()
    for index, record in enumerate(users):
        if record["id"] == user_id:
            return users, record
    raise UserNotFoundError


def _user_public_from_record(record: UserRecord) -> UserPublic:
    created_at_value = record["created_at"]
    if isinstance(created_at_value, str):
        normalized = created_at_value.replace("Z", "+00:00") if created_at_value.endswith("Z") else created_at_value
        created_at_dt = datetime.fromisoformat(normalized)
    else:
        created_at_dt = created_at_value
    groups = group_crud.list_user_groups(record["id"])
    return UserPublic(
        id=record["id"],
        name=record["name"],
        email=record["email"],
        created_at=created_at_dt,
        role=record.get("role", "user"),
        age=record.get("age"),
        gender=record.get("gender"),
        address=record.get("address"),
        bio=record.get("bio"),
        avatar_url=record.get("avatar_url"),
        groups=groups,
    )
