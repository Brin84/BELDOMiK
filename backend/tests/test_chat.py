"""Tests for in-app buyer↔seller chats (Kufar-model)."""
import pytest
from sqlalchemy.orm import Session

from app.models.geography import City, Region
from app.models.property import Property, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.chat_service import ChatService


@pytest.fixture(autouse=True)
def _no_telegram(monkeypatch):
    """Чаты шлют Telegram-уведомления получателю — в тестах это no-op."""

    from app.services.notification_service import NotificationService

    async def _noop(*args, **kwargs) -> bool:
        return True

    monkeypatch.setattr(NotificationService, "send_telegram_message", _noop)


@pytest.fixture
def chat_buyer(db_session: Session) -> User:
    """Покупатель — инициатор переписки."""
    user = User(
        tg_id=800000001,
        username="chat_buyer",
        first_name="Buyer",
        last_name="One",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def chat_owner(db_session: Session) -> User:
    """Продавец — владелец объявления."""
    user = User(
        tg_id=800000002,
        username="chat_owner",
        first_name="Owner",
        last_name="Two",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def chat_property(db_session: Session, chat_owner: User) -> Property:
    """Объявление продавца (published), чтобы открыть по нему переписку."""
    region = Region(name="Chat Region", sort_order=1)
    db_session.add(region)
    db_session.commit()

    city = City(name="Chat City", region_id=region.id, is_major=True, sort_order=1)
    db_session.add(city)
    db_session.commit()

    prop_type = PropertyType(
        category="apartment",
        name="Chat Apartment",
        name_en="Chat Apartment",
        name_plural="Chat Apartments",
        icon="apartment",
        sort_order=1,
        is_active=True,
    )
    db_session.add(prop_type)
    db_session.commit()

    op_type = OperationType(
        name="Sale", name_en="Sale", name_plural="Sales", sort_order=1, is_active=True
    )
    db_session.add(op_type)
    db_session.commit()

    property_obj = Property(
        owner_id=chat_owner.id,
        type_id=prop_type.id,
        operation_id=op_type.id,
        city_id=city.id,
        address="Chat Address 1",
        total_area=42.0,
        status=PropertyStatus.PUBLISHED,
        favorites_count=0,
    )
    db_session.add(property_obj)
    db_session.commit()
    db_session.refresh(property_obj)
    return property_obj


class TestChatService:
    """Логика диалогов: старт, сообщения, мягкое удаление, счётчик."""

    def test_get_or_create_creates_conversation(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        conversation = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert conversation is not None
        assert conversation.buyer_id == chat_buyer.id
        assert conversation.seller_id == chat_property.owner_id
        assert conversation.buyer_deleted_at is None

    def test_get_or_create_is_idempotent(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        first = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        second = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert first is not None and second is not None
        assert first.id == second.id

    def test_get_or_create_own_property_rejected(
        self, db_session: Session, chat_owner: User, chat_property: Property
    ):
        # Владелец писать себе не может.
        assert ChatService.get_or_create(db_session, chat_owner.id, chat_property.id) is None

    def test_get_or_create_missing_property_rejected(
        self, db_session: Session, chat_buyer: User
    ):
        assert ChatService.get_or_create(db_session, chat_buyer.id, 999999) is None

    def test_send_message_updates_tail_and_unread(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        conversation = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert conversation is not None
        message, conversation = ChatService.send_message(
            db_session, conversation.id, chat_buyer.id, "Привет!"
        )
        assert message.text == "Привет!"
        assert conversation.last_message_text == "Привет!"
        assert ChatService.unread_total(db_session, chat_property.owner_id) == 1
        # Отправитель свои же сообщения непрочитанными не считает.
        assert ChatService.unread_total(db_session, chat_buyer.id) == 0

    def test_list_messages_marks_incoming_read(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        conversation = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert conversation is not None
        ChatService.send_message(db_session, conversation.id, chat_buyer.id, "Привет!")

        history = ChatService.list_messages(
            db_session, conversation.id, chat_property.owner_id
        )
        assert history is not None and len(history) == 1
        assert history[0].read_at is not None
        assert ChatService.unread_total(db_session, chat_property.owner_id) == 0

    def test_delete_hides_only_for_the_deleting_side(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        conversation = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert conversation is not None

        assert ChatService.delete_conversation(db_session, conversation.id, chat_buyer.id)
        rows, total = ChatService.list_conversations(db_session, chat_buyer.id)
        assert total == 0 and rows == []

        # Продавец переписку по-прежнему видит.
        rows, total = ChatService.list_conversations(db_session, chat_property.owner_id)
        assert total == 1 and rows[0]["id"] == conversation.id

    def test_outside_user_cannot_access_conversation(
        self, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        conversation = ChatService.get_or_create(db_session, chat_buyer.id, chat_property.id)
        assert conversation is not None
        outsider = User(tg_id=800000003, username="chat_outsider", first_name="Out")
        db_session.add(outsider)
        db_session.commit()

        assert ChatService.get_for_user(db_session, conversation.id, outsider.id) is None
        assert ChatService.send_message(db_session, conversation.id, outsider.id, "Хак") is None
        assert ChatService.delete_conversation(db_session, conversation.id, outsider.id) is False


class TestChatAPI:
    """Эндпоинты /api/v1/messages."""

    def _auth(self, app, user: User):
        from app.api.dependencies import get_current_user

        app.dependency_overrides[get_current_user] = lambda: user

    def test_start_conversation_and_send(
        self, client, chat_buyer: User, chat_property: Property
    ):
        from app.main import app

        self._auth(app, chat_buyer)
        response = client.post(
            "/api/v1/messages",
            json={"property_id": chat_property.id, "text": "Здравствуйте!"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["counterpart_id"] == chat_property.owner_id
        assert data["last_message_text"] == "Здравствуйте!"

        # История видна покупателю, is_mine проставлен корректно.
        detail = client.get(f"/api/v1/messages/{data['id']}")
        assert detail.status_code == 200
        messages = detail.json()["messages"]
        assert len(messages) == 1
        assert messages[0]["is_mine"] is True
        assert messages[0]["text"] == "Здравствуйте!"

        app.dependency_overrides.clear()

    def test_unread_count_for_seller(
        self, client, chat_buyer: User, chat_owner: User, chat_property: Property
    ):
        from app.main import app

        self._auth(app, chat_buyer)
        created = client.post(
            "/api/v1/messages", json={"property_id": chat_property.id}
        ).json()

        # Продавец не читал — бейдж = 0 (сообщений ещё не было).
        self._auth(app, chat_owner)
        unread = client.get("/api/v1/messages/unread-count")
        assert unread.status_code == 200
        assert unread.json()["unread_count"] == 0

        # Покупатель пишет — остаётся одно непрочитанное у продавца.
        self._auth(app, chat_buyer)
        sent = client.post(f"/api/v1/messages/{created['id']}/messages", json={"text": "Привет"})
        assert sent.status_code == 201

        self._auth(app, chat_owner)
        unread_after = client.get("/api/v1/messages/unread-count")
        assert unread_after.json()["unread_count"] == 1

        # Продавец открывает диалог → входящее прочитано.
        detail = client.get(f"/api/v1/messages/{created['id']}")
        assert detail.status_code == 200
        assert detail.json()["unread_count"] == 0

        app.dependency_overrides.clear()

    def test_self_chat_returns_own_property_message(
        self, client, chat_owner: User, chat_property: Property
    ):
        from app.main import app

        # Владелец пытается «написать» себе — не 404 с общим текстом, а явная
        # причина, которую фронт показывает тостом (никакого внешнего Telegram).
        self._auth(app, chat_owner)
        response = client.post(
            "/api/v1/messages", json={"property_id": chat_property.id}
        )
        assert response.status_code == 404
        assert "ваше объявление" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_messages_require_auth(self, client):
        assert client.get("/api/v1/messages").status_code == 401
        assert client.get("/api/v1/messages/unread-count").status_code == 401

    def test_outsider_cannot_read_conversation(
        self, client, db_session: Session, chat_buyer: User, chat_property: Property
    ):
        from app.main import app

        self._auth(app, chat_buyer)
        created = client.post(
            "/api/v1/messages", json={"property_id": chat_property.id}
        ).json()

        # Третий пользователь не участник диалога — доступ закрыт и на чтение,
        # и на отправку. Переключаем авторизацию, но НЕ чистим overrides целиком:
        # get_db подменяет фикстура client и её удаление ломает сессию запросов.
        outsider = User(tg_id=800000003, username="api_outsider", first_name="Api")
        db_session.add(outsider)
        db_session.commit()

        self._auth(app, outsider)
        assert client.get(f"/api/v1/messages/{created['id']}").status_code == 404
        assert (
            client.post(
                f"/api/v1/messages/{created['id']}/messages", json={"text": "Хак"}
            ).status_code
            == 404
        )
        # Участник по-прежнему имеет доступ — переписка не тронута.
        self._auth(app, chat_buyer)
        assert client.get(f"/api/v1/messages/{created['id']}").status_code == 200

        app.dependency_overrides.clear()

    def test_delete_conversation_endpoint(
        self, client, chat_buyer: User, chat_property: Property
    ):
        from app.main import app

        self._auth(app, chat_buyer)
        created = client.post(
            "/api/v1/messages", json={"property_id": chat_property.id}
        ).json()

        deleted = client.delete(f"/api/v1/messages/{created['id']}")
        assert deleted.status_code == 200

        # После удаления чат не виден покупателю.
        detail = client.get(f"/api/v1/messages/{created['id']}")
        assert detail.status_code == 404
        assert client.get("/api/v1/messages").json() == []

        app.dependency_overrides.clear()