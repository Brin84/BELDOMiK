"""Static catalog of property promotions.

The promotion *types* (top/vip/bump_up/highlight/pin) are a fixed product
catalog with a price, duration and priority. Applying one creates a row in
the `promotions` table (the applied record) linked to a property.

Priorities drive both the badge shown on a card and any "promoted first"
ordering in the feed.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.models.monetization import PromotionType


@dataclass(frozen=True)
class PromotionProduct:
    type: PromotionType
    label: str
    price_byn: int
    duration_days: int
    priority: int
    badge_color: str
    features: list[str]


CATALOG: dict[PromotionType, PromotionProduct] = {
    PromotionType.TOP: PromotionProduct(
        type=PromotionType.TOP,
        label="Топ",
        price_byn=49,
        duration_days=7,
        priority=100,
        badge_color="#ff9500",
        features=["Показ вверху выдачи на 7 дней", "Повышенная заметность"],
    ),
    PromotionType.VIP: PromotionProduct(
        type=PromotionType.VIP,
        label="VIP",
        price_byn=99,
        duration_days=7,
        priority=200,
        badge_color="#af52de",
        features=["Максимальная заметность на 7 дней", "Особая VIP-метка"],
    ),
    PromotionType.BUMP_UP: PromotionProduct(
        type=PromotionType.BUMP_UP,
        label="Поднять",
        price_byn=15,
        duration_days=1,
        priority=50,
        badge_color="#34c759",
        features=["Поднятие в выдаче на 1 день"],
    ),
    PromotionType.HIGHLIGHT: PromotionProduct(
        type=PromotionType.HIGHLIGHT,
        label="Выделить",
        price_byn=29,
        duration_days=3,
        priority=70,
        badge_color="#007aff",
        features=["Подсветка объявления на 3 дня"],
    ),
    PromotionType.PIN: PromotionProduct(
        type=PromotionType.PIN,
        label="Закрепить",
        price_byn=129,
        duration_days=7,
        priority=300,
        badge_color="#ff2d55",
        features=["Закрепление объявления на 7 дней"],
    ),
}


def get_catalog() -> list[PromotionProduct]:
    """Return all promotion products in a stable order (lowest priority first)."""
    return sorted(CATALOG.values(), key=lambda p: p.priority)


def get_product(promotion_type: PromotionType | str) -> PromotionProduct | None:
    """Return the product for a promotion type, or None if unknown."""
    try:
        key = (
            promotion_type
            if isinstance(promotion_type, PromotionType)
            else PromotionType(promotion_type)
        )
    except ValueError:
        return None
    return CATALOG.get(key)
