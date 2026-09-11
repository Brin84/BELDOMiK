"""Тесты Kufar-модели монетизации: удаление (только админ) + лимит активных.

- DELETE /properties/{id} — soft-delete (status → ARCHIVED): доступен владельцу
  и админу; чужое объявление обычному юзеру недоступно (404).
- POST /properties/{id}/submit — лимит одновременных активных объявлений
  (pending_moderation + published) для частных не-админов → 403 при превышении;
  после снятия (archive) слот освобождается.
- POST /properties/{id}/archive — самоснятие владельца (status → ARCHIVED),
  только для своих и только из активных состояний.
"""
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.geography import City
from app.models.monetization import (
    Payment,
    PaymentStatus,
    Promotion,
    PromotionStatus,
    PromotionType,
)
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import AgencyMember, User

# Лимит активных для тестов фиксируется на 3 (ValueError-текст зависит от него).
ACTIVE_LIMIT = 3


@pytest.fixture(autouse=True)
def _active_limit_three(monkeypatch):
    """Тесты построены вокруг лимита 3 — не зависят от env-значения в проде."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_ACTIVE_LISTINGS_PER_USER", ACTIVE_LIMIT)


def _auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


def _add_user(db_session: Session, tg_id: int, *, role: str = "owner") -> User:
    user = User(
        tg_id=tg_id,
        username=f"user_{tg_id}",
        first_name="Тест",
        role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _add_property(
    db_session: Session, owner_id: int, *, status: PropertyStatus
) -> Property:
    """Прямая вставка объявления (без сети) — паттерн из test_properties_list."""
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


class TestDeleteAdminOnly:
    """Удаление объявления — админская возможность (физическое удаление); владелец
    снимает с публикации через archive (мягкое удаление в архив)."""

    def test_owner_deletes_own_property(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 1001)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(owner)
        )
        assert resp.status_code == 200, resp.text
        archived = db_session.get(Property, prop.id)
        assert archived.status is PropertyStatus.ARCHIVED
        assert archived.archived_at is not None

    def test_other_user_cannot_delete(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 1002)
        stranger = _add_user(db_session, 1003)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(stranger)
        )
        assert resp.status_code == 404, resp.text
        assert db_session.get(Property, prop.id).status is PropertyStatus.PUBLISHED

    def test_admin_deletes_any_property(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 1004)
        admin = _add_user(db_session, 1005, role="admin")
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(admin)
        )
        # Админское «Удалить» = физическое удаление (не архивация).
        assert resp.status_code == 200, resp.text
        assert db_session.get(Property, prop.id) is None

    def test_admin_deletes_already_archived(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 1006)
        admin = _add_user(db_session, 1007, role="admin")
        prop = _add_property(db_session, owner.id, status=PropertyStatus.ARCHIVED)

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(admin)
        )
        assert resp.status_code == 200, resp.text
        assert db_session.get(Property, prop.id) is None

    def test_admin_deletes_property_with_payments(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        """Админское удаление работает даже при наличии платежей (payments).

        В PostgreSQL FK ON DELETE CASCADE удалит и платежи; в SQLite тест
        проверяет только то, что эндпоинт не падает.
        """
        owner = _add_user(db_session, 1008)
        admin = _add_user(db_session, 1009, role="admin")
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        db_session.add(
            Payment(
                property_id=prop.id,
                user_id=owner.id,
                amount_byn=500,
                status=PaymentStatus.PENDING,
            )
        )
        db_session.commit()

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(admin)
        )
        assert resp.status_code == 200, resp.text
        assert db_session.get(Property, prop.id) is None

    def test_admin_deletes_property_with_payments(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        """Админское удаление работает даже при наличии связанных платежей.

        В PostgreSQL FK ON DELETE CASCADE (миграция 34f6a5d9b0c1) удалит и
        платежи. SQLite в тестах не исполняет FK — проверяем только прикладной
        путь: 200 + запись удалена. Каскад валиден на проде.
        """
        owner = _add_user(db_session, 1010)
        admin = _add_user(db_session, 1011, role="admin")
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        db_session.add(
            Payment(
                property_id=prop.id,
                user_id=owner.id,
                amount_byn=500,
                status=PaymentStatus.PENDING,
            )
        )
        db_session.commit()

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(admin)
        )
        assert resp.status_code == 200, resp.text
        assert db_session.get(Property, prop.id) is None

    def test_admin_deletes_property_with_promotion_payment(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        """Платёж, привязанный к промо (payments.promotion_id), не блокирует
        админское удаление.

        Удаление объявления каскадит на promotions (property_id), а платёж за
        продвижение должен уйти вместе с промо (fk_payments_promotion_id с
        ON DELETE CASCADE, миграция 44f6c7e0b2d2). SQLite FK не исполняет —
        проверяем прикладной путь; каскад валиден на проде (PostgreSQL).
        """
        owner = _add_user(db_session, 1012)
        admin = _add_user(db_session, 1013, role="admin")
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        promo = Promotion(
            property_id=prop.id,
            type=PromotionType.TOP,
            price_byn=200,
            status=PromotionStatus.ACTIVE,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        db_session.add(promo)
        db_session.flush()
        db_session.add(
            Payment(
                property_id=prop.id,
                promotion_id=promo.id,
                user_id=owner.id,
                amount_byn=200,
                status=PaymentStatus.SUCCEEDED,
            )
        )
        db_session.commit()

        resp = client.delete(
            f"/api/v1/properties/{prop.id}", headers=_auth_headers(admin)
        )
        assert resp.status_code == 200, resp.text
        assert db_session.get(Property, prop.id) is None


class TestActiveListingLimit:
    """Лимит одновременных активных объявлений для частных не-админов."""

    def test_submit_over_limit_returns_403(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 2001)
        for _ in range(ACTIVE_LIMIT):
            _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        draft = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        resp = client.post(
            f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(owner)
        )
        assert resp.status_code == 403, resp.text
        assert "лимит активных объявлений" in resp.json()["detail"]
        assert "PRO" in resp.json()["detail"]

    def test_slot_freed_after_archive(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 2002)
        active = [
            _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
            for _ in range(ACTIVE_LIMIT)
        ]
        draft = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        # Снятие одного активного освобождает слот → подача снова проходит.
        resp = client.post(
            f"/api/v1/properties/{active[0].id}/archive", headers=_auth_headers(owner)
        )
        assert resp.status_code == 200, resp.text

        with patch("app.services.moderation_service._publish_to_channel"):
            resp = client.post(
                f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(owner)
            )
        assert resp.status_code == 200, resp.text

    def test_draft_rejected_archived_do_not_occupy_slot(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 2003)
        # 2 активных + отклонённое + черновик: лимит (3) не превышен.
        for _ in range(ACTIVE_LIMIT - 1):
            _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        _add_property(db_session, owner.id, status=PropertyStatus.REJECTED)
        draft = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        with patch("app.services.moderation_service._publish_to_channel"):
            resp = client.post(
                f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(owner)
            )
        assert resp.status_code == 200, resp.text

    def test_drafts_do_not_raise_the_limit(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        # 3 активных + 2 черновика: черновики слот не дают → 403.
        owner = _add_user(db_session, 2004)
        for _ in range(ACTIVE_LIMIT):
            _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)
        for _ in range(2):
            _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)
        draft = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        resp = client.post(
            f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(owner)
        )
        assert resp.status_code == 403, resp.text

    def test_admin_bypasses_limit(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        admin = _add_user(db_session, 2005, role="admin")
        for _ in range(ACTIVE_LIMIT + 2):
            _add_property(db_session, admin.id, status=PropertyStatus.PUBLISHED)
        draft = _add_property(db_session, admin.id, status=PropertyStatus.DRAFT)

        with patch("app.services.moderation_service._publish_to_channel"):
            resp = client.post(
                f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(admin)
            )
        assert resp.status_code == 200, resp.text

    def test_agency_member_not_limited(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        # Участника агентства пер-юзерный лимит не касается (квота подписки).
        agent = _add_user(db_session, 2006)
        db_session.add(AgencyMember(user_id=agent.id, agency_id=1, role="agent"))
        db_session.commit()
        for _ in range(ACTIVE_LIMIT + 2):
            _add_property(db_session, agent.id, status=PropertyStatus.PUBLISHED)
        draft = _add_property(db_session, agent.id, status=PropertyStatus.DRAFT)

        with patch("app.services.moderation_service._publish_to_channel"):
            resp = client.post(
                f"/api/v1/properties/{draft.id}/submit", headers=_auth_headers(agent)
            )
        assert resp.status_code == 200, resp.text


class TestArchive:
    """Самоснятие владельца с публикации (освобождает слот лимита)."""

    def test_owner_archives_own_published(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 3001)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.post(
            f"/api/v1/properties/{prop.id}/archive", headers=_auth_headers(owner)
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "archived"
        assert db_session.get(Property, prop.id).status is PropertyStatus.ARCHIVED

    def test_archive_own_draft_is_404(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        # Неопубликованное нельзя «снять с публикации».
        owner = _add_user(db_session, 3002)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.DRAFT)

        resp = client.post(
            f"/api/v1/properties/{prop.id}/archive", headers=_auth_headers(owner)
        )
        assert resp.status_code == 404, resp.text
        assert db_session.get(Property, prop.id).status is PropertyStatus.DRAFT

    def test_archive_foreign_property_is_404(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        owner = _add_user(db_session, 3003)
        stranger = _add_user(db_session, 3004)
        prop = _add_property(db_session, owner.id, status=PropertyStatus.PUBLISHED)

        resp = client.post(
            f"/api/v1/properties/{prop.id}/archive", headers=_auth_headers(stranger)
        )
        assert resp.status_code == 404, resp.text
        assert db_session.get(Property, prop.id).status is PropertyStatus.PUBLISHED