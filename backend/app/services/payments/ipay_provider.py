"""IPay payment provider (Belarus)."""
from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.models.monetization import Payment
from app.services.payments.base import PaymentCheckout, PaymentProvider

logger = logging.getLogger(__name__)


class IPayProvider(PaymentProvider):
    """IPay payment provider for Belarus."""

    name = "ipay"

    def __init__(self):
        if not settings.IPAY_ACCOUNT_ID or not settings.IPAY_SECRET_KEY:
            raise ValueError("IPay credentials not configured")
        self.account_id = settings.IPAY_ACCOUNT_ID
        self.secret_key = settings.IPAY_SECRET_KEY
        self.api_url = settings.IPAY_API_URL or "https://api.ipay.by"
        self.test_mode = getattr(settings, "IPAY_TEST_MODE", False)

    def _sign(self, data: dict[str, Any]) -> str:
        """Generate HMAC-SHA256 signature for IPay."""
        sorted_data = sorted(data.items())
        query_string = "&".join(f"{k}={v}" for k, v in sorted_data)
        signature = hmac.new(
            self.secret_key.encode(),
            query_string.encode(),
            hashlib.sha256,
        ).hexdigest()
        return signature

    def create_payment(self, payment: Payment) -> PaymentCheckout:
        """Create an IPay payment and return checkout URL."""
        payload = {
            "account_id": self.account_id,
            "amount": int(payment.amount_byn * 100),  # IPay expects amount in kopecks
            "currency": payment.currency or "BYN",
            "order_id": f"payment_{payment.id}",
            "description": payment.description or f"Оплата заказа #{payment.id}",
            "return_url": settings.FRONTEND_URL or settings.BACKEND_PUBLIC_URL,
            "test_mode": 1 if self.test_mode else 0,
        }

        payload["signature"] = self._sign(payload)

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(f"{self.api_url}/v1/payment/create", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.exception("IPay create payment failed")
            raise ValueError(f"Ошибка создания платежа IPay: {e}")

        if not data.get("success"):
            raise ValueError(f"IPay ошибка: {data.get('error', 'Unknown error')}")

        payment_url = data.get("payment_url")
        if not payment_url:
            raise ValueError("IPay не вернула payment_url")

        return PaymentCheckout(
            payment_id=payment.id,
            amount_byn=payment.amount_byn,
            currency=payment.currency or "BYN",
            provider=self.name,
            confirmation={
                "url": payment_url,
                "ipay_order_id": data.get("order_id"),
            },
        )

    def confirm_payment(self, payment: Payment) -> bool:
        """Check payment status via IPay API."""
        ipay_order_id = None
        if payment.provider_data:
            ipay_order_id = payment.provider_data.get("ipay_order_id")

        if not ipay_order_id:
            logger.error("No ipay_order_id stored for payment %s", payment.id)
            return False

        payload = {
            "account_id": self.account_id,
            "order_id": ipay_order_id,
        }
        payload["signature"] = self._sign(payload)

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(f"{self.api_url}/v1/payment/status", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.exception("IPay status check failed")
            return False

        if not data.get("success"):
            logger.warning("IPay status check failed: %s", data.get("error"))
            return False

        status = data.get("status")
        return status == "paid"

    @staticmethod
    def parse_webhook(body: dict, headers: dict) -> dict | None:
        """Parse and verify IPay webhook notification."""
        # IPay webhook verification depends on their specific implementation
        # This is a basic template - adjust based on actual IPay webhook docs
        try:
            # Verify signature if provided in headers
            signature = headers.get("X-IPay-Signature") or headers.get("X-Signature")
            if signature:
                # Implement signature verification based on IPay docs
                pass

            order_id = body.get("order_id")
            status = body.get("status")

            if not order_id:
                logger.warning("IPay webhook missing order_id")
                return None

            # Extract internal payment_id from order_id (format: payment_{id})
            if order_id.startswith("payment_"):
                payment_id = int(order_id.split("_")[1])
            else:
                payment_id = int(order_id)

            return {"payment_id": payment_id, "status": status, "ipay_order_id": order_id}
        except Exception as e:
            logger.warning("Failed to parse IPay webhook: %s", e)
            return None