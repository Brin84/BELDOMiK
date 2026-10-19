"""Database-backed catalog of property promotions (Kufar-style bracket-based pricing).

The promotion *types* (top/vip/bump_up/highlight/pin) are a fixed product
catalog with a BASE price (for cheapest bracket), duration and priority.
Actual price = base_price_byn * bracket_multiplier(property_price_byn).

Priorities drive both the badge shown on a card and any "promoted first"
ordering in the feed.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.monetization import PromotionType, PromotionBasePrice
from app.services.promotion_brackets import get_brackets, calculate_promo_price


@dataclass(frozen=True)
class PromotionProduct:
    type: PromotionType
    label: str
    base_price_byn: float  # Base price for cheapest bracket (0-100 BYN)
    duration_days: int
    priority: int
    badge_color: str
    features: list[str]

    def calculate_price(self, db: Session, property_price_byn: int) -> int:
        """Calculate price in BYN for a given property price using brackets."""
        return calculate_promo_price(db, self.base_price_byn, property_price_byn)

    def get_price_range(self, db: Session) -> tuple[int, int]:
        """Get min/max price across all brackets for UI display."""
        brackets = get_brackets(db)
        prices = []
        for b in brackets:
            # Calculate price at bracket minimum
            prices.append(calculate_promo_price(db, self.base_price_byn, b.min_price_byn))
            # Calculate price at bracket maximum (if exists)
            if b.max_price_byn is not None:
                prices.append(calculate_promo_price(db, self.base_price_byn, b.max_price_byn))
        return (min(prices), max(prices))


def _load_catalog_from_db(db: Session) -> dict[PromotionType, PromotionProduct]:
    """Load promotion catalog from database."""
    from app.services.promotion_brackets import get_base_prices
    
    base_prices = get_base_prices(db)
    catalog = {}
    
    # Default values as fallback
    defaults = {
        PromotionType.TOP: {"label": "Топ", "base_price_byn": 1.2, "duration_days": 7, "priority": 100, "badge_color": "#ff9500", "features": ["Показ вверху выдачи на 7 дней", "Повышенная заметность"]},
        PromotionType.VIP: {"label": "VIP", "base_price_byn": 2.5, "duration_days": 7, "priority": 200, "badge_color": "#af52de", "features": ["Максимальная заметность на 7 дней", "Особая VIP-метка"]},
        PromotionType.BUMP_UP: {"label": "Поднять", "base_price_byn": 0.3, "duration_days": 1, "priority": 50, "badge_color": "#34c759", "features": ["Поднятие в выдаче на 1 день"]},
        PromotionType.HIGHLIGHT: {"label": "Выделить", "base_price_byn": 0.5, "duration_days": 3, "priority": 70, "badge_color": "#007aff", "features": ["Подсветка объявления на 3 дня"]},
        PromotionType.PIN: {"label": "Закрепить", "base_price_byn": 3.0, "duration_days": 7, "priority": 300, "badge_color": "#ff2d55", "features": ["Закрепление объявления на 7 дней"]},
    }
    
    for ptype, defaults_val in defaults.items():
        db_price = base_prices.get(ptype)  # keys are PromotionType enums, not strings
        if db_price:
            catalog[ptype] = PromotionProduct(
                type=ptype,
                label=db_price.label,
                base_price_byn=db_price.base_price_byn,
                duration_days=db_price.duration_days,
                priority=db_price.priority,
                badge_color=db_price.badge_color,
                features=json.loads(db_price.features) if db_price.features else defaults_val["features"],
            )
        else:
            catalog[ptype] = PromotionProduct(type=ptype, **defaults_val)
    
    return catalog


# Cache for catalog (invalidate on updates)
_catalog_cache: Optional[dict[PromotionType, PromotionProduct]] = None
_catalog_db_session_id: Optional[int] = None


def get_catalog(db: Session) -> list[PromotionProduct]:
    """Return all promotion products from database (cached per session)."""
    global _catalog_cache, _catalog_db_session_id
    
    # Simple cache invalidation: if db session changed, reload
    session_id = id(db)
    if _catalog_cache is None or _catalog_db_session_id != session_id:
        _catalog_cache = _load_catalog_from_db(db)
        _catalog_db_session_id = session_id
    
    return sorted(_catalog_cache.values(), key=lambda p: p.priority)


def get_product(db: Session, promotion_type: PromotionType | str) -> PromotionProduct | None:
    """Return the product for a promotion type, or None if unknown."""
    try:
        key = (
            promotion_type
            if isinstance(promotion_type, PromotionType)
            else PromotionType(promotion_type)
        )
    except ValueError:
        return None
    
    catalog = get_catalog(db)
    for product in catalog:
        if product.type == key:
            return product
    return None