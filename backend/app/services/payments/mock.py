"""Mock payment provider (development).

Every payment is considered successful. This lets the full promote/subscribe
flow (create invoice -> confirm -> activate) be exercised without any real
money, credentials or external service.
"""
from __future__ import annotations

from app.models.monetization import Payment
from app.services.payments.base import PaymentCheckout


class MockPaymentProvider:
    """Auto-confirming provider for local/dev/test environments."""

    name = "mock"

    def create_payment(self, payment: Payment) -> PaymentCheckout:
        """Return a checkout the client can confirm immediately."""
        return PaymentCheckout(
            payment_id=payment.id,
            amount_byn=payment.amount_byn,
            currency=payment.currency,
            provider=self.name,
            confirmation={
                "mock": True,
                "amount": payment.amount_byn,
                "currency": payment.currency,
            },
        )

    def confirm_payment(self, payment: Payment) -> bool:
        """Mock payments always succeed."""
        return True
