import pytest

from app import config
from app.crud import expense as expense_crud
from app.crud import group as group_crud
from app.crud import user as user_crud
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.schemas.group import GroupCreate
from app.schemas.user import UserLogin, UserProfileUpdate, UserSignup


@pytest.fixture(autouse=True)
def file_storage_env(tmp_path, monkeypatch):
    data_file = tmp_path / "users.json"
    groups_file = tmp_path / "groups.json"
    monkeypatch.setenv("USE_FILE_STORAGE", "true")
    monkeypatch.setenv("DATA_FILE_PATH", str(data_file))
    monkeypatch.setenv("GROUPS_FILE_PATH", str(groups_file))
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()
    monkeypatch.delenv("USE_FILE_STORAGE", raising=False)
    monkeypatch.delenv("DATA_FILE_PATH", raising=False)
    monkeypatch.delenv("GROUPS_FILE_PATH", raising=False)


def test_create_list_and_authenticate_user(file_storage_env):
    signup_payload = UserSignup(name="Test User", email="test@example.com", password="password123")

    created = user_crud.create_user(signup_payload)
    assert created.email == signup_payload.email

    listed = user_crud.list_users()
    assert len(listed) == 1
    assert listed[0].email == signup_payload.email

    authenticated = user_crud.authenticate_user(UserLogin(email="test@example.com", password="password123"))
    assert authenticated.email == signup_payload.email

    with pytest.raises(user_crud.InvalidCredentialsError):
        user_crud.authenticate_user(UserLogin(email="test@example.com", password="wrongpass"))


def test_update_profile_fields(file_storage_env):
    created = user_crud.create_user(
        UserSignup(name="Casey", email="casey@example.com", password="securepass"),
    )

    updated = user_crud.update_user_profile(
        created.id,
        UserProfileUpdate(age=32, gender="Non-binary", address="123 Demo St", bio="Hello world"),
    )

    assert updated.age == 32
    assert updated.gender == "Non-binary"
    assert updated.address == "123 Demo St"
    assert updated.bio == "Hello world"

    fetched = user_crud.get_user(created.id)
    assert fetched.age == 32
    assert fetched.gender == "Non-binary"


def test_update_profile_same_values(file_storage_env):
    created = user_crud.create_user(
        UserSignup(name="Jamie", email="jamie@example.com", password="securepass"),
    )

    first = user_crud.update_user_profile(
        created.id,
        UserProfileUpdate(address="123 Demo St"),
    )
    assert first.address == "123 Demo St"

    # Updating with the same payload should still succeed (no NotFound error).
    second = user_crud.update_user_profile(
        created.id,
        UserProfileUpdate(address="123 Demo St"),
    )
    assert second.address == "123 Demo St"


def test_user_group_assignments(file_storage_env):
    user = user_crud.create_user(
        UserSignup(name="Jordan", email="jordan@example.com", password="secret"),
    )
    other = user_crud.create_user(
        UserSignup(name="Casey", email="casey@example.com", password="secret"),
    )
    group = group_crud.create_group(
        GroupCreate(owner_id=user.id, name="Premium", description="VIP users"),
    )
    assert group.member_count == 1

    updated_group = group_crud.add_member_to_group(
        group.id, requester_id=user.id, user_email=other.email
    )
    assert updated_group.member_count == 2
    assert any(member.email == other.email for member in updated_group.members)

    groups = group_crud.list_user_groups(user.id)
    assert len(groups) == 1
    assert groups[0].name == "Premium"

    expense_detail = expense_crud.add_expense_to_group(
        group.id,
        ExpenseCreate(
            payer_email="jordan@example.com",
            amount=25.5,
            note="Team snacks",
        ),
    )
    assert expense_detail.expenses[0].amount == 25.5
    assert expense_detail.expenses[0].payer_email == "jordan@example.com"
    assert expense_detail.expenses[0].status == "assigned"
    assert expense_detail.total_expense == pytest.approx(25.5)
    balances = {entry.email: entry for entry in expense_detail.balances}
    assert balances["jordan@example.com"].balance == pytest.approx(-12.75)
    assert balances["casey@example.com"].balance == pytest.approx(12.75)

    expense_id = expense_detail.expenses[0].id
    updated_detail = expense_crud.update_expense_in_group(
        group.id,
        expense_id,
        ExpenseUpdate(amount=50, status="paid"),
    )
    assert updated_detail.expenses[0].amount == 50
    assert updated_detail.expenses[0].status == "paid"

    after_delete = expense_crud.delete_expense_from_group(group.id, expense_id)
    assert after_delete.expenses == []
    assert after_delete.total_expense == 0.0
