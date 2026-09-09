"""Автомодерация объявлений по стандартным правилам.

При подаче объявления на модерацию объявление прогоняется через стандартные
правила: обязательные поля, фото, цена, описание, разумные параметры и
запрещённые контакты/ссылки. Если правила пройдены — объявление публикуется
сразу (PUBLISHED) и публикуется в Telegram-канал. Если нет — отклоняется
(REJECTED) с человекочитаемой причиной, которая сохраняется в
`Property.moderation_reason` и показывается пользователю.
"""
import logging
import re

from app.models.property import Property

logger = logging.getLogger(__name__)

# Контактные данные и ссылки, запрещённые в объявлении: телефоны, email,
# ссылки на мессенджеры/соцсети, упоминания @nickname.
_PHONE_RE = re.compile(
    r"(?:\+\d[\d\s()\-]{8,}\d|\b\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b)"
)
_URL_RE = re.compile(
    r"(?:https?://|www\.|t\.me/|wa\.me/|viber|whatsapp|instagram|"
    r"vk\.com|ok\.ru|facebook|fb\.com|telegram|tiktok|youtube|"
    r"@[A-Za-z0-9_]{4,32})",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

MIN_DESCRIPTION_LEN = 10
MIN_PHOTOS = 1


def check_standard_rules(property_obj: Property) -> list[str]:
    """Проверить объявление по стандартным правилам автомодерации.

    Возвращает список причин, по которым объявление НЕ проходит проверку.
    Пустой список — объявление корректно построено и попадает в категорию
    «прошла проверка» (автопубликация).
    """
    issues: list[str] = []

    if not property_obj.type_id:
        issues.append("Не указан тип недвижимости")
    if not property_obj.operation_id:
        issues.append("Не указан тип сделки")
    if not property_obj.city_id:
        issues.append("Не указан город")

    # Цена живёт в отдельной таблице PropertyPrice (в properties колонки
    # price нет). Актуальная цена — запись с is_current либо первая.
    price = property_obj.prices[0] if property_obj.prices else None
    if not price or not price.price_byn or price.price_byn <= 0:
        issues.append("Укажите корректную цену")

    if not property_obj.photos or len(property_obj.photos) < MIN_PHOTOS:
        issues.append("Добавьте хотя бы одну фотографию")

    description = (property_obj.description or "").strip()
    if len(description) < MIN_DESCRIPTION_LEN:
        issues.append(f"Добавьте описание (минимум {MIN_DESCRIPTION_LEN} символов)")

    # Разумные диапазоны параметров — защита от опечаток и мусорных данных.
    if property_obj.total_area is not None and not 1 <= property_obj.total_area <= 10000:
        issues.append("Укажите корректную общую площадь")
    if property_obj.rooms_count is not None and not 0 <= property_obj.rooms_count <= 50:
        issues.append("Укажите корректное количество комнат")
    if property_obj.floor is not None and property_obj.floor < 1:
        issues.append("Укажите корректный этаж")
    if (
        property_obj.total_floors is not None
        and not 1 <= property_obj.total_floors <= 200
    ):
        issues.append("Укажите корректную этажность")
    if (
        property_obj.build_year is not None
        and not 1800 <= property_obj.build_year <= 2100
    ):
        issues.append("Укажите корректный год постройки")

    text = " ".join(str(part) or "" for part in (
        property_obj.description,
        property_obj.address,
        property_obj.title,
    ))
    if _URL_RE.search(text) or _EMAIL_RE.search(text) or _PHONE_RE.search(text):
        issues.append("Объявление содержит контакты или ссылки — они запрещены")

    return issues