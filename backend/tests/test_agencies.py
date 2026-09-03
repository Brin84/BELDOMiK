"""Tests for agency catalog and management endpoints."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import Agency, AgencyMember, User


@pytest.fixture
def owner(db_session: Session) -> User:
    user = User(
        tg_id=200000001,
        username="agency_owner",
        first_name="Agency",
        last_name="Owner",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def agent(db_session: Session) -> User:
    user = User(
        tg_id=200000002,
        username="agency_agent",
        first_name="Agency",
        last_name="Agent",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth(owner: User) -> dict:
    token = create_access_token(
        data={"sub": str(owner.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def agent_auth(agent: User) -> dict:
    token = create_access_token(
        data={"sub": str(agent.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


class TestAgencyCatalog:
    """Public catalog."""

    def test_list_empty(self, client: TestClient):
        resp = client.get("/api/v1/agencies")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_create(self, client: TestClient, owner: User, auth: dict):
        resp = client.post(
            "/api/v1/agencies",
            json={"name": "Альфа Риэлт"},
            headers=auth,
        )
        assert resp.status_code == 201, resp.text
        agency = resp.json()
        assert agency["name"] == "Альфа Риэлт"
        assert agency["property_count"] == 0

        # New agency is unverified -> hidden from the public catalog.
        resp = client.get("/api/v1/agencies")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_me(self, client: TestClient, auth: dict):
        resp = client.get("/api/v1/agencies/me", headers=auth)
        assert resp.status_code == 404  # not in an agency yet

        client.post("/api/v1/agencies", json={"name": "Бета"}, headers=auth)
        resp = client.get("/api/v1/agencies/me", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Бета"


class TestAgencyMembers:
    """Member management."""

    def test_add_member_admin_only(self, client: TestClient, owner: User, agent: User,
                                   auth: dict, agent_auth: dict):
        agency = client.post(
            "/api/v1/agencies", json={"name": "Гамма"}, headers=auth
        ).json()
        aid = agency["id"]

        # Non-admin cannot add members.
        resp = client.post(
            f"/api/v1/agencies/{aid}/members",
            json={"user_id": agent.id},
            headers=agent_auth,
        )
        assert resp.status_code == 403

        # Admin adds a member.
        resp = client.post(
            f"/api/v1/agencies/{aid}/members",
            json={"user_id": agent.id, "role": "agent"},
            headers=auth,
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["user_id"] == agent.id
        assert resp.json()["role"] == "agent"

        # Members list includes both.
        resp = client.get(f"/api/v1/agencies/{aid}/members")
        assert resp.status_code == 200
        roles = {m["role"] for m in resp.json()}
        assert "admin" in roles and "agent" in roles

    def test_remove_last_admin_blocked(self, client: TestClient, owner: User,
                                       auth: dict):
        agency = client.post(
            "/api/v1/agencies", json={"name": "Дельта"}, headers=auth
        ).json()
        aid = agency["id"]
        resp = client.delete(f"/api/v1/agencies/{aid}/members/{owner.id}", headers=auth)
        assert resp.status_code == 400  # last admin cannot be removed
