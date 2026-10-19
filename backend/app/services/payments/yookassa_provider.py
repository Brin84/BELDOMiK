"""YooKassa payment provider."""
from __future__ import annotations

import json
import logging

from yookassa import Configuration, Payment as YooKassaPayment
from yookassa.domain.notification import WebhookNotificationEventType, WebhookNotificationFactory
from yookassa.domain.request import PaymentRequest

from app.core.config import settings
from app.models.monetization import Payment
from app.services.payments.base import PaymentCheckout, PaymentProvider

logger = logging.getLogger(__name__)


class YooKassaProvider(PaymentProvider):
    """YooKassa (ЮKassa) payment provider for BYN payments."""

    name = "yookassa"

    def __init__(self):
        if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
            raise ValueError("YooKassa credentials not configured")
        Configuration.account_id = settings.YOOKASSA_SHOP_ID
        Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

    def create_payment(self, payment: Payment) -> PaymentCheckout:
        """Create a YooKassa payment and return checkout URL."""
        idempotence_key = f"payment_{payment.id}"

        payment_request = PaymentRequest(
            amount={"value": f"{payment.amount_byn:.2f}", "currency": payment.currency or "BYN"},
            confirmation={"type": "redirect", "return_url": settings.FRONTEND_URL or settings.BACKEND_PUBLIC_URL},
            capture=True,
            description=payment.description or f"Оплата заказа #{payment.id}",
            metadata={"payment_id": payment.id},
        )

        try:
            yookassa_payment = YooKassaPayment.create(payment_request, idempotence_key)
        except Exception as e:
            logger.exception("YooKassa create payment failed")
            raise ValueError(f"Ошибка создания платежа: {e}")

        confirmation_url = yookassa_payment.confirmation.confirmation_url if yookassa_payment.confirmation else None
        if not confirmation_url:
            raise ValueError("YooKassa не вернула confirmation_url")

        # Persist yookassa_payment_id so confirm_payment / webhook can retrieve it
        payment.provider_data = json.dumps({"yookassa_payment_id": yookassa_payment.id})

        return PaymentCheckout(
            payment_id=payment.id,
            amount_byn=payment.amount_byn,
            currency=payment.currency or "BYN",
            provider=self.name,
            confirmation={
                "url": confirmation_url,
                "yookassa_payment_id": yookassa_payment.id,
            },
        )

    def confirm_payment(self, payment: Payment) -> bool:
        """Check payment status via YooKassa API."""
        yookassa_payment_id = None
        if payment.provider_data:
            try:
                data = json.loads(payment.provider_data)
                yookassa_payment_id = data.get("yookassa_payment_id")
            except (json.JSONDecodeError, TypeError):
                pass

        if not yookassa_payment_id:
            logger.error("No yookassa_payment_id stored for payment %s", payment.id)
            return False

        try:
            yookassa_payment = YooKassaPayment.find_one(yookassa_payment_id)
        except Exception as e:
            logger.exception("YooKassa find payment failed")
            return False

        if yookassa_payment.status == "succeeded":
            return True
        return False

    @staticmethod
    def parse_webhook(body: dict, headers: dict) -> dict | None:
        """Parse and verify YooKassa webhook notification.
        
        Returns dict with payment_id and status, or None if not a payment event.
        """
        try:
            notification = WebhookNotificationFactory().create(body)
        except Exception as e:
            logger.warning("Failed to parse YooKassa webhook: %s", e)
            return None

        if notification.event not in (WebhookNotificationEventType.PAYMENT_SUCCEEDED, WebhookNotificationEventType.PAYMENT_CANCELED):
            return None

        payment_info = notification.object
        metadata = payment_info.metadata or {}
        internal_payment_id = metadata.get("payment_id")

        if not internal_payment_id:
            logger.warning("YooKassa webhook missing payment_id in metadata")
            return None

        status = "succeeded" if notification.event == WebhookNotificationEventType.PAYMENT_SUCCEEDED else "canceled"
        return {"payment_id": int(internal_payment_id), "status": status, "yookassa_payment_id": payment_info.id}