"""Analytics routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_optional_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_market_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get overall market statistics."""
    return AnalyticsService.get_market_overview(db)


@router.get("/cities")
def get_city_stats(
    city_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get statistics by city."""
    return AnalyticsService.get_city_stats(db, city_id)


@router.get("/popular")
def get_popular_properties(
    limit: int = Query(10, ge=1, le=50),
    period_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get most viewed properties."""
    return AnalyticsService.get_popular_properties(db, limit, period_days)


@router.get("/price-distribution")
def get_price_distribution(
    city_id: int = Query(None),
    type_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get price distribution."""
    return AnalyticsService.get_price_distribution(db, city_id, type_id)


@router.get("/type-distribution")
def get_type_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get property count by type."""
    return AnalyticsService.get_type_distribution(db)