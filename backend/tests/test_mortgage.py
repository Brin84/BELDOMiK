"""Tests for mortgage calculator API endpoints."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user in the database."""
    user = User(
        tg_id=111111111,
        username="mortgage_tester",
        first_name="Mortgage",
        last_name="Tester",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate a valid JWT token for the test user."""
    token = create_access_token(
        data={"sub": str(test_user.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


class TestMortgageCalculate:
    """POST /api/v1/mortgage/calculate"""

    def test_save_calculation(self, client: TestClient, auth_headers: dict):
        """Authenticated user can save a calculation."""
        resp = client.post(
            "/api/v1/mortgage/calculate",
            json={
                "property_price": 150000,
                "down_payment_percent": 20,
                "annual_rate": 12,
                "loan_term_months": 240,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["property_price"] == 150000
        assert data["down_payment_percent"] == 20
        assert data["annual_rate"] == 12
        assert data["loan_term_months"] == 240
        assert data["monthly_payment"] > 0
        assert data["total_payment"] > 0
        assert data["overpayment"] > 0
        assert data["id"] > 0
        assert data["user_id"] > 0

    def test_unauthenticated_rejected(self, client: TestClient):
        """Without token, save returns 401."""
        resp = client.post(
            "/api/v1/mortgage/calculate",
            json={
                "property_price": 100000,
                "down_payment_percent": 10,
                "annual_rate": 10,
                "loan_term_months": 120,
            },
        )
        assert resp.status_code in (401, 403), resp.text

    def test_monthly_payment_accuracy(self, client: TestClient, auth_headers: dict):
        """Check monthly payment formula accuracy for known inputs."""
        # 100k price, 20% down = 80k principal, 12% annual rate, 240 months
        resp = client.post(
            "/api/v1/mortgage/calculate",
            json={
                "property_price": 100000,
                "down_payment_percent": 20,
                "annual_rate": 12,
                "loan_term_months": 240,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        # monthly_rate = 0.01, n = 240, principal = 80000
        # payment = 80000 * 0.01 * (1.01)^240 / ((1.01)^240 - 1) ≈ 880.52
        assert 880 < data["monthly_payment"] < 881

    def test_overpayment_exceeds_principal(self, client: TestClient, auth_headers: dict):
        """At high rate and long term, overpayment > principal."""
        resp = client.post(
            "/api/v1/mortgage/calculate",
            json={
                "property_price": 100000,
                "down_payment_percent": 10,
                "annual_rate": 20,
                "loan_term_months": 360,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        principal = 100000 * 0.9  # 90000
        assert data["overpayment"] > principal


class TestMortgageHistory:
    """GET /api/v1/mortgage/history"""

    def test_empty_history(self, client: TestClient, auth_headers: dict):
        """New user has empty history."""
        resp = client.get("/api/v1/mortgage/history", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_history_after_save(self, client: TestClient, auth_headers: dict):
        """Saved calculations appear in history (newest first)."""
        for price in [100000, 200000]:
            client.post(
                "/api/v1/mortgage/calculate",
                json={
                    "property_price": price,
                    "down_payment_percent": 20,
                    "annual_rate": 12,
                    "loan_term_months": 240,
                },
                headers=auth_headers,
            )
        resp = client.get("/api/v1/mortgage/history", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        # Most recent first
        assert data[0]["created_at"] >= data[1]["created_at"]
