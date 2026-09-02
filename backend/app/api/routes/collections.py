"""Collections routes."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.collection import CollectionItem
from app.models.geography import City, District, MetroStation, Neighborhood, Street
from app.models.property import Favorite, Property, PropertyPhoto, PropertyPrice
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.schemas.collection import (
    CollectionCreate,
    CollectionItemCreate,
    CollectionRead,
    CollectionUpdate,
)
from app.schemas.common import BaseSchema
from app.schemas.property import PropertyShortRead
from app.services.collection_service import CollectionService

router = APIRouter(prefix="/collections", tags=["Collections"])


class CollectionDetailResponse(BaseSchema):
    """Collection with its properties."""
    id: int
    user_id: int
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[PropertyShortRead]


@router.post("", response_model=CollectionRead, status_code=201)
def create_collection(
    data: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new collection."""
    collection = CollectionService.create_collection(
        db, current_user.id, data.name, data.description
    )
    return CollectionRead(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        property_count=0,
    )


@router.get("", response_model=list[CollectionRead])
def list_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's collections."""
    collections = CollectionService.get_user_collections(db, current_user.id)
    return [
        CollectionRead(
            id=c.id,
            user_id=c.user_id,
            name=c.name,
            description=c.description,
            created_at=c.created_at,
            updated_at=c.updated_at,
            property_count=CollectionService.get_item_count(db, c.id),
        )
        for c in collections
    ]


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
def get_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a collection with its properties."""
    collection = CollectionService.get_user_collection(db, collection_id, current_user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    property_ids = CollectionService.get_collection_property_ids(db, collection_id, current_user.id)
    items = _build_property_items(db, property_ids, current_user.id) if property_ids else []

    return CollectionDetailResponse(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        items=items,
    )


@router.patch("/{collection_id}", response_model=CollectionRead)
def update_collection(
    collection_id: int,
    data: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a collection (owner only)."""
    collection = CollectionService.update_collection(
        db, collection_id, current_user.id, data.name, data.description
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return CollectionRead(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        property_count=CollectionService.get_item_count(db, collection.id),
    )


@router.delete("/{collection_id}")
def delete_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a collection (owner only)."""
    success = CollectionService.delete_collection(db, collection_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Collection deleted"}


@router.post("/{collection_id}/items", status_code=201)
def add_item(
    collection_id: int,
    data: CollectionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a property to a collection."""
    item = CollectionService.add_item(db, collection_id, current_user.id, data.property_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Collection or property not found")
    return {"message": "Property added to collection", "property_id": data.property_id}


@router.delete("/{collection_id}/items/{property_id}")
def remove_item(
    collection_id: int,
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a property from a collection."""
    success = CollectionService.remove_item(db, collection_id, current_user.id, property_id)
    if not success:
        raise HTTPException(status_code=404, detail="Collection or item not found")
    return {"message": "Property removed from collection"}


def _build_property_items(db: Session, property_ids: list[int], user_id: int) -> list[PropertyShortRead]:
    """Build PropertyShortRead items for properties in a collection (same shape as favorites)."""
    if not property_ids:
        return []

    query = (
        db.query(
            Property,
            PropertyPrice.price_byn,
            PropertyPrice.price_usd,
            PropertyPrice.price_per_m2_byn,
            func.count(PropertyPhoto.id).label("photo_count"),
            func.min(PropertyPhoto.url).label("photo_url"),
            City.name.label("city_name"),
            District.name.label("district_name"),
            Neighborhood.name.label("neighborhood_name"),
            Street.name.label("street_name"),
            MetroStation.name.label("metro_station_name"),
            PropertyType.name.label("type_name"),
            OperationType.name.label("operation_name"),
            Favorite.id.isnot(None).label("is_favorite"),
        )
        .filter(Property.id.in_(property_ids))
        .outerjoin(PropertyPrice, and_(
            PropertyPrice.property_id == Property.id,
            PropertyPrice.is_current == True,
        ))
        .outerjoin(PropertyPhoto, PropertyPhoto.property_id == Property.id)
        .join(City, City.id == Property.city_id)
        .outerjoin(District, District.id == Property.district_id)
        .outerjoin(Neighborhood, Neighborhood.id == Property.neighborhood_id)
        .outerjoin(Street, Street.id == Property.street_id)
        .outerjoin(MetroStation, MetroStation.id == Property.metro_station_id)
        .join(PropertyType, PropertyType.id == Property.type_id)
        .join(OperationType, OperationType.id == Property.operation_id)
        .outerjoin(Favorite, and_(
            Favorite.property_id == Property.id,
            Favorite.user_id == user_id,
        ))
        .group_by(
            Property.id,
            PropertyPrice.price_byn,
            PropertyPrice.price_usd,
            PropertyPrice.price_per_m2_byn,
            City.name,
            District.name,
            Neighborhood.name,
            Street.name,
            MetroStation.name,
            PropertyType.name,
            OperationType.name,
            Favorite.id,
        )
    )

    items = []
    for row in query.all():
        prop = row[0]
        items.append(PropertyShortRead(
            id=prop.id,
            type_id=prop.type_id,
            operation_id=prop.operation_id,
            city_id=prop.city_id,
            district_id=prop.district_id,
            neighborhood_id=prop.neighborhood_id,
            street_id=prop.street_id,
            metro_station_id=prop.metro_station_id,
            metro_distance=prop.metro_distance,
            address=prop.address,
            lat=prop.lat,
            lng=prop.lng,
            total_area=prop.total_area,
            living_area=prop.living_area,
            kitchen_area=prop.kitchen_area,
            rooms_count=prop.rooms_count,
            floor=prop.floor,
            total_floors=prop.total_floors,
            build_year=prop.build_year,
            renovation=prop.renovation,
            furniture=prop.furniture,
            balcony=prop.balcony,
            parking=prop.parking,
            elevator=prop.elevator,
            is_new_building=prop.is_new_building,
            description=prop.description,
            status=prop.status.value if hasattr(prop.status, 'value') else str(prop.status),
            views_count=prop.views_count,
            favorites_count=prop.favorites_count,
            created_at=prop.created_at,
            updated_at=prop.updated_at,
            owner_id=prop.owner_id,
            price_byn=row[1],
            price_usd=row[2],
            price_per_m2_byn=row[3],
            photo_url=row[5],
            photo_count=row[4],
            city_name=row[6],
            district_name=row[7],
            neighborhood_name=row[8],
            street_name=row[9],
            metro_station_name=row[10],
            type_name=row[11],
            operation_name=row[12],
            owner_name=prop.owner.first_name if prop.owner else None,
            is_favorite=bool(row[13]),
            is_direct=prop.agency_id is None,
        ))
    return items
