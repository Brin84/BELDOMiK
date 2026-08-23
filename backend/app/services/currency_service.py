"""Currency exchange rate service."""
import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class CurrencyService:
    """Get USD/BYN exchange rate from National Bank of Belarus."""

    # Cache in memory (simple approach; could use Redis)
    _cache: dict[str, tuple[datetime, float]] = {}
    _cache_ttl = 3600  # 1 hour

    @classmethod
    async def get_usd_to_byn_rate(cls, _db: Session | None = None) -> float:
        """
        Get current USD to BYN rate.

        Tries NBRB API, falls back to cached value or default.
        """
        now = datetime.now(UTC)

        # Check cache
        if "usd_byn" in cls._cache:
            cached_at, cached_rate = cls._cache["usd_byn"]
            if (now - cached_at).total_seconds() < cls._cache_ttl:
                return cached_rate

        # Try fetching from NBRB
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # NBRB USD rate is currency code 431
                resp = await client.get(settings.EXCHANGE_RATE_API_URL)
                resp.raise_for_status()
                data = resp.json()
                rate = float(data.get("Cur_OfficialRate", 0))
                if rate > 0:
                    cls._cache["usd_byn"] = (now, rate)
                    logger.debug("Updated USD/BYN rate", rate=rate)
                    return rate
        except Exception as e:
            logger.warning("Failed to fetch exchange rate", error=str(e))

        # Fallback to cached or default
        if "usd_byn" in cls._cache:
            return cls._cache["usd_byn"][1]

        # Default fallback (should be updated)
        logger.warning("Using default exchange rate fallback")
        return 3.2

    @classmethod
    def convert_byn_to_usd(cls, amount_byn: int, rate: float) -> int:
        if rate <= 0:
            return 0
        return round(amount_byn / rate)

    @classmethod
    def calculate_per_m2(cls, price_byn: int, area: float | None) -> int | None:
        if not area or area <= 0:
            return None
        return round(price_byn / area)

    @classmethod
    def get_usd_to_byn_rate_sync(cls) -> float:
        """Sync version for non-async contexts (fallback to cache or default)."""
        if "usd_byn" in cls._cache:
            cached_at, cached_rate = cls._cache["usd_byn"]
            if (datetime.now(UTC) - cached_at).total_seconds() < cls._cache_ttl:
                return cached_rate
        return 3.2  # Default fallback
