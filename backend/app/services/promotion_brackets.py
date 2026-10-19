"""Bracket-based promotion pricing (Kufar-style) with database persistence.

Price brackets for property listings with multipliers for promotion base prices.
Based on analysis of Kufar's pricing model.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.monetization import PromotionPriceBracket, PromotionBasePrice


@dataclass(frozen=True)
class PriceBracket:
    """Price bracket with multiplier for promotion pricing."""
    min_price_byn: int
    max_price_byn: Optional[int]  # None = no upper limit
    multiplier: float
    label: str
    sort_order: int
    is_active: bool


def get_brackets(db: Session) -> list[PriceBracket]:
    """Get active price brackets from database, ordered by sort_order."""
    brackets = db.query(PromotionPriceBracket).filter(
        PromotionPriceBracket.is_active == True
    ).order_by(PromotionPriceBracket.sort_order).all()
    
    return [
        PriceBracket(
            min_price_byn=b.min_price_byn,
            max_price_byn=b.max_price_byn,
            multiplier=b.multiplier,
            label=b.label,
            sort_order=b.sort_order,
            is_active=b.is_active,
        )
        for b in brackets
    ]


def find_bracket(db: Session, property_price_byn: int) -> PriceBracket:
    """Find the bracket for a given property price."""
    brackets = get_brackets(db)
    for bracket in brackets:
        if property_price_byn >= bracket.min_price_byn:
            if bracket.max_price_byn is None or property_price_byn <= bracket.max_price_byn:
                return bracket
    # Fallback to highest bracket
    return brackets[-1] if brackets else PriceBracket(0, None, 1.0, "Базовый", 0, True)


def calculate_promo_price(
    db: Session,
    base_price_byn: float,
    property_price_byn: int
) -> int:
    """Calculate promotion price for a property based on its price bracket.
    
    Args:
        base_price_byn: Base promotion price (for cheapest bracket)
        property_price_byn: Price of the property being promoted
        
    Returns:
        Final promotion price in BYN (rounded, minimum 1 BYN)
    """
    bracket = find_bracket(db, property_price_byn)
    price = base_price_byn * bracket.multiplier
    return max(1, int(round(price)))


def get_base_prices(db: Session) -> dict[PromotionType, PromotionBasePrice]:
    """Get all active base prices keyed by PromotionType enum."""
    prices = db.query(PromotionBasePrice).filter(
        PromotionBasePrice.is_active == True
    ).all()
    return {p.promotion_type: p for p in prices}


def get_base_price(db: Session, promotion_type: str | PromotionType) -> PromotionBasePrice | None:
    """Get base price for a specific promotion type."""
    if isinstance(promotion_type, str):
        try:
            ptype = PromotionType(promotion_type)
        except ValueError:
            return None
    else:
        ptype = promotion_type
    return db.query(PromotionBasePrice).filter(
        PromotionBasePrice.promotion_type == ptype,
        PromotionBasePrice.is_active == True
    ).first()