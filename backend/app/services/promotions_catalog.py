"""Static catalog of property promotions (Kufar-style bracket-based pricing).

The promotion *types* (top/vip/bump_up/highlight/pin) are a fixed product
catalog with a BASE price (for cheapest bracket), duration and priority.
Actual price = base_price_byn * bracket_multiplier(property_price_byn).

Priorities drive both the badge shown on a card and any "promoted first"
ordering in the feed.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.models.monetization import PromotionType
from app.services.promotion_brackets import calculate_promo_price


@dataclass(frozen=True)
class PromotionProduct:
    type: PromotionType
    label: str
    base_price_byn: float  # Base price for cheapest bracket (0-100 BYN)
    duration_days: int
    priority: int
    badge_color: str
    features: list[str]

    def calculate_price(self, property_price_byn: int) -> int:
        """Calculate price in BYN for a given property price using brackets."""
        return calculate_promo_price(self.base_price_byn, property_price_byn)

    def get_price_range(self) -> tuple[int, int]:
        """Get min/max price across all brackets for UI display."""
        from app.services.promotion_brackets import get_brackets
        brackets = get_brackets()
        prices = [calculate_promo_price(self.base_price_byn, b.min_price_byn) for b in brackets]
        return (min(prices), max(prices))


# Base prices calibrated to match Kufar-style pricing:
# For 60 BYN listing: 13K views = 9 BYN → base ~9/7.5 = 1.2
# For 93,180 BYN listing: 13K views = 66.8 BYN → base ~66.8/7.5 = 8.9
# Using base prices that approximate Kufar's bracket model

CATALOG: dict[PromotionType, PromotionProduct] = {
    PromotionType.TOP: PromotionProduct(
        type=PromotionType.TOP,
        label="Топ",
        base_price_byn=1.2,   # ~9 BYN for cheap, ~67 BYN for expensive
        duration_days=7,
        priority=100,
        badge_color="#ff9500",
        features=["Показ вверху выдачи на 7 дней", "Повышенная заметность"],
    ),
    PromotionType.VIP: PromotionProduct(
        type=PromotionType.VIP,
        label="VIP",
        base_price_byn=2.5,   # ~19 BYN cheap, ~139 BYN expensive
        duration_days=7,
        priority=200,
        badge_color="#af52de",
        features=["Максимальная заметность на 7 дней", "Особая VIP-метка"],
    ),
    PromotionType.BUMP_UP: PromotionProduct(
        type=PromotionType.BUMP_UP,
        label="Поднять",
        base_price_byn=0.3,   # ~2 BYN cheap, ~17 BYN expensive
        duration_days=1,
        priority=50,
        badge_color="#34c759",
        features=["Поднятие в выдаче на 1 день"],
    ),
    PromotionType.HIGHLIGHT: PromotionProduct(
        type=PromotionType.HIGHLIGHT,
        label="Выделить",
        base_price_byn=0.5,   # ~4 BYN cheap, ~28 BYN expensive
        duration_days=3,
        priority=70,
        badge_color="#007aff",
        features=["Подсветка объявления на 3 дня"],
    ),
    PromotionType.PIN: PromotionProduct(
        type=PromotionType.PIN,
        label="Закрепить",
        base_price_byn=3.0,   # ~23 BYN cheap, ~169 BYN expensive
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