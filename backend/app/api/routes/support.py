"""Support routes — обращение в поддержку напрямую из MiniApp."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_support_message(
    text: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Отправить сообщение в поддержку.

    Сообщение уходит администраторам бота в Telegram в виде личного
    сообщения от бота. Ответ виден только администраторам.
    Сообщение содержит имя пользователя, его username и текст обращения.
    """
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сообщение не может быть пустым",
        )

    text = text.strip()
    if len(text) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сообщение слишком длинное (максимум 2000 символов)",
        )

    # Формируем текст обращения для админа
    user_info = []
    if current_user.first_name:
        user_info.append(current_user.first_name)
    if current_user.last_name:
        user_info.append(current_user.last_name)
    name = " ".join(user_info) or "Неизвестный"

    username = f"@{current_user.username}" if current_user.username else "без username"
    user_id = current_user.id
    tg_id = current_user.tg_id or "—"

    message_lines = [
        "📩 <b>Обращение в поддержку BELDOMiK</b>",
        "",
        f"👤 {name}",
        f"🌐 {username}",
        f"🆔 ID: {user_id}",
        f"💬 TG: {tg_id}",
        "",
        "💬 <b>Сообщение:</b>",
        text,
    ]
    admin_text = "\n".join(message_lines)

    # Inline-кнопка «Ответить» — открывает MiniApp в режиме поддержки
    deep_link = NotificationService.miniapp_deep_link("support")
    reply_markup = {
        "inline_keyboard": [
            [{"text": "💬 Ответить в чат", "web_app": {"url": deep_link}}],
        ]
    }

    # Отправляем всем админам
    from app.core.config import settings
    import logging

    logger = logging.getLogger(__name__)
    admin_ids = settings.ADMIN_IDS or []

    if not admin_ids:
        # ADMIN_IDS не настроен — логируем обращение (dev / initial setup)
        logger.info(
            "Support message from user %s (%s): %s",
            current_user.id,
            getattr(current_user, "username", "—"),
            text[:200],
        )
        return MessageResponse(
            message="Обращение отправлено. Мы ответим вам в ближайшее время."
        )

    sent = 0
    for admin_id in admin_ids:
        ok = await NotificationService.send_telegram_message(
            chat_id=admin_id,
            text=admin_text,
            reply_markup=reply_markup,
        )
        if ok:
            sent += 1

    if sent == 0:
        logger.warning(
            "Support: не удалось отправить обращение ни одному админу "
            "(user=%s)",
            current_user.id,
        )

    return MessageResponse(
        message="Обращение отправлено. Мы ответим вам в ближайшее время."
    )
