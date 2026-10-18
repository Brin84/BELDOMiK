"""Bracket-based promotion pricing (Kufar-style).

Price brackets for property listings with multipliers for promotion base prices.
Based on analysis of Kufar's pricing model.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.core.config import settings


@dataclass(frozen=True)
class PriceBracket:
    """Price bracket with multiplier for promotion pricing."""
    min_price_byn: int
    max_price_byn: Optional[int]  # None = no upper limit
    multiplier: float
    label: str


# Default brackets (can be overridden via settings)
DEFAULT_BRACKETS: list[PriceBracket] = [
    PriceBracket(0, 100, 1.0, "Базовый"),
    PriceBracket(101, 1_000, 2.0, "Низкий"),
    PriceBracket(1_001, 10_000, 3.5, "Средний"),
    PriceBracket(10_001, 50_000, 5.5, "Высокий"),
    PriceBracket(50_001, None, 7.5, "Премиум"),
]


def get_brackets() -> list[PriceBracket]:
    """Get price brackets from settings or use defaults."""
    # TODO: Could load from settings/DB for admin configurability
    return DEFAULT_BRACKETS


def find_bracket(property_price_byn: int) -> PriceBracket:
    """Find the bracket for a given property price."""
    brackets = get_brackets()
    for bracket in brackets:
        if property_price_byn >= bracket.min_price_byn:
            if bracket.max_price_byn is None or property_price_byn <= bracket.max_price_byn:
                return bracket
    # Fallback to highest bracket
    return brackets[-1]


def calculate_promo_price(
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
    bracket = find_bracket(property_price_byn)
    price = base_price_byn * bracket.multiplier
    return max(1, int(round(price)))