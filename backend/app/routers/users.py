from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from mysql.connector import Error as MySQLError

from ..crud import user as user_crud
from ..dependencies import get_settings_dependency
from ..schemas.user import UserLogin, UserProfileUpdate, UserPublic, UserSignup
from ..utils.files import save_avatar_file

router = APIRouter(tags=["users"])


@router.post("/signup", response_model=UserPublic, status_code=201)
def signup(user: UserSignup) -> UserPublic:
    try:
        return user_crud.create_user(user)
    except user_crud.DuplicateEmailError as err:
        raise HTTPException(status_code=409, detail="Email already registered") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to create user") from err


@router.post("/login", response_model=UserPublic)
def login(credentials: UserLogin) -> UserPublic:
    try:
        return user_crud.authenticate_user(credentials)
    except user_crud.InvalidCredentialsError as err:
        raise HTTPException(status_code=401, detail="Invalid email or password") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to login") from err


@router.get("/users", response_model=list[UserPublic])
def list_users() -> list[UserPublic]:
    try:
        return user_crud.list_users()
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to fetch users") from err


@router.get("/users/{user_id}", response_model=UserPublic)
def get_user_profile(user_id: str) -> UserPublic:
    try:
        return user_crud.get_user(user_id)
    except user_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to fetch profile") from err


@router.put("/users/{user_id}", response_model=UserPublic)
def update_user_profile(user_id: str, payload: UserProfileUpdate) -> UserPublic:
    try:
        return user_crud.update_user_profile(user_id, payload)
    except user_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to update profile") from err


@router.post("/users/{user_id}/avatar", response_model=UserPublic)
def upload_avatar(  # noqa: ANN001
    user_id: str,
    file: UploadFile = File(...),
    settings=Depends(get_settings_dependency),
) -> UserPublic:
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    avatar_url = save_avatar_file(user_id, file, settings)
    try:
        return user_crud.update_user_avatar(user_id, avatar_url)
    except user_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to save avatar") from err


__all__ = ["router"]
