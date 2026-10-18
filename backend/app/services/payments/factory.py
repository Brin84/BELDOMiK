"""Payment provider factory."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.services.payments.base import PaymentProvider
from app.services.payments.mock import MockPaymentProvider
from app.services.payments.telegram_stars import TelegramStarsProvider
from app.services.payments.yookassa_provider import YooKassaProvider
from app.services.payments.ipay_provider import IPayProvider


def _build(provider: str) -> PaymentProvider:
    if provider == "mock":
        return MockPaymentProvider()
    if provider == "telegram_stars":
        return TelegramStarsProvider()
    if provider == "yookassa":
        return YooKassaProvider()
    if provider == "ipay":
        return IPayProvider()
    raise ValueError(f"Unknown payment provider: {provider!r}")


@lru_cache
def get_payment_provider(provider: str | None = None) -> PaymentProvider:
    """Return the configured payment provider (singleton)."""
    name = provider or settings.PAYMENT_PROVIDER
    return _build(name)
