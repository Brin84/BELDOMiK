"""Tests for monetization: promotion catalog, promote flow, subscriptions, payments."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.geography import City
from app.models.monetization import Promotion, PromotionStatus, PaymentStatus, Subscription
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import Agency, AgencyMember, User


@pytest.fixture
def owner(db_session: Session) -> User:
    user = User(
        tg_id=300000001,
        username="monet_owner",
        first_name="Monet",
        last_name="Owner",
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
def property_(db_session: Session, owner: User, seed_test_data) -> Property:
    city = db_session.query(City).filter(City.name == "Минск").first()
    prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
    op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()

    prop = Property(
        owner_id=owner.id,
        type_id=prop_type.id,
        operation_id=op_type.id,
        city_id=city.id,
        address="Промо адрес",
        total_area=60.0,
        living_area=40.0,
        kitchen_area=10.0,
        rooms_count=2,
        floor=3,
        total_floors=9,
        build_year=2018,
        status=PropertyStatus.PUBLISHED,
    )
    db_session.add(prop)
    db_session.flush()
    db_session.add(
        PropertyPrice(property_id=prop.id, price_byn=120000, is_current=True)
    )
    db_session.commit()
    db_session.refresh(prop)
    return prop


class TestPromotionCatalog:
    def test_promotions_catalog(self, client: TestClient):
        resp = client.get("/api/v1/monetization/promotions")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 5
        types = {i["type"] for i in items}
        assert types == {"top", "vip", "bump_up", "highlight", "pin"}
        assert all(i["price_byn"] > 0 for i in items)

    def test_plans(self, client: TestClient):
        resp = client.get("/api/v1/monetization/plans")
        assert resp.status_code == 200
        plans = {p["plan"]: p for p in resp.json()}
        assert set(plans) == {"free", "pro", "enterprise"}
        assert plans["free"]["price_byn"] == 0
        assert plans["pro"]["max_properties"] == 50


class TestPromoteFlow:
    def test_promote_and_confirm(self, client: TestClient, property_: Property, auth: dict):
        # Initiate promotion -> checkout
        resp = client.post(
            f"/api/v1/monetization/properties/{property_.id}/promote",
            json={"promotion_type": "top"},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        checkout = resp.json()
        assert checkout["provider"] == "mock"
        assert checkout["amount_byn"] == 49
        payment_id = checkout["payment_id"]

        # Confirm payment -> payment succeeded, promotion active
        resp = client.post(
            f"/api/v1/monetization/payments/{payment_id}/confirm",
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "succeeded"

        # Active promotion now visible
        resp = client.get(f"/api/v1/monetization/properties/{property_.id}/promotions")
        assert resp.status_code == 200
        promos = resp.json()
        assert len(promos) == 1
        assert promos[0]["type"] == "top"
        assert promos[0]["status"] == "active"

    def test_promote_requires_auth(self, client: TestClient, property_: Property):
        resp = client.post(
            f"/api/v1/monetization/properties/{property_.id}/promote",
            json={"promotion_type": "top"},
        )
        assert resp.status_code == 401

    def test_duplicate_promotion_rejected(self, client: TestClient, property_: Property, auth: dict):
        # First VIP -> checkout + confirm (active).
        resp = client.post(
            f"/api/v1/monetization/properties/{property_.id}/promote",
            json={"promotion_type": "vip"},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        client.post(
            f"/api/v1/monetization/payments/{resp.json()['payment_id']}/confirm",
            headers=auth,
        )
        # Second VIP while one is already active -> rejected as duplicate.
        resp = client.post(
            f"/api/v1/monetization/properties/{property_.id}/promote",
            json={"promotion_type": "vip"},
            headers=auth,
        )
        assert resp.status_code == 400


class TestPayments:
    def test_payments_history_auth(self, client: TestClient, auth: dict):
        resp = client.get("/api/v1/monetization/payments", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_payments_requires_auth(self, client: TestClient):
        resp = client.get("/api/v1/monetization/payments")
        assert resp.status_code == 401


class TestSubscriptions:
    def test_free_subscription_activates(self, client: TestClient, owner: User, auth: dict):
        # Owner creates an agency (becomes admin).
        agency = client.post(
            "/api/v1/agencies", json={"name": "Подписка Агентство"}, headers=auth
        ).json()
        aid = agency["id"]

        resp = client.post(
            "/api/v1/monetization/subscriptions",
            json={"plan": "free", "agency_id": aid},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        sub = resp.json()
        assert sub["plan"] == "free"
        assert sub["status"] == "active"

    def test_paid_subscription_checkout(self, client: TestClient, owner: User, auth: dict):
        agency = client.post(
            "/api/v1/agencies", json={"name": "PRO Агентство"}, headers=auth
        ).json()
        aid = agency["id"]

        resp = client.post(
            "/api/v1/monetization/subscriptions",
            json={"plan": "pro", "agency_id": aid},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        checkout = resp.json()
        assert checkout["amount_byn"] == 49

        # Confirm -> subscription active
        resp = client.post(
            f"/api/v1/monetization/payments/{checkout['payment_id']}/confirm",
            headers=auth,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "succeeded"

        subs = client.get("/api/v1/monetization/subscriptions", headers=auth).json()
        assert len(subs) == 1
        assert subs[0]["plan"] == "pro"
        assert subs[0]["status"] == "active"
