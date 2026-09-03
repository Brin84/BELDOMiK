"""Monetization routes: promotions catalog, promote, payments, subscriptions."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.monetization import (
    PaymentCheckoutResponse,
    PaymentRead,
    PromotionCatalogItem,
    PromotionRead,
    PromoteRequest,
    SubscriptionCreate,
    SubscriptionRead,
    SubscriptionPlanInfo,
)
from app.services.monetization_service import MonetizationService, SUBSCRIPTION_PLANS
from app.services.payments.base import PaymentCheckout

router = APIRouter(prefix="/monetization", tags=["Monetization"])


# ── Promotion catalog (public) ───────────────────────────────────
@router.get("/promotions", response_model=list[PromotionCatalogItem])
def get_promotions_catalog():
    """Return the static promotion catalog."""
    items = MonetizationService.get_available_promotions()
    return [PromotionCatalogItem(**item) for item in items]


# ── Subscription plans (public) ──────────────────────────────────
@router.get("/plans", response_model=list[SubscriptionPlanInfo])
def get_subscription_plans():
    """Return available subscription plans with limits and features."""
    from app.models.monetization import SubscriptionPlan

    plan_features = {
        SubscriptionPlan.FREE: [
            "До 10 объявлений",
            "Базовый функционал",
        ],
        SubscriptionPlan.PRO: [
            "До 50 объявлений",
            "До 10 продвижений",
            "Аналитика",
            "Команда до 5 человек",
        ],
        SubscriptionPlan.ENTERPRISE: [
            "До 500 объявлений",
            "До 100 продвижений",
            "Аналитика",
            "Команда до 20 человек",
            "Приоритетная поддержка",
        ],
    }
    result = []
    for plan, config in SUBSCRIPTION_PLANS.items():
        result.append(SubscriptionPlanInfo(
            plan=plan.value,
            label=plan.value.capitalize(),
            price_byn=config["price_byn"],
            duration_days=config["duration_days"],
            max_properties=config["max_properties"],
            max_promotions=config["max_promotions"],
            has_analytics=config["has_analytics"],
            has_team=config["has_team"],
            team_size=config["team_size"],
            features=plan_features.get(plan, []),
        ))
    return result


# ── Promote a property ───────────────────────────────────────────
@router.post("/properties/{property_id}/promote", response_model=PaymentCheckoutResponse)
def promote_property(
    property_id: int,
    data: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initiate a promotion payment for a property."""
    try:
        checkout = MonetizationService.promote_property(
            db, property_id, data.promotion_type, current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PaymentCheckoutResponse(
        payment_id=checkout.payment_id,
        amount_byn=checkout.amount_byn,
        currency=checkout.currency,
        provider=checkout.provider,
        confirmation=checkout.confirmation,
    )


# ── Active promotions for a property (public) ────────────────────
@router.get("/properties/{property_id}/promotions", response_model=list[PromotionRead])
def get_property_promotions(
    property_id: int,
    db: Session = Depends(get_db),
):
    """Get active promotions for a property."""
    promos = MonetizationService.get_property_promotions(db, property_id)
    return [PromotionRead.model_validate(p) for p in promos]


# ── Confirm payment ──────────────────────────────────────────────
@router.post("/payments/{payment_id}/confirm", response_model=PaymentRead)
def confirm_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm a pending payment (mock auto-confirms in dev)."""
    try:
        payment = MonetizationService.confirm_payment(db, payment_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PaymentRead.model_validate(payment)


# ── Subscriptions ────────────────────────────────────────────────
@router.post("/subscriptions", response_model=PaymentCheckoutResponse | SubscriptionRead)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or upgrade a subscription plan for an agency."""
    try:
        result = MonetizationService.create_subscription(
            db, data.plan, data.agency_id, current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # FREE plan returns Subscription directly; paid returns checkout.
    if isinstance(result, PaymentCheckout):
        return PaymentCheckoutResponse(**result.__dict__)
    return SubscriptionRead.model_validate(result)


@router.get("/subscriptions", response_model=list[SubscriptionRead])
def get_user_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active subscriptions for the user's agencies."""
    subs = MonetizationService.get_user_subscriptions(db, current_user.id)
    return [SubscriptionRead.model_validate(s) for s in subs]


# ── Payment history ──────────────────────────────────────────────
@router.get("/payments", response_model=PaginatedResponse[PaymentRead])
def get_user_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's payment history (paginated)."""
    payments, total = MonetizationService.get_user_payments(
        db, current_user.id, page, page_size
    )
    total_pages = max(1, -(-total // page_size))
    return PaginatedResponse(
        items=[PaymentRead.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
