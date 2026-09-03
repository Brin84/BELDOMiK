"""Monetization models (promotions, subscriptions, payments)."""
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class PromotionType(StrEnum):
    TOP = "top"
    VIP = "vip"
    BUMP_UP = "bump_up"
    HIGHLIGHT = "highlight"
    PIN = "pin"


class PromotionStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Promotion(Base):
    """Property promotion (paid feature)."""
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    type = Column(Enum(PromotionType), nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    price_byn = Column(Integer, nullable=False)
    status = Column(
        Enum(PromotionStatus),
        default=PromotionStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Relationships
    property = relationship("Property", back_populates="promotions")


class SubscriptionPlan(StrEnum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class Subscription(Base):
    """Agency subscription."""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False, index=True)
    plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.FREE, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    max_properties = Column(Integer, default=10, nullable=False)
    max_promotions = Column(Integer, default=0, nullable=False)
    has_analytics = Column(Boolean, default=False, nullable=False)
    has_team = Column(Boolean, default=False, nullable=False)
    team_size = Column(Integer, default=1, nullable=False)


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    """Payment record."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True, index=True)
    amount_byn = Column(Integer, nullable=False)
    currency = Column(String(3), default="BYN", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    provider = Column(String(50), nullable=True)
    provider_payment_id = Column(String(200), nullable=True, index=True)
    payment_link = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)