"""Static catalog of property promotions (Kufar-style percentage-based pricing).

The promotion *types* (top/vip/bump_up/highlight/pin) are a fixed product
catalog with a percentage, duration and priority. Applying one creates a row in
the `promotions` table (the applied record) linked to a property.
Actual price = property_price_byn * percentage / 100 (rounded to int).

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
    percentage: float  # процент от цены объявления (например, 0.5 = 0.5%)
    duration_days: int
    priority: int
    badge_color: str
    features: list[str]

    def calculate_price(self, property_price_byn: int) -> int:
        """Calculate price in BYN for a given property price."""
        return max(1, int(round(property_price_byn * self.percentage / 100)))


CATALOG: dict[PromotionType, PromotionProduct] = {
    PromotionType.TOP: PromotionProduct(
        type=PromotionType.TOP,
        label="Топ",
        percentage=0.5,   # 0.5% от цены объявления
        duration_days=7,
        priority=100,
        badge_color="#ff9500",
        features=["Показ вверху выдачи на 7 дней", "Повышенная заметность"],
    ),
    PromotionType.VIP: PromotionProduct(
        type=PromotionType.VIP,
        label="VIP",
        percentage=1.0,   # 1% от цены объявления
        duration_days=7,
        priority=200,
        badge_color="#af52de",
        features=["Максимальная заметность на 7 дней", "Особая VIP-метка"],
    ),
    PromotionType.BUMP_UP: PromotionProduct(
        type=PromotionType.BUMP_UP,
        label="Поднять",
        percentage=0.2,   # 0.2% от цены объявления
        duration_days=1,
        priority=50,
        badge_color="#34c759",
        features=["Поднятие в выдаче на 1 день"],
    ),
    PromotionType.HIGHLIGHT: PromotionProduct(
        type=PromotionType.HIGHLIGHT,
        label="Выделить",
        percentage=0.3,   # 0.3% от цены объявления
        duration_days=3,
        priority=70,
        badge_color="#007aff",
        features=["Подсветка объявления на 3 дня"],
    ),
    PromotionType.PIN: PromotionProduct(
        type=PromotionType.PIN,
        label="Закрепить",
        percentage=1.5,   # 1.5% от цены объявления
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
