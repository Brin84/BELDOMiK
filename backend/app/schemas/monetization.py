"""Monetization schemas."""
from datetime import datetime

from pydantic import BaseModel


class PromotionCreate(BaseModel):
    """Create promotion."""
    name: str
    description: str | None = None
    price_byn: int
    duration_days: int
    features: list[str] = []
    sort_order: int = 0


class PromotionResponse(BaseModel):
    """Promotion response."""
    id: int
    name: str
    description: str | None = None
    price_byn: int
    duration_days: int
    features: list[str] = []
    sort_order: int
    is_active: bool
    start_date: datetime
    end_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionCreate(BaseModel):
    """Create subscription."""
    promotion_id: int
    auto_renew: bool = True


class SubscriptionResponse(BaseModel):
    """Subscription response."""
    id: int
    user_id: int
    promotion_id: int
    start_date: datetime
    end_date: datetime
    is_active: bool
    auto_renew: bool

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    """Payment response."""
    id: int
    user_id: int
    property_id: int | None = None
    promotion_id: int | None = None
    subscription_id: int | None = None
    amount_byn: int
    currency: str
    status: str
    external_id: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}