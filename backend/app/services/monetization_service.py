"""Monetization service: promotions, subscriptions, payments."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.monetization import (
    Payment,
    PaymentStatus,
    Promotion,
    PromotionStatus,
    PromotionType,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.property import Property, PropertyStatus
from app.models.user import AgencyMember, User
from app.services.payments.base import PaymentCheckout
from app.services.payments.factory import get_payment_provider
from app.services.promotions_catalog import get_catalog, get_product


# Subscription plan configuration (limits + price + duration).
SUBSCRIPTION_PLANS: dict[SubscriptionPlan, dict[str, Any]] = {
    SubscriptionPlan.FREE: {
        "max_properties": 10,
        "max_promotions": 0,
        "has_analytics": False,
        "has_team": False,
        "team_size": 1,
        "price_byn": 0,
        "duration_days": 365,
    },
    SubscriptionPlan.PRO: {
        "max_properties": 50,
        "max_promotions": 10,
        "has_analytics": True,
        "has_team": True,
        "team_size": 5,
        "price_byn": 49,
        "duration_days": 30,
    },
    SubscriptionPlan.ENTERPRISE: {
        "max_properties": 500,
        "max_promotions": 100,
        "has_analytics": True,
        "has_team": True,
        "team_size": 20,
        "price_byn": 199,
        "duration_days": 30,
    },
}


class MonetizationService:
    """Handle paid promotions and subscriptions."""

    # ---------------------------------------------------------------- promotions
    @staticmethod
    def get_available_promotions() -> list[dict[str, Any]]:
        """Return the static promotion catalog."""
        return [
            {
                "type": p.type.value,
                "label": p.label,
                "price_byn": p.price_byn,
                "duration_days": p.duration_days,
                "priority": p.priority,
                "badge_color": p.badge_color,
                "features": p.features,
            }
            for p in get_catalog()
        ]

    @staticmethod
    def promote_property(
        db: Session, property_id: int, promotion_type: str, user: User
    ) -> PaymentCheckout:
        """Create a pending promotion + payment for a property and return a checkout."""
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop or prop.owner_id != user.id:
            raise ValueError("Объявление не найдено или не принадлежит вам")

        product = get_product(promotion_type)
        if not product:
            raise ValueError("Неизвестный тип продвижения")

        now = datetime.now(UTC)
        expires_at = now + timedelta(days=product.duration_days)

        # Idempotency: reject if the same type is already active on this property.
        active = (
            db.query(Promotion)
            .filter(
                Promotion.property_id == property_id,
                Promotion.type == product.type,
                Promotion.status == PromotionStatus.ACTIVE,
                Promotion.expires_at >= now,
            )
            .first()
        )
        if active:
            raise ValueError("Это продвижение уже активно на объявлении")

        promotion = Promotion(
            property_id=property_id,
            type=product.type,
            started_at=now,
            expires_at=expires_at,
            price_byn=product.price_byn,
            status=PromotionStatus.PENDING,
        )
        db.add(promotion)
        db.flush()

        payment = Payment(
            user_id=user.id,
            property_id=property_id,
            promotion_id=promotion.id,
            amount_byn=product.price_byn,
            status=PaymentStatus.PENDING,
            description=f"Продвижение «{product.label}»",
        )
        db.add(payment)
        db.flush()

        provider = get_payment_provider()
        payment.provider = provider.name
        checkout = provider.create_payment(payment)
        db.commit()
        return checkout

    @staticmethod
    def get_property_promotions(db: Session, property_id: int) -> list[Promotion]:
        """Active promotions for a property (expired excluded)."""
        now = datetime.now(UTC)
        return (
            db.query(Promotion)
            .filter(
                Promotion.property_id == property_id,
                Promotion.status == PromotionStatus.ACTIVE,
                Promotion.expires_at >= now,
            )
            .order_by(Promotion.started_at.desc())
            .all()
        )

    @staticmethod
    def active_promotion_types(db: Session, property_ids: list[int]) -> dict[int, str]:
        """Map property_id -> strongest active promotion type (for listings)."""
        if not property_ids:
            return {}
        now = datetime.now(UTC)
        rows = (
            db.query(Promotion.property_id, Promotion.type)
            .filter(
                Promotion.property_id.in_(property_ids),
                Promotion.status == PromotionStatus.ACTIVE,
                Promotion.expires_at >= now,
            )
            .all()
        )
        result: dict[int, str] = {}
        for property_id, ptype in rows:
            # Keep the highest-priority type if multiple are active.
            current = result.get(property_id)
            if current is None or _priority(ptype) > _priority(current):
                result[property_id] = ptype.value if hasattr(ptype, "value") else str(ptype)
        return result

    # ---------------------------------------------------------------- payments
    @staticmethod
    def confirm_payment(db: Session, payment_id: int, user: User) -> Payment:
        """Confirm a payment; activates the linked promotion/subscription."""
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise ValueError("Платёж не найден")
        if payment.user_id != user.id and user.role not in ("admin", "moderator"):
            raise ValueError("Платёж не принадлежит вам")

        if payment.status == PaymentStatus.SUCCEEDED:
            db.refresh(payment)
            return payment

        provider = get_payment_provider(payment.provider)
        if not provider.confirm_payment(payment):
            payment.status = PaymentStatus.FAILED
            db.commit()
            raise ValueError("Оплата не подтверждена провайдером")

        payment.status = PaymentStatus.SUCCEEDED
        payment.completed_at = datetime.now(UTC)
        db.flush()

        if payment.promotion_id:
            MonetizationService._activate_promotion(db, payment.promotion_id)
        if payment.subscription_id:
            MonetizationService._activate_subscription(db, payment.subscription_id)

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def _activate_promotion(db: Session, promotion_id: int) -> None:
        promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
        if not promotion:
            return
        now = datetime.now(UTC)
        product = get_product(promotion.type)
        if product:
            promotion.expires_at = now + timedelta(days=product.duration_days)
        promotion.started_at = now
        promotion.status = PromotionStatus.ACTIVE
        db.add(promotion)

    @staticmethod
    def _activate_subscription(db: Session, subscription_id: int) -> None:
        subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not subscription:
            return
        now = datetime.now(UTC)
        config = SUBSCRIPTION_PLANS.get(subscription.plan, SUBSCRIPTION_PLANS[SubscriptionPlan.FREE])
        subscription.started_at = now
        subscription.expires_at = now + timedelta(days=config["duration_days"])
        subscription.status = SubscriptionStatus.ACTIVE
        db.add(subscription)

    # ---------------------------------------------------------------- subscriptions
    @staticmethod
    def create_subscription(db: Session, plan: str, agency_id: int, user: User) -> PaymentCheckout | Subscription:
        """Buy/activate a subscription plan for the user's agency."""
        from app.models.user import Agency

        try:
            plan_enum = SubscriptionPlan(plan)
        except ValueError:
            raise ValueError("Неизвестный тариф")

        agency = db.query(Agency).filter(Agency.id == agency_id).first()
        if not agency:
            raise ValueError("Агентство не найдено")

        member = (
            db.query(AgencyMember)
            .filter(AgencyMember.agency_id == agency_id, AgencyMember.user_id == user.id)
            .first()
        )
        if not member or member.role != "admin":
            raise ValueError("Только администратор агентства может менять подписку")

        now = datetime.now(UTC)
        existing = (
            db.query(Subscription)
            .filter(
                Subscription.agency_id == agency_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at >= now,
            )
            .first()
        )
        if existing:
            raise ValueError("У агентства уже есть активная подписка")

        config = SUBSCRIPTION_PLANS[plan_enum]
        subscription = Subscription(
            agency_id=agency_id,
            plan=plan_enum,
            status=SubscriptionStatus.PENDING,
            max_properties=config["max_properties"],
            max_promotions=config["max_promotions"],
            has_analytics=config["has_analytics"],
            has_team=config["has_team"],
            team_size=config["team_size"],
            expires_at=now + timedelta(days=config["duration_days"]),
        )
        db.add(subscription)
        db.flush()

        # FREE plan activates immediately without payment.
        if config["price_byn"] == 0:
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.started_at = now
            db.commit()
            db.refresh(subscription)
            return subscription

        payment = Payment(
            user_id=user.id,
            agency_id=agency_id,
            subscription_id=subscription.id,
            amount_byn=config["price_byn"],
            status=PaymentStatus.PENDING,
            description=f"Подписка «{plan_enum.value}»",
        )
        db.add(payment)
        db.flush()

        provider = get_payment_provider()
        payment.provider = provider.name
        checkout = provider.create_payment(payment)
        db.commit()
        return checkout

    @staticmethod
    def get_user_subscriptions(db: Session, user_id: int) -> list[Subscription]:
        """Active subscriptions of the agencies the user belongs to."""
        agency_ids = (
            db.query(AgencyMember.agency_id)
            .filter(AgencyMember.user_id == user_id)
            .scalar_subquery()
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

    # ---------------------------------------------------------------- payments (history)
    @staticmethod
    def get_user_payments(
        db: Session, user_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[Payment], int]:
        """User's payment history."""
        query = (
            db.query(Payment)
            .filter(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
        )
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    # ---------------------------------------------------------------- enforcement
    @staticmethod
    def enforce_property_quota(db: Session, user: User) -> None:
        """Raise ValueError if the user's agency has hit its listing cap."""
        agency = (
            db.query(AgencyMember)
            .filter(AgencyMember.user_id == user.id)
            .first()
        )
        if not agency:
            return

        now = datetime.now(UTC)
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.agency_id == agency.agency_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.expires_at >= now,
            )
            .first()
        )
        if not subscription:
            # No subscription -> free tier limits.
            max_properties = SUBSCRIPTION_PLANS[SubscriptionPlan.FREE]["max_properties"]
        else:
            max_properties = subscription.max_properties

        used = (
            db.query(Property)
            .filter(
                Property.agency_id == agency.agency_id,
                Property.status.notin_(
                    [PropertyStatus.ARCHIVED, PropertyStatus.BLOCKED]
                ),
            )
            .count()
        )
        if used >= max_properties:
            raise ValueError(
                f"Достигнут лимит объявлений агентства ({max_properties}). "
                "Оформите подписку PRO или ENTERPRISE."
            )


def _priority(promotion_type: PromotionType | str) -> int:
    product = get_product(promotion_type)
    return product.priority if product else 0
