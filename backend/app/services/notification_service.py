"""Telegram notification service."""
import logging

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.property import Favorite, Property, SavedSearch, SearchNotification
from app.models.user import User

logger = logging.getLogger(__name__)


class NotificationService:
    """Send Telegram notifications for new properties and price changes."""

    @staticmethod
    async def send_telegram_message(
        chat_id: int,
        text: str,
        parse_mode: str = "HTML",
        reply_markup: dict | None = None,
    ) -> bool:
        """Send a message via Telegram Bot API."""
        if not settings.TELEGRAM_BOT_TOKEN:
            logger.warning("Telegram bot token not configured")
            return False

        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return True
        except Exception as e:
            logger.exception(
                "Failed to send Telegram message",
                extra={"error": str(e), "chat_id": chat_id},
            )
            return False

    @staticmethod
    def format_property_notification(
        property_obj: Property, price_byn: int, price_usd: int | None
    ) -> tuple[str, dict]:
        """Format property notification message."""
        type_name = property_obj.type.name if property_obj.type else "Недвижимость"
        city_name = property_obj.city.name if property_obj.city else ""

        price_text = f"{price_byn:,} BYN".replace(",", " ")
        if price_usd:
            price_text += f" ≈ ${price_usd:,}".replace(",", " ")

        area_text = f"{property_obj.total_area} м²" if property_obj.total_area else ""

        text = (
            f"🏠 <b>BELDOMiK</b> нашёл новый вариант\n\n"
            f"<b>{type_name}</b>\n"
            f"{area_text}\n"
            f"📍 {city_name}\n"
            f"<b>{price_text}</b>\n"
        )

        # Inline keyboard with View button
        deep_link = f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}/app?startapp=property_{property_obj.id}"
        reply_markup = {
            "inline_keyboard": [
                [{"text": "👀 Посмотреть", "url": deep_link}],
            ]
        }

        return text, reply_markup

    @staticmethod
    async def notify_new_property(db: Session, property_obj: Property) -> int:
        """Notify users with matching saved searches about new property."""
        current_price = property_obj.prices[0] if property_obj.prices else None
        if not current_price:
            return 0

        # Find matching searches (simplified - could be more complex)
        matching_searches = db.query(SavedSearch).filter(
            SavedSearch.is_active == True,
            SavedSearch.notify_frequency.in_(["instant", "daily"]),
        ).all()

        sent_count = 0
        for search in matching_searches:
            # TODO: Implement filter matching logic
            # For now, just notify all active searches (will be improved)
            user = db.query(User).filter(User.id == search.user_id).first()
            if user and user.tg_id:
                text, markup = NotificationService.format_property_notification(
                    property_obj, current_price.price_byn, current_price.price_usd
                )
                success = await NotificationService.send_telegram_message(
                user.tg_id, text, reply_markup=markup
            )
                if success:
                    NotificationService.record_notification(db, search.id, property_obj.id)
                    sent_count += 1

        return sent_count

    @staticmethod
    async def notify_price_drop(
        db: Session, property_obj: Property, old_price: int, new_price: int
    ) -> int:
        """Notify users who favorited this property about price drop."""
        if new_price >= old_price:
            return 0

        favorites = db.query(Favorite).filter(Favorite.property_id == property_obj.id).all()
        sent_count = 0

        for fav in favorites:
            user = db.query(User).filter(User.id == fav.user_id).first()
            if user and user.tg_id:
                drop = old_price - new_price
                drop_pct = round((drop / old_price) * 100, 1)

                text = (
                    f"📉 <b>Цена снижена!</b>\n\n"
                    f"{property_obj.type.name if property_obj.type else 'Недвижимость'}\n"
                    f"{property_obj.city.name if property_obj.city else ''}\n"
                    f"Было: {old_price:,} BYN\n"
                    f"Стало: <b>{new_price:,} BYN</b> (-{drop} BYN, {drop_pct}%)\n"
                ).replace(",", " ")

                deep_link = f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}/app?startapp=property_{property_obj.id}"
                reply_markup = {
                    "inline_keyboard": [
                        [{"text": "👀 Посмотреть", "url": deep_link}],
                    ]
                }

                success = await NotificationService.send_telegram_message(
                    user.tg_id, text, reply_markup=reply_markup
                )
                if success:
                    sent_count += 1

        return sent_count

    @staticmethod
    def record_notification(
        db: Session, search_id: int, property_id: int, status: str = "sent"
    ) -> SearchNotification:
        """Record a notification."""
        notification = SearchNotification(
            search_id=search_id,
            property_id=property_id,
            status=status,
        )
        db.add(notification)
        db.commit()
        return notification