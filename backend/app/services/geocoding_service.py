"""Best-effort address geocoding for property listings (OSM Nominatim).

The submission wizard collects a free-text address (region/city/district/street)
but no coordinates. Without ``lat``/``lng`` the «Расположение» section of the
detail page never renders a map. This service geocodes the address to
coordinates so the map shows for every listing — the same way it renders for
test (seeded) listings.

Best-effort by design: any failure (network, rate limit, parsing) leaves the
listing without coordinates and never breaks creation or submission.
"""
import logging
import time

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.geography import City, Region
from app.models.property import Property

logger = logging.getLogger(__name__)

# Nominatim usage policy: at most 1 request/second with an identifying User-Agent.
_MIN_REQUEST_INTERVAL = 1.2
_CACHE_TTL = 7 * 24 * 3600  # 7 days

_last_request_at = 0.0
_cache: dict[str, tuple[float, tuple[float, float]]] = {}


class GeocodingService:
    """Geocode a property's textual address into ``lat``/``lng``."""

    @staticmethod
    def build_query(property_obj: Property, db: Session) -> dict[str, str] | None:
        """Compose a structured Nominatim query (street/city/state) from the address.

        Returns ``None`` when there is nothing to geocode (no address given).
        Town names are resolved through the database so the query targets the
        right Belarusian settlement.
        """
        address = (property_obj.address or "").strip()
        if not address:
            return None

        query: dict[str, str] = {"street": address}
        if property_obj.city_id:
            city = db.get(City, property_obj.city_id)
            if city is not None:
                query["city"] = city.name
                if city.region_id:
                    region = db.get(Region, city.region_id)
                    if region is not None:
                        query["state"] = region.name
        # A city district is not an administrative region: Nominatim resolves
        # street+city+region well enough, extra params only reduce precision.
        return query

    @staticmethod
    def _wait_ratelimit() -> None:
        """Honour the Nominatim policy: >= 1 second between our requests."""
        global _last_request_at
        now = time.monotonic()
        delay = _MIN_REQUEST_INTERVAL - (now - _last_request_at)
        if delay > 0:
            time.sleep(delay)
        _last_request_at = time.monotonic()

    @classmethod
    def _default_client(cls) -> httpx.Client:
        return httpx.Client(
            timeout=settings.GEOCODING_TIMEOUT,
            headers={"User-Agent": settings.GEOCODING_USER_AGENT},
        )

    @classmethod
    def geocode_address(
        cls,
        query: dict[str, str],
        client: httpx.Client | None = None,
    ) -> tuple[float, float] | None:
        """Call Nominatim and return ``(lat, lng)`` or ``None`` (never raises).

        Uses an in-memory 7-day cache and a 1.2 s rate limit. An injected
        ``client`` (e.g. ``httpx.MockTransport`` in tests) bypasses the default
        one; when the caller provides it, the caller closes it.
        """
        key = "|".join(f"{k}={query[k]}" for k in sorted(query))
        now = time.monotonic()
        hit = _cache.get(key)
        if hit is not None and now - hit[0] < _CACHE_TTL:
            return hit[1]

        cls._wait_ratelimit()

        params: dict[str, str] = {
            **query,
            "format": "jsonv2",
            "limit": "1",
            "accept-language": "ru",
        }
        if settings.GEOCODING_COUNTRY_CODES:
            params["countrycodes"] = settings.GEOCODING_COUNTRY_CODES

        own_client = client is None
        selected = client if client is not None else cls._default_client()
        result: tuple[float, float] | None = None
        try:
            resp = selected.get(settings.GEOCODING_API_URL, params=params)
            resp.raise_for_status()
            rows = resp.json()
            if isinstance(rows, list) and rows and rows[0].get("lat") is not None:
                result = (float(rows[0]["lat"]), float(rows[0]["lon"]))
        except Exception:
            logger.warning("Геокодинг не удался для запроса %s", key, exc_info=True)
        finally:
            if own_client:
                selected.close()

        if result is not None:
            _cache[key] = (time.monotonic(), result)
        return result

    @classmethod
    def maybe_geocode(cls, db: Session, property_obj: Property) -> bool:
        """Fill the property coordinates from its address, if still missing.

        Best-effort: any error returns ``False`` and leaves the property
        untouched, so geocoding never breaks listing creation or submission.
        Returns ``True`` when coordinates are already present.
        """
        if not settings.GEOCODING_ENABLED:
            return False
        if property_obj.lat is not None and property_obj.lng is not None:
            return True

        query = cls.build_query(property_obj, db)
        if not query:
            return False

        try:
            coords = cls.geocode_address(query)
        except Exception:
            logger.warning(
                "Геокодинг-код не смог обработать объявление %s",
                getattr(property_obj, "id", None),
                exc_info=True,
            )
            return False

        if coords is None:
            return False

        property_obj.lat, property_obj.lng = coords
        return True