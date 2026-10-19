"""Поведение при выключенной монетизации (MONETIZATION_ENABLED=false).

В проде платные услуги (продвижение, подписки PRO/Enterprise) не запущены,
пока у владельца нет статуса ИП/самозанятого. Код при этом остаётся в проекте —
он включается одним флагом.

Проверяем:
- эндпоинты монетизации отдают 404, пока флаг выключен;
- лимит активных объявлений и квота подписки не применяются, пока флаг выключен;
- с выключенным флагом платёж за продвижение не создаётся.
"""
from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models.geography import City
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User


@pytest.fixture
def monetization_off(monkeypatch):
    """Выключить платные услуги на время теста."""
    monkeypatch.setattr(settings, "MONETIZATION_ENABLED", False)


def _auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


def _add_user(db_session: Session, tg_id: int) -> User:
    user = User(tg_id=tg_id, username=f"user_{tg_id}", first_name="Тест", role="owner")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _add_property(db_session: Session, owner_id: int, *, status: PropertyStatus) -> Property:
    city = db_session.query(City).filter(City.name == "Минск").first()
    prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
    op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()
    prop = Property(
        owner_id=owner_id,
        type_id=prop_type.id,
        operation_id=op_type.id,
        city_id=city.id,
        address="ул. Тестовая, 5",
        total_area=60.0,
        rooms_count=2,
        floor=5,
        total_floors=9,
        build_year=2015,
        description="Уютная квартира",
        contact_name="Иван",
        contact_phone="+375291234567",
        status=status,
        favorites_count=0,
    )
    db_session.add(prop)
    db_session.flush()
    db_session.add(
        PropertyPrice(
            property_id=prop.id,
            price_byn=150000,
            price_usd=50000,
            price_per_m2_byn=2500,
            is_current=True,
        )
    )
    db_session.commit()
    db_session.refresh(prop)
    return prop


class TestMonetizationEndpointsDisabled:
    """Пока флаг выключен — платный API закрыт (404)."""

    @pytest.mark.parametrize(
        "method,path",
        [
            ("GET", "/api/v1/monetization/promotions"),
            ("GET", "/api/v1/monetization/plans"),
            ("GET", "/api/v1/monetization/payments"),
            ("GET", "/api/v1/monetization/subscriptions"),
        ],
    )
    def test_public_endpoints_404(
        self, client: TestClient, monetization_off, method, path
    ):
        resp = client.request(method, path)
        assert resp.status_code == 404, resp.text

    def test_promote_404(
        self, client: TestClient, db_session: Session, monetization_off, seed_test_data
    ):
        owner = _add_user(db_session, 9101)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.post(
            f"/api/v1/monetization/properties/{prop.id}/promote",
            json={"promotion_type": "top"},
            headers=_auth_headers(owner),
        )
        assert resp.status_code == 404, resp.text

    def test_subscriptions_create_404(
        self, client: TestClient, db_session: Session, monetization_off, seed_test_data
    ):
        owner = _add_user(db_session, 9102)
        resp = client.post(
            "/api/v1/monetization/subscriptions",
            json={"plan": "pro", "agency_id": 1},
            headers=_auth_headers(owner),
        )
        assert resp.status_code == 404, resp.text


class TestLimitsDisabled:
    """С выключенной монетизацией лимиты, привязанные к подписке, не действуют."""

    def test_active_listing_limit_not_enforced(
        self, client: TestClient, db_session: Session, monetization_off, seed_test_data
    ):
        owner = _add_user(db_session, 9103)
        for _ in range(settings.MAX_ACTIVE_LISTINGS_PER_USER + 2):
            _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        draft = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        with patch("app.services.moderation_service._publish_to_channel"):
            resp = client.post(
                f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(owner)
            )
        assert resp.status_code == 200, resp.text

    def test_property_quota_not_enforced(
        self, client: TestClient, db_session: Session, monetization_off, seed_test_data
    ):
        """Квота агентства по подписке не применяется, пока монетизация выключена."""
        from app.models.user import Agency, AgencyMember
        from app.services.monetization_service import MonetizationService

        owner = _add_user(db_session, 9104)
        agency = Agency(name="Тестовое агентство")
        db_session.add(agency)
        db_session.flush()
        db_session.add(AgencyMember(user_id=owner.id, agency_id=agency.id, role="admin"))
        db_session.commit()

        # Не поднимаем ValueError — квота не применяется.
        MonetizationService.enforce_property_quota(db_session, owner)
