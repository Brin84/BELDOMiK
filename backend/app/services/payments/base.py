"""Payment provider abstraction.

A provider is responsible for creating a payable invoice and confirming a
payment once the user completes it. Real providers (Telegram Stars) will map
this to `createInvoiceLink` + the `successful_payment` webhook; the mock
provider simply auto-confirms so the whole flow is testable in dev.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from app.models.monetization import Payment


@dataclass
class PaymentCheckout:
    """What the client receives to complete a payment."""

    payment_id: int
    amount_byn: int
    currency: str = "BYN"
    provider: str = "mock"
    # Provider-specific payload (mock confirmation, Stars invoice link, ...)
    confirmation: dict = field(default_factory=dict)


@runtime_checkable
class PaymentProvider(Protocol):
    """Contract every payment provider must satisfy."""

    name: str

    def create_payment(self, payment: Payment) -> PaymentCheckout:
        """Create an external invoice for the given pending payment."""
        ...

    def confirm_payment(self, payment: Payment) -> bool:
        """Confirm a payment with the provider. Returns True on success."""
        ...
