import importlib

import pytest
from fastapi.testclient import TestClient

from app import config
import app.main as main_module


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    data_file = tmp_path / "users.json"
    media_dir = tmp_path / "media"
    groups_file = tmp_path / "groups.json"
    monkeypatch.setenv("USE_FILE_STORAGE", "true")
    monkeypatch.setenv("DATA_FILE_PATH", str(data_file))
    monkeypatch.setenv("MEDIA_ROOT", str(media_dir))
    monkeypatch.setenv("GROUPS_FILE_PATH", str(groups_file))
    config.get_settings.cache_clear()
    importlib.reload(main_module)
    client = TestClient(main_module.app)
    yield client
    config.get_settings.cache_clear()
    importlib.reload(main_module)
    monkeypatch.delenv("USE_FILE_STORAGE", raising=False)
    monkeypatch.delenv("DATA_FILE_PATH", raising=False)
    monkeypatch.delenv("MEDIA_ROOT", raising=False)
    monkeypatch.delenv("GROUPS_FILE_PATH", raising=False)


def test_signup_and_login_flow(api_client):
    signup_response = api_client.post(
        "/signup",
        json={"name": "Casey", "email": "casey@example.com", "password": "secret123"},
    )
    assert signup_response.status_code == 201
    user_id = signup_response.json()["id"]
    assert signup_response.json()["email"] == "casey@example.com"

    login_response = api_client.post(
        "/login",
        json={"email": "casey@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["name"] == "Casey"

    update_response = api_client.put(
        f"/users/{user_id}",
        json={"age": 29, "address": "42 Test Lane", "gender": "Female"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["age"] == 29

    profile_response = api_client.get(f"/users/{user_id}")
    assert profile_response.status_code == 200
    assert profile_response.json()["address"] == "42 Test Lane"

    second_user = api_client.post(
        "/signup",
        json={"name": "Alex", "email": "alex@example.com", "password": "secret456"},
    )
    assert second_user.status_code == 201

    group_response = api_client.post(
        "/groups",
        json={
            "owner_id": user_id,
            "name": "Analysts",
            "description": "Finance team",
        },
    )
    assert group_response.status_code == 201
    group_id = group_response.json()["id"]

    add_member_response = api_client.post(
        f"/groups/{group_id}/members",
        json={"requester_id": user_id, "user_email": "alex@example.com"},
    )
    assert add_member_response.status_code == 200
    assert len(add_member_response.json()["members"]) == 2

    expense_response = api_client.post(
        f"/groups/{group_id}/expenses",
        json={"payer_email": "casey@example.com", "amount": 42.75, "note": "Lunch"},
    )
    assert expense_response.status_code == 200
    assert expense_response.json()["expenses"][0]["amount"] == 42.75

    user_groups_response = api_client.get(f"/users/{user_id}/groups")
    assert user_groups_response.status_code == 200
    assert user_groups_response.json()[0]["name"] == "Analysts"

    avatar_response = api_client.post(
        f"/users/{user_id}/avatar",
        files={"file": ("avatar.png", b"fake image", "image/png")},
    )
    assert avatar_response.status_code == 200
    assert avatar_response.json()["avatar_url"].startswith("/media/")
