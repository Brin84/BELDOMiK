"""Telegram Bot Webhook routes."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import settings
from app.services.telegram_auth import TelegramAuthService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/webhook", tags=["Webhook"])


@router.post("/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming Telegram webhook updates.

    This endpoint receives updates from Telegram when users interact with the bot.
    """
    # Verify the secret token
    secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if not secret_token or not TelegramAuthService.verify_webhook_secret(secret_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )

    try:
        update = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON",
        )

    # Process the update
    await process_telegram_update(db, update)
    return {"ok": True}


async def process_telegram_update(db: Session, update: dict):
    """Process incoming Telegram update."""
    # Handle different update types
    if "message" in update:
        await handle_message(db, update["message"])
    elif "callback_query" in update:
        await handle_callback_query(db, update["callback_query"])
    # Add more handlers as needed (inline_query, channel_post, etc.)


async def handle_message(db: Session, message: dict):
    """Handle incoming message."""
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    user = message.get("from", {})

    if not chat_id:
        return

    # Handle /start command
    if text.startswith("/start"):
        await handle_start_command(db, chat_id, user, text)

    # Handle other commands
    elif text.startswith("/"):
        # Could add more commands here
        pass


async def handle_start_command(db: Session, chat_id: int, user: dict, text: str):
    """Handle /start command with optional deep link."""
    # Extract deep link parameter if present (e.g., /start property_123)
    parts = text.split(maxsplit=1)
    deep_link = parts[1] if len(parts) > 1 else None

    welcome_text = (
        f"👋 Привет, {user.get('first_name', '')}!\n\n"
        f"Добро пожаловать в <b>BELDOMiK</b> — маркетплейс недвижимости Беларуси.\n\n"
        f"🔍 Ищи квартиры, дома, земли и коммерческие помещения\n"
        f"📍 Удобный поиск по карте и каталогу\n"
        f"❤️ Сохраняй понравившиеся в избранное\n"
        f"⚖️ Сравнивай варианты рядом\n\n"
        f"Нажми кнопку ниже, чтобы открыть приложение:"
    )

    from app.services.notification_service import NotificationService
    await NotificationService.send_telegram_message(
        chat_id=chat_id,
        text=welcome_text,
        reply_markup={
            "inline_keyboard": [
                [{
                    "text": "🏠 Открыть BELDOMiK",
                    "web_app": {"url": settings.TELEGRAM_WEBAPP_URL or "https://t.me/BELDOMiK_BOT/app"}
                }]
            ]
        }
    )

    # If deep link, could redirect to specific property
    # This would be handled by the WebApp itself via startapp parameter


async def handle_callback_query(db: Session, callback_query: dict):
    """Handle inline button callbacks."""
    # For future use (e.g., property actions from notifications)
    pass


@router.get("/set")
async def set_webhook():
    """Set Telegram bot webhook."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token not configured",
        )

    webhook_url = f"{settings.TELEGRAM_WEBAPP_URL.rstrip('/')}/api/v1/webhook/telegram"
    secret_token = settings.TELEGRAM_WEBHOOK_SECRET or settings.TELEGRAM_BOT_TOKEN

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook",
            json={
                "url": webhook_url,
                "secret_token": secret_token,
                "allowed_updates": ["message", "callback_query"],
                "drop_pending_updates": True,
            },
        )
        resp.raise_for_status()
        return resp.json()


@router.get("/delete")
async def delete_webhook():
    """Delete Telegram bot webhook."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token not configured",
        )

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/deleteWebhook",
            json={"drop_pending_updates": True},
        )
        resp.raise_for_status()
        return resp.json()


@router.get("/info")
async def webhook_info():
    """Get current webhook info."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token not configured",
        )

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getWebhookInfo",
        )
        resp.raise_for_status()
        return resp.json()