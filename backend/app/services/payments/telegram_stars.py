"""Telegram Stars payment provider (future).

Placeholder for the real integration. Telegram Stars flow:
  - `create_payment` -> bot API `createInvoiceLink` with `currency="XTR"` and
    `prices=[{label, amount}]` (Stars are integer cents of a star).
  - The webhook receives a `pre_checkout_query` (answer it) and then a
    `message.successful_payment` update carrying `provider_payment_charge_id`;
    that charge id is passed to `confirm_payment` -> payment is completed.

Not implemented yet; selecting this provider raises a clear error instead of
silently mis-billing the user.
"""
from __future__ import annotations

from app.models.monetization import Payment
from app.services.payments.base import PaymentCheckout


class TelegramStarsProvider:
    """Stub for the future Telegram Stars integration."""

    name = "telegram_stars"

    def create_payment(self, payment: Payment) -> PaymentCheckout:
        raise NotImplementedError(
            "Telegram Stars provider is not configured yet; use PAYMENT_PROVIDER=mock"
        )

    def confirm_payment(self, payment: Payment) -> bool:
        raise NotImplementedError(
            "Telegram Stars provider is not configured yet; use PAYMENT_PROVIDER=mock"
        )
