"""Monetization service for promotions and subscriptions."""
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.monetization import (
    Payment,
    PaymentStatus,
    Promotion,
    PromotionStatus,
    Subscription,
    SubscriptionStatus,
)
from app.models.property import Property


class MonetizationService:
    """Handle paid promotions and subscriptions."""

    @staticmethod
    def get_available_promotions(db: Session) -> list[Promotion]:
        """Get all active promotions."""
        now = datetime.now(UTC)
        return (
            db.query(Promotion)
            .filter(
                Promotion.status == PromotionStatus.ACTIVE,
                Promotion.started_at <= now,
                Promotion.expires_at >= now,
            )
            .order_by(Promotion.id)
            .all()
        )

    @staticmethod
    def create_promotion(
        db: Session,
        property_id: int,
        promotion_type: str,
        price_byn: int,
        duration_days: int,
    ) -> Promotion:
        """Create a new promotion for a property."""
        from app.models.monetization import PromotionType

        now = datetime.now(UTC)
        expires_at = datetime.fromtimestamp(now.timestamp() + duration_days * 86400, tz=UTC)

        promotion = Promotion(
            property_id=property_id,
            type=PromotionType(promotion_type),
            price_byn=price_byn,
            expires_at=expires_at,
            status=PromotionStatus.PENDING,
        )
        db.add(promotion)
        db.commit()
        db.refresh(promotion)
        return promotion

    @staticmethod
    def apply_promotion(
        db: Session,
        property_id: int,
        promotion_id: int,
        user_id: int,
    ) -> dict[str, Any] | None:
        """Apply promotion to a property."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj or property_obj.owner_id != user_id:
            return {"error": "Property not found or not owned"}

        promotion = db.query(Promotion).filter(
            Promotion.id == promotion_id,
            Promotion.status == PromotionStatus.PENDING,
        ).first()
        if not promotion:
            return {"error": "Promotion not available"}

        # Create payment record
        payment = Payment(
            user_id=user_id,
            property_id=property_id,
            amount_byn=promotion.price_byn,
            status=PaymentStatus.PENDING,
            description=f"Promotion {promotion.type.value}",
        )
        db.add(payment)
        db.commit()

        return {
            "payment_id": payment.id,
            "amount_byn": promotion.price_byn,
            "promotion": promotion.type.value,
        }

    @staticmethod
    def confirm_payment(
        db: Session, payment_id: int, external_id: str | None = None
    ) -> Payment | None:
        """Confirm a payment (called from webhook)."""
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment or payment.status != PaymentStatus.PENDING:
            return None

        payment.status = PaymentStatus.SUCCEEDED
        payment.provider_payment_id = external_id
        payment.completed_at = datetime.now(UTC)

        # Activate promotion
        if payment.promotion_id:
            promotion = db.query(Promotion).filter(Promotion.id == payment.promotion_id).first()
            if promotion:
                promotion.status = PromotionStatus.ACTIVE
                db.add(promotion)

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_user_subscriptions(db: Session, user_id: int) -> list[Subscription]:
        """Get user's active subscriptions (via their agencies)."""
        # Subscriptions are per agency, not per user directly
        from app.models.user import AgencyMember
        agency_ids = (
            db.query(AgencyMember.agency_id)
            .filter(AgencyMember.user_id == user_id)
            .subquery()
        )

        now = datetime.now(UTC)
        return (
            db.query(Subscription)
            .filter(
                Subscription.agency_id.in_(agency_ids),
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at >= now,
            )
            .all()
        )

    @staticmethod
    def get_user_payments(
        db: Session, user_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[Payment], int]:
        """Get user's payment history."""
        query = (
            db.query(Payment)
            .filter(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
        )
        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_property_promotions(db: Session, property_id: int) -> list[Promotion]:
        """Get active promotions for a property."""
        now = datetime.now(UTC)
        return (
            db.query(Promotion)
            .filter(
                Promotion.property_id == property_id,
                Promotion.status == PromotionStatus.ACTIVE,
                Promotion.expires_at >= now,
            )
            .all()
        )