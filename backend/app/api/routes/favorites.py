"""Favorites routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.common import BaseSchema
from app.schemas.property import PropertyShortRead
from app.services.favorite_service import FavoriteService

router = APIRouter(prefix="/favorites", tags=["Favorites"])


class FavoritesListResponse(BaseSchema):
    """Response for favorites list endpoint."""
    items: list[PropertyShortRead]
    total: int
    page: int
    page_size: int
    pages: int


@router.post("/{property_id}")
def add_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add property to favorites."""
    favorite = FavoriteService.add_favorite(db, current_user.id, property_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Added to favorites"}


@router.delete("/{property_id}")
def remove_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove property from favorites."""
    success = FavoriteService.remove_favorite(db, current_user.id, property_id)
    if not success:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Removed from favorites"}


@router.get("", response_model=FavoritesListResponse)
def list_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(500, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's favorite properties."""
    favorites, total = FavoriteService.get_user_favorites(db, current_user.id, page, page_size)

    items = []
    for (
        fav,
        price_byn,
        price_usd,
        price_per_m2,
        photo_count,
        photo_url,
        city_name,
        district_name,
        neighborhood_name,
        street_name,
        metro_name,
        type_name,
        operation_name,
    ) in favorites:
        items.append(PropertyShortRead(
            id=fav.id,
            type_id=fav.type_id,
            operation_id=fav.operation_id,
            city_id=fav.city_id,
            district_id=fav.district_id,
            neighborhood_id=fav.neighborhood_id,
            street_id=fav.street_id,
            metro_station_id=fav.metro_station_id,
            address=fav.address,
            lat=fav.lat,
            lng=fav.lng,
            total_area=fav.total_area,
            living_area=fav.living_area,
            kitchen_area=fav.kitchen_area,
            rooms_count=fav.rooms_count,
            floor=fav.floor,
            total_floors=fav.total_floors,
            build_year=fav.build_year,
            renovation=fav.renovation,
            furniture=fav.furniture,
            balcony=fav.balcony,
            parking=fav.parking,
            elevator=fav.elevator,
            metro_distance=fav.metro_distance,
            status=fav.status.value if hasattr(fav.status, 'value') else str(fav.status),
            views_count=fav.views_count,
            favorites_count=fav.favorites_count,
            created_at=fav.created_at,
            updated_at=fav.updated_at,
            owner_id=fav.owner_id,
            price_byn=price_byn,
            price_usd=price_usd,
            price_per_m2_byn=price_per_m2,
            photo_url=photo_url,
            photo_count=photo_count,
            city_name=city_name,
            district_name=district_name,
            neighborhood_name=neighborhood_name,
            street_name=street_name,
            metro_station_name=metro_name,
            type_name=type_name,
            operation_name=operation_name,
            owner_name=fav.owner.first_name if fav.owner else None,
        ))

    pages = (total + page_size - 1) // page_size
    return FavoritesListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/check/{property_id}")
def check_favorite(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if property is in favorites."""
    is_fav = FavoriteService.is_favorite(db, current_user.id, property_id)
    return {"is_favorite": is_fav}


@router.get("/ids")
def get_favorite_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all favorite property IDs."""
    ids = FavoriteService.get_favorite_ids(db, current_user.id)
    return {"favorite_ids": ids}