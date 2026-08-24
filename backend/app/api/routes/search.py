"""Search and comparison routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/map")
def search_map(
    lat_min: float = Query(...),
    lng_min: float = Query(...),
    lat_max: float = Query(...),
    lng_max: float = Query(...),
    type_id: int | None = Query(None),
    operation_id: int | None = Query(None),
    price_byn_min: int | None = Query(None),
    price_byn_max: int | None = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Get properties within bounding box for map display."""
    filters = {}
    if type_id:
        filters["type_id"] = type_id
    if operation_id:
        filters["operation_id"] = operation_id
    if price_byn_min:
        filters["price_byn_min"] = price_byn_min
    if price_byn_max:
        filters["price_byn_max"] = price_byn_max

    user_id = current_user.id if current_user else None
    results = SearchService.get_properties_for_map(
        db, lat_min, lng_min, lat_max, lng_max, filters, limit, user_id
    )
    return {"properties": results, "count": len(results)}


@router.get("/compare")
def compare_properties(
    ids: str = Query(..., description="Comma-separated property IDs"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Compare multiple properties."""
    try:
        property_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid property IDs format") from None

    if len(property_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 properties required for comparison")

    if len(property_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 properties for comparison")

    results = SearchService.compare_properties(db, property_ids)
    return {"properties": results}