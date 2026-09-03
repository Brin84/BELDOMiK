"""Monetization schemas: catalog, promotions, subscriptions, payments."""
from datetime import datetime

from app.schemas.common import BaseSchema


# ── Promotion catalog ────────────────────────────────────────────
class PromotionCatalogItem(BaseSchema):
    """Static promotion product from the catalog."""
    type: str
    label: str
    price_byn: int
    duration_days: int
    priority: int
    badge_color: str
    features: list[str]


class PromotionRead(BaseSchema):
    """Applied promotion record (DB row)."""
    id: int
    property_id: int
    type: str
    status: str
    started_at: datetime | None = None
    expires_at: datetime
    price_byn: int


class PromoteRequest(BaseSchema):
    """Request to promote a property."""
    promotion_type: str


# ── Payments ─────────────────────────────────────────────────────
class PaymentCheckoutResponse(BaseSchema):
    """Response after initiating a payment: checkout info."""
    payment_id: int
    amount_byn: int
    currency: str = "BYN"
    provider: str
    confirmation: dict


class PaymentRead(BaseSchema):
    """Payment record."""
    id: int
    user_id: int | None = None
    agency_id: int | None = None
    property_id: int | None = None
    promotion_id: int | None = None
    subscription_id: int | None = None
    amount_byn: int
    currency: str = "BYN"
    status: str
    provider: str | None = None
    payment_link: str | None = None
    description: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


# ── Subscriptions ────────────────────────────────────────────────
class SubscriptionCreate(BaseSchema):
    """Create/upgrade a subscription plan."""
    plan: str  # SubscriptionPlan value: free / pro / enterprise
    agency_id: int


class SubscriptionRead(BaseSchema):
    """Subscription record."""
    id: int
    agency_id: int
    plan: str
    status: str
    started_at: datetime | None = None
    expires_at: datetime
    max_properties: int
    max_promotions: int
    has_analytics: bool
    has_team: bool
    team_size: int


class SubscriptionPlanInfo(BaseSchema):
    """Public info about a subscription plan."""
    plan: str
    label: str
    price_byn: int
    duration_days: int
    max_properties: int
    max_promotions: int
    has_analytics: bool
    has_team: bool
    team_size: int
    features: list[str]
