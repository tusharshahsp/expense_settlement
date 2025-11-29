from __future__ import annotations

from fastapi import APIRouter, HTTPException
from mysql.connector import Error as MySQLError

from ..crud import group as group_crud
from ..schemas.group import GroupCreate, GroupDetail, GroupMemberAdd, GroupPublic

router = APIRouter(tags=["groups"])


@router.get("/users/{user_id}/groups", response_model=list[GroupPublic])
def get_user_groups(user_id: str) -> list[GroupPublic]:
    try:
        return group_crud.list_user_groups(user_id)
    except group_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to fetch groups") from err


@router.post("/groups", response_model=GroupDetail, status_code=201)
def create_group(payload: GroupCreate) -> GroupDetail:
    try:
        return group_crud.create_group(payload)
    except group_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="Owner not found") from err
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to create group") from err


@router.get("/groups/{group_id}", response_model=GroupDetail)
def get_group(group_id: str) -> GroupDetail:
    try:
        return group_crud.get_group(group_id)
    except group_crud.GroupNotFoundError as err:
        raise HTTPException(status_code=404, detail="Group not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to fetch group") from err


@router.post("/groups/{group_id}/members", response_model=GroupDetail)
def add_member_to_group(group_id: str, payload: GroupMemberAdd) -> GroupDetail:
    try:
        return group_crud.add_member_to_group(group_id, payload.requester_id, payload.user_email)
    except group_crud.GroupNotFoundError as err:
        raise HTTPException(status_code=404, detail="Group not found") from err
    except group_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except group_crud.GroupOwnershipError as err:
        raise HTTPException(status_code=403, detail="Only the group owner can add members") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to update group") from err


__all__ = ["router"]

