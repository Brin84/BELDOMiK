"""Monetization routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_admin_user, get_current_user, get_db
from app.models.user import User
from app.schemas.monetization import (
    PaymentResponse,
    PromotionCreate,
    PromotionResponse,
    SubscriptionCreate,
    SubscriptionResponse,
)
from app.services.monetization_service import MonetizationService

router = APIRouter(prefix="/monetization", tags=["Monetization"])


# Public promotions
@router.get("/promotions", response_model=list[PromotionResponse])
def get_promotions(db: Session = Depends(get_db)):
    """Get available promotions."""
    return MonetizationService.get_available_promotions(db)


# Admin promotions management
@router.post("/promotions", response_model=PromotionResponse)
def create_promotion(
    data: PromotionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Create a new promotion (admin only)."""
    return MonetizationService.create_promotion(
        db,
        data.name,
        data.description,
        data.price_byn,
        data.duration_days,
        data.features,
        data.sort_order,
    )


# User promotions
@router.post("/properties/{property_id}/promotions/{promotion_id}")
def apply_promotion(
    property_id: int,
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply promotion to a property."""
    result = MonetizationService.apply_promotion(db, property_id, promotion_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/properties/{property_id}/promotions", response_model=list[PromotionResponse])
def get_property_promotions(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active promotions for a property."""
    return MonetizationService.get_property_promotions(db, property_id)


# Subscriptions
@router.post("/subscriptions", response_model=SubscriptionResponse)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a subscription (placeholder for payment integration)."""
    # This would integrate with payment provider
    raise HTTPException(status_code=501, detail="Subscription payment integration pending")


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
def get_user_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's active subscriptions."""
    return MonetizationService.get_user_subscriptions(db, current_user.id)


# Payments
@router.get("/payments", response_model=list[PaymentResponse])
def get_user_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's payment history."""
    payments, total = MonetizationService.get_user_payments(db, current_user.id, page, page_size)
    return {
        "items": [PaymentResponse.model_validate(p) for p in payments],
        "total": total,
        "page": page,
        "page_size": page_size,
    }