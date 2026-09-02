"""Telegram notification service."""
import asyncio
import html
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
        chat_id: int | str,
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

    # ── Telegram channel (автопубликация объявлений) ─────────────

    @staticmethod
    def channel_chat_id() -> str | None:
        """Channel @username derived from CHANNEL_URL.

        Bot API принимает @username как chat_id. Возвращает None, если
        CHANNEL_URL не задан или не похож на t.me/... — тогда постинг
        тихо пропускается (канал — опциональная фича).
        """
        if not settings.CHANNEL_URL:
            return None
        path = settings.CHANNEL_URL.rstrip("/").rsplit("/", 1)[-1]
        if not path or path.startswith("c/") or path.isdigit():
            return None
        return f"@{path}"

    @staticmethod
    async def send_photo(
        chat_id: int | str,
        photo_url: str,
        caption: str,
        reply_markup: dict | None = None,
    ) -> dict:
        """Send a photo by public URL to a chat (returns raw Bot API response)."""
        if not settings.TELEGRAM_BOT_TOKEN:
            return {"ok": False, "error_code": "no_token"}
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto"
        payload = {
            "chat_id": chat_id,
            "photo": photo_url,
            "caption": caption,
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            return resp.json()

    @staticmethod
    def build_channel_caption(
        *,
        type_name: str,
        operation_name: str,
        city_name: str,
        district_name: str,
        price_byn: int | None,
        price_usd: int | None,
        total_area: float | None,
        rooms_count: int | None,
        description: str | None,
    ) -> str:
        """Карточка объявления для канала (HTML-подписи)."""
        lines = [f"🏢 <b>{html.escape(type_name or 'Недвижимость')}</b>"]
        if operation_name:
            lines.append(f"🔄 {html.escape(operation_name)}")

        loc = ", ".join(x for x in [city_name, district_name] if x)
        if loc:
            lines.append(f"📍 {html.escape(loc)}")

        if price_byn:
            price_text = f"{price_byn:,} BYN".replace(",", " ")
            if price_usd:
                price_text += f" ≈ ${price_usd:,}".replace(",", " ")
            lines.append(f"💰 <b>{price_text}</b>")

        if total_area:
            area = f"{total_area:g} м²"
            if rooms_count:
                area += f", {rooms_count} комн."
            lines.append(f"📐 {area}")

        if description:
            desc = html.escape(description)
            if len(desc) > 180:
                desc = desc[:180].rstrip() + "…"
            lines.append(f"📝 {desc}")

        return "\n".join(lines)

    @staticmethod
    async def post_property_to_channel(
        *,
        property_id: int,
        type_name: str,
        operation_name: str,
        city_name: str,
        district_name: str,
        price_byn: int | None,
        price_usd: int | None,
        total_area: float | None,
        rooms_count: int | None,
        description: str | None,
        photo_url: str | None,
    ) -> bool:
        """Карточка нового объявления в промо-канал (best-effort).

        Дублирует публикацию на канал при одобрении модерации. Кнопка
        открывает Mini App на конкретном объявлении через startapp-ссылку.
        Намеренно НЕ web_app-кнопка: по спецификации Bot API web_app-кнопки
        работают только в приватных чатах и отклоняются в каналах. При любой
        ошибке (нет фото, 403, сеть) не бросаем исключение — автопостинг не
        должен ломать модерацию. Резервно дублируем текстом без фото.
        """
        chat_id = NotificationService.channel_chat_id()
        if not chat_id:
            return False

        caption = NotificationService.build_channel_caption(
            type_name=type_name,
            operation_name=operation_name,
            city_name=city_name,
            district_name=district_name,
            price_byn=price_byn,
            price_usd=price_usd,
            total_area=total_area,
            rooms_count=rooms_count,
            description=description,
        )
        deep_link = (
            f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}/app"
            f"?startapp=property_{property_id}"
        )
        keyboard = {
            "inline_keyboard": [
                [{"text": "👀 Открыть объявление", "url": deep_link}],
            ]
        }

        try:
            if photo_url:
                try:
                    result = await NotificationService.send_photo(
                        chat_id, photo_url, caption, keyboard
                    )
                except Exception:
                    logger.warning(
                        "Канал: sendPhoto упал, дублируем текстом", exc_info=True
                    )
                    result = {"ok": False}
                if result.get("ok"):
                    return True
                logger.warning(
                    "Канал: sendPhoto не удался (%s), дублируем текстом",
                    result.get("error_code"),
                )
            await NotificationService.send_telegram_message(
                chat_id, caption, reply_markup=keyboard
            )
            return True
        except Exception:
            logger.exception("Автопостинг объявления в канал не удался")
            return False

    @staticmethod
    def post_property_to_channel_sync(**kwargs) -> bool:
        """Синхронная обёртка для вызова из sync-контекста (модерация)."""
        try:
            return asyncio.run(NotificationService.post_property_to_channel(**kwargs))
        except Exception:
            logger.exception("Автопостинг объявления в канал (sync) не удался")
            return False

    @staticmethod
    async def post_channel_welcome() -> bool:
        """Приветственное сообщение в промо-канал (best-effort)."""
        chat_id = NotificationService.channel_chat_id()
        if not chat_id:
            logger.warning("Приветствие в канал: CHANNEL_URL не настроен")
            return False

        text = (
            "🎉 <b>BELDOMiK</b> — недвижимость Беларуси 🇧🇾\n\n"
            "В этом канале публикуются все новые объявления:\n"
            "🏢 Квартиры и дома\n"
            "🌍 Земельные участки\n"
            "🏪 Коммерческая недвижимость\n\n"
            "🔔 Включите уведомления, чтобы не пропустить свежие варианты!"
        )
        keyboard = {
            "inline_keyboard": [
                [{
                    "text": "🏠 Открыть BELDOMiK",
                    "url": f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}/app",
                }],
            ]
        }
        return await NotificationService.send_telegram_message(
            chat_id, text, reply_markup=keyboard
        )

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