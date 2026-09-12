"""Chat (conversations & messages) schemas."""
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class ConversationStart(BaseSchema):
    """Старт переписки по объявлению (find-or-create).

    text — необязательное первое сообщение: используется для «Написать» из
    карточки, чтобы обращение не оставалось пустым диалогом.
    """

    property_id: int
    text: str | None = Field(None, min_length=1, max_length=2000)


class ConversationRead(BaseSchema):
    """Строка списка чатов: собеседник, объявление и хвост переписки."""

    id: int
    property_id: int
    property_title: str | None = None
    property_photo_url: str | None = None
    counterpart_id: int
    counterpart_name: str
    counterpart_username: str | None = None
    last_message_text: str | None = None
    last_message_at: datetime
    unread_count: int = 0
    created_at: datetime


class ChatMessageRead(BaseSchema):
    """Сообщение диалога."""

    id: int
    conversation_id: int
    sender_id: int
    text: str
    created_at: datetime
    read_at: datetime | None = None
    is_mine: bool = False


class ChatMessageCreate(BaseSchema):
    """Текст нового сообщения."""

    text: str = Field(..., min_length=1, max_length=2000)


class ConversationDetail(ConversationRead):
    """Диалог целиком: шапка + история сообщений (по возрастанию времени)."""

    messages: list[ChatMessageRead] = Field(default_factory=list)


class UnreadCountRead(BaseSchema):
    """Число непрочитанных сообщений — для бейджа в нижней навигации."""

    unread_count: int
