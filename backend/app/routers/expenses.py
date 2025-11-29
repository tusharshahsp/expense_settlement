from __future__ import annotations

from fastapi import APIRouter, HTTPException
from mysql.connector import Error as MySQLError

from ..crud import expense as expense_crud
from ..schemas.expense import ExpenseCreate, ExpenseUpdate
from ..schemas.group import GroupDetail

router = APIRouter(tags=["expenses"])


@router.post("/groups/{group_id}/expenses", response_model=GroupDetail)
def add_group_expense(group_id: str, payload: ExpenseCreate):
    try:
        return expense_crud.add_expense_to_group(group_id, payload)
    except expense_crud.GroupNotFoundError as err:
        raise HTTPException(status_code=404, detail="Group not found") from err
    except expense_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except expense_crud.GroupMembershipError as err:
        raise HTTPException(status_code=403, detail="User must belong to the group") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to add expense") from err


@router.put("/groups/{group_id}/expenses/{expense_id}", response_model=GroupDetail)
def update_group_expense(group_id: str, expense_id: str, payload: ExpenseUpdate):
    try:
        return expense_crud.update_expense_in_group(group_id, expense_id, payload)
    except expense_crud.GroupNotFoundError as err:
        raise HTTPException(status_code=404, detail="Group not found") from err
    except expense_crud.ExpenseNotFoundError as err:
        raise HTTPException(status_code=404, detail="Expense not found") from err
    except expense_crud.UserNotFoundError as err:
        raise HTTPException(status_code=404, detail="User not found") from err
    except expense_crud.GroupMembershipError as err:
        raise HTTPException(status_code=403, detail="User must belong to the group") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to update expense") from err


@router.delete("/groups/{group_id}/expenses/{expense_id}", response_model=GroupDetail)
def delete_group_expense(group_id: str, expense_id: str):
    try:
        return expense_crud.delete_expense_from_group(group_id, expense_id)
    except expense_crud.GroupNotFoundError as err:
        raise HTTPException(status_code=404, detail="Group not found") from err
    except expense_crud.ExpenseNotFoundError as err:
        raise HTTPException(status_code=404, detail="Expense not found") from err
    except MySQLError as err:
        raise HTTPException(status_code=500, detail="Unable to delete expense") from err


__all__ = ["router"]
