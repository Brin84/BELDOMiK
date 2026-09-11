"""Тесты настроек профиля и приложения (Kufar-стандарт).

- PATCH /auth/me — частичное обновление профиля (имя/фамилия/телефон/«о себе»);
  применяются только переданные поля, 401 без токена, валидация длин (422).
- PATCH /auth/me/settings — настройки приложения: строка user_settings создаётся
  lazy при первом сохранении, частичное обновление не затирает остальное.
- NotificationService учитывает настройки: notify_price_drop / notify_saved_searches
  отключают рассылку конкретному пользователю; без строки настроек — поведение
  как раньше (уведомления включены по умолчанию).
"""
from datetime import timedelta
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.geography import City
from app.models.property import Favorite, Property, PropertyPrice, PropertyStatus, SavedSearch
from app.models.property_types import OperationType, PropertyType
from app.models.user import User, UserSettings
from app.services.notification_service import NotificationService


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


def _add_property(db_session: Session, owner_id: int) -> Property:
    """Минимальное объявление с ценой (для уведомлений)."""
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
        status=PropertyStatus.PUBLISHED,
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


def _add_settings(db_session: Session, user_id: int, **kwargs) -> UserSettings:
    settings = UserSettings(user_id=user_id, **kwargs)
    db_session.add(settings)
    db_session.commit()
    db_session.refresh(settings)
    return settings


class TestUpdateProfile:
    """PATCH /auth/me — редактирование контактов профиля."""

    def test_requires_auth(self, client: TestClient, db_session: Session):
        resp = client.patch("/api/v1/auth/me", json={"first_name": "Иван"})
        assert resp.status_code == 401

    def test_updates_profile_fields(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 4001)

        resp = client.patch(
            "/api/v1/auth/me",
            headers=_auth_headers(user),
            json={"first_name": "Пётр", "last_name": "Петров", "phone": "+375291111111"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["first_name"] == "Пётр"
        assert body["last_name"] == "Петров"
        assert body["phone"] == "+375291111111"

        db_session.refresh(user)
        assert user.first_name == "Пётр"
        assert user.phone == "+375291111111"

    def test_bio_written_to_profile(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        # У пользователя, созданного напрямую, UserProfile отсутствует — роут
        # создаёт его при первой записи bio (как при регистрации).
        user = _add_user(db_session, 4002)

        resp = client.patch(
            "/api/v1/auth/me",
            headers=_auth_headers(user),
            json={"bio": "Помогу с покупкой квартиры в Минске"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["bio"] == "Помогу с покупкой квартиры в Минске"

        db_session.refresh(user)
        assert user.profile is not None
        assert user.profile.bio == "Помогу с покупкой квартиры в Минске"

    def test_partial_update_keeps_other_fields(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 4003)

        resp = client.patch(
            "/api/v1/auth/me",
            headers=_auth_headers(user),
            json={"phone": "+375291222222"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        # touch of only one field must not reset the rest
        assert body["first_name"] == "Тест"
        assert body["username"] == f"user_{4003}"
        assert body["phone"] == "+375291222222"

    def test_too_long_name_is_422(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 4004)

        resp = client.patch(
            "/api/v1/auth/me",
            headers=_auth_headers(user),
            json={"first_name": "Д" * 200},
        )
        assert resp.status_code == 422, resp.text


class TestUpdateSettings:
    """PATCH /auth/me/settings — настройки приложения."""

    def test_requires_auth(self, client: TestClient, db_session: Session):
        resp = client.patch("/api/v1/auth/me/settings", json={"notify_price_drop": True})
        assert resp.status_code == 401

    def test_settings_row_created_on_first_save(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 5001)
        assert db_session.query(UserSettings).filter_by(user_id=user.id).first() is None

        resp = client.patch(
            "/api/v1/auth/me/settings",
            headers=_auth_headers(user),
            json={"notify_price_drop": False},
        )
        assert resp.status_code == 200, resp.text
        settings = resp.json()["settings"]
        assert settings["notify_price_drop"] is False
        assert settings["notify_saved_searches"] is True  # дефолт не тронут

        row = db_session.query(UserSettings).filter_by(user_id=user.id).first()
        assert row is not None
        assert row.notify_price_drop is False

    def test_partial_update_keeps_previous_values(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 5002)
        minsk = db_session.query(City).filter(City.name == "Минск").first()
        _add_settings(
            db_session, user.id, default_city_id=minsk.id, notify_price_drop=False
        )

        resp = client.patch(
            "/api/v1/auth/me/settings",
            headers=_auth_headers(user),
            json={"notify_saved_searches": False},
        )
        assert resp.status_code == 200, resp.text
        settings = resp.json()["settings"]
        assert settings["default_city_id"] == minsk.id
        assert settings["notify_price_drop"] is False
        assert settings["notify_saved_searches"] is False

    def test_set_default_city(
        self, client: TestClient, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 5003)
        minsk = db_session.query(City).filter(City.name == "Минск").first()

        resp = client.patch(
            "/api/v1/auth/me/settings",
            headers=_auth_headers(user),
            json={"default_city_id": minsk.id},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["settings"]["default_city_id"] == minsk.id

        resp = client.patch(
            "/api/v1/auth/me/settings",
            headers=_auth_headers(user),
            json={"default_city_id": None},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["settings"]["default_city_id"] is None


class TestNotificationGating:
    """NotificationService уважает user_settings."""

    def test_price_drop_skipped_when_disabled(
        self, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 6001)
        prop = _add_property(db_session, user.id)
        db_session.add(Favorite(user_id=user.id, property_id=prop.id))
        _add_settings(db_session, user.id, notify_price_drop=False)
        db_session.commit()

        with patch.object(
            NotificationService, "send_telegram_message", new=AsyncMock()
        ) as send:
            count = self._run_price_drop(db_session, prop)
        assert count == 0
        send.assert_not_awaited()

    def test_price_drop_sends_by_default(self, db_session: Session, seed_test_data):
        # Без строки настроек — как раньше: уведомление отправляется.
        user = _add_user(db_session, 6002)
        prop = _add_property(db_session, user.id)
        db_session.add(Favorite(user_id=user.id, property_id=prop.id))
        db_session.commit()

        with patch.object(
            NotificationService, "send_telegram_message",
            new=AsyncMock(return_value=True),
        ) as send:
            count = self._run_price_drop(db_session, prop)
        assert count == 1
        send.assert_awaited()

    def test_new_property_skipped_when_disabled(
        self, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 6003)
        db_session.add(
            SavedSearch(
                user_id=user.id,
                filters_json="{}",
                notify_frequency="daily",
                is_active=True,
            )
        )
        _add_settings(db_session, user.id, notify_saved_searches=False)
        prop = _add_property(db_session, user.id)
        db_session.commit()

        with patch.object(
            NotificationService, "send_telegram_message", new=AsyncMock()
        ) as send:
            count = self._run_new_property(db_session, prop)
        assert count == 0
        send.assert_not_awaited()

    def test_new_property_sends_by_default(
        self, db_session: Session, seed_test_data
    ):
        user = _add_user(db_session, 6004)
        db_session.add(
            SavedSearch(
                user_id=user.id,
                filters_json="{}",
                notify_frequency="daily",
                is_active=True,
            )
        )
        prop = _add_property(db_session, user.id)
        db_session.commit()

        with patch.object(
            NotificationService, "send_telegram_message",
            new=AsyncMock(return_value=True),
        ) as send:
            count = self._run_new_property(db_session, prop)
        assert count == 1
        send.assert_awaited()

    @staticmethod
    def _run_price_drop(db_session: Session, prop: Property) -> int:
        from asyncio import run

        return run(
            NotificationService.notify_price_drop(
                db_session, prop, old_price=150000, new_price=100000
            )
        )

    @staticmethod
    def _run_new_property(db_session: Session, prop: Property) -> int:
        from asyncio import run

        return run(NotificationService.notify_new_property(db_session, prop))