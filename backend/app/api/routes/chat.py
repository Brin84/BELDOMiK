"""Chat routes — переписка покупателя с продавцом по объявлению.

Вкладка «Сообщения» в нижней навигации + кнопка «Написать» в карточке.
История сохраняется, пока пользователь сам не удалит чат (мягкое скрытие).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ConversationDetail,
    ConversationRead,
    ConversationStart,
    UnreadCountRead,
)
from app.schemas.common import MessageResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("", response_model=list[ConversationRead])
def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список чатов пользователя: свежие переписки сверху."""
    rows, _total = ChatService.list_conversations(db, current_user.id, page, page_size)
    return [ConversationRead.model_validate(row) for row in rows]


@router.get("/unread-count", response_model=UnreadCountRead)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Непрочитанные сообщения во всех диалогах (для бейджа в меню)."""
    return UnreadCountRead(unread_count=ChatService.unread_total(db, current_user.id))


@router.post("", response_model=ConversationRead, status_code=201)
async def start_conversation(
    data: ConversationStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Открыть переписку по объявлению: создаётся при первом обращении."""
    conversation = ChatService.get_or_create(db, current_user.id, data.property_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Объявление недоступно для переписки")

    if data.text:
        sent = ChatService.send_message(db, conversation.id, current_user.id, data.text)
        if sent is not None:
            message, conversation = sent
            await ChatService.notify_new_message(db, message, conversation)

    return ConversationRead.model_validate(
        ChatService.describe(db, conversation, current_user.id)
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Диалог с историей; при открытии входящие помечаются прочитанными."""
    conversation = ChatService.get_for_user(db, conversation_id, current_user.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Чат не найден")

    messages = ChatService.list_messages(db, conversation_id, current_user.id)
    header = ChatService.describe(db, conversation, current_user.id)
    return ConversationDetail.model_validate(
        {
            **header,
            "messages": ChatService.serialize_messages(messages or [], current_user.id),
        }
    )


@router.post("/{conversation_id}/messages", response_model=ChatMessageRead, status_code=201)
async def send_message(
    conversation_id: int,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить сообщение в диалог (только его участник)."""
    sent = ChatService.send_message(db, conversation_id, current_user.id, data.text)
    if sent is None:
        raise HTTPException(status_code=404, detail="Чат не найден")
    message, conversation = sent
    await ChatService.notify_new_message(db, message, conversation)
    return ChatMessageRead.model_validate(
        ChatService.serialize_messages([message], current_user.id)[0]
    )


@router.delete("/{conversation_id}", response_model=MessageResponse)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Скрыть чат у себя; у собеседника переписка сохраняется."""
    if not ChatService.delete_conversation(db, conversation_id, current_user.id):
        raise HTTPException(status_code=404, detail="Чат не найден")
    return MessageResponse(message="Чат удалён")