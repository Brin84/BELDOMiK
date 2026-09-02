"""Property routes."""

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, get_optional_user
from app.core.config import settings
from app.models.property import Property, PropertyPhoto, PropertyPrice
from app.models.user import User
from app.schemas.property import (
    PropertyCreate,
    PropertyFilter,
    PropertyResponse,
    PropertyUpdate,
)
from app.services.property_service import PropertyListResponse, PropertyService
from app.services.upload_service import upload_service

router = APIRouter(prefix="/properties", tags=["Properties"])


@router.get("", response_model=PropertyListResponse)
def list_properties(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_id: int | None = Query(None, description="Property type ID (e.g. квартира, дом)"),
    operation_id: int | None = Query(None, description="Operation ID (buy/sell/rent)"),
    q: str | None = Query(None, description="Free-text search (address/description/location)"),
    city_id: int | None = Query(None),
    district_id: int | None = Query(None),
    neighborhood_id: int | None = Query(None),
    street_id: int | None = Query(None),
    rooms_count: int | None = Query(None),
    floor_min: int | None = Query(None),
    floor_max: int | None = Query(None),
    total_floors_min: int | None = Query(None),
    total_floors_max: int | None = Query(None),
    build_year_min: int | None = Query(None),
    build_year_max: int | None = Query(None),
    price_byn_min: int | None = Query(None),
    price_byn_max: int | None = Query(None),
    area_min: float | None = Query(None, description="total_area min, m²"),
    area_max: float | None = Query(None, description="total_area max, m²"),
    living_area_min: float | None = Query(None, description="living_area min, m²"),
    living_area_max: float | None = Query(None, description="living_area max, m²"),
    kitchen_area_min: float | None = Query(None, description="kitchen_area min, m²"),
    kitchen_area_max: float | None = Query(None, description="kitchen_area max, m²"),
    renovation: str | None = Query(None, description="cosmetic/eu/euro/design/none"),
    furniture: bool | None = Query(None),
    balcony: bool | None = Query(None),
    parking: bool | None = Query(None),
    elevator: bool | None = Query(None),
    metro_station_id: int | None = Query(None),
    metro_distance_max: int | None = Query(None, description="max distance to metro, meters"),
    bbox: str | None = Query(None, description="lat_min,lng_min,lat_max,lng_max"),
    with_photos_only: bool = Query(False),
    is_favorite_only: bool = Query(False),
    is_direct_only: bool = Query(False, description="only owner listings (без посредников)"),
    new_building_only: bool = Query(False, description="only new-build listings (новостройки)"),
    sort_by: str = Query("created_at", description="property column to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User | None = Depends(get_optional_user),
):
    """List properties with Krisha-style filters (Belarus only)."""
    filters = PropertyFilter(
        type_id=type_id,
        operation_id=operation_id,
        q=q,
        city_id=city_id,
        district_id=district_id,
        neighborhood_id=neighborhood_id,
        street_id=street_id,
        rooms_count=rooms_count,
        floor_min=floor_min,
        floor_max=floor_max,
        total_floors_min=total_floors_min,
        total_floors_max=total_floors_max,
        build_year_min=build_year_min,
        build_year_max=build_year_max,
        price_byn_min=price_byn_min,
        price_byn_max=price_byn_max,
        total_area_min=area_min,
        total_area_max=area_max,
        living_area_min=living_area_min,
        living_area_max=living_area_max,
        kitchen_area_min=kitchen_area_min,
        kitchen_area_max=kitchen_area_max,
        renovation=renovation,
        furniture=furniture,
        balcony=balcony,
        parking=parking,
        elevator=elevator,
        metro_station_id=metro_station_id,
        metro_distance_max=metro_distance_max,
        bbox=bbox,
        with_photos_only=with_photos_only,
        is_favorite_only=is_favorite_only,
        is_direct_only=is_direct_only,
        new_building_only=new_building_only,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    user_id = current_user.id if current_user else None
    return PropertyService.search_properties(db, filters, page, page_size, user_id)


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Get a single property by ID."""
    user_id = current_user.id if current_user else None
    property_obj = PropertyService.get_property(db, property_id, user_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    # «Без посредников» — вычисляется из отсутствия агентства (нет поля на ORM).
    property_obj.is_direct = property_obj.agency_id is None
    return PropertyResponse.model_validate(property_obj)


@router.post("", response_model=PropertyResponse, status_code=201)
def create_property(
    data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new property."""
    property_obj = PropertyService.create_property(db, current_user.id, data)
    return PropertyResponse.model_validate(property_obj)


@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a property."""
    property_obj = PropertyService.update_property(db, property_id, current_user.id, data)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found or not owned")
    return PropertyResponse.model_validate(property_obj)


@router.post("/{property_id}/submit", response_model=PropertyResponse)
def submit_for_moderation(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit property for moderation."""
    property_obj = PropertyService.submit_for_moderation(db, property_id, current_user.id)
    if not property_obj:
        raise HTTPException(
            status_code=404,
            detail="Property not found, not owned, or cannot be submitted",
        )
    return PropertyResponse.model_validate(property_obj)


@router.delete("/{property_id}")
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a property."""
    success = PropertyService.delete_property(db, property_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Property not found or not owned")
    return {"message": "Property deleted successfully"}


@router.get("/user/my", response_model=list[PropertyResponse])
def get_my_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's properties."""
    properties = db.query(Property).filter(Property.owner_id == current_user.id).all()
    return [PropertyResponse.model_validate(p) for p in properties]


@router.post("/{property_id}/photos", response_model=dict)
def add_photo(
    property_id: int,
    photo_url: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a photo to a property (URL-based). Main photo = sort_order 0."""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj or property_obj.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Property not found or not owned")

    photo = PropertyPhoto(
        property_id=property_id,
        url=photo_url,
        sort_order=0,
    )
    db.add(photo)
    db.commit()
    return {"message": "Photo added", "id": photo.id}


@router.post("/{property_id}/photos/upload", response_model=dict)
async def upload_photos(
    property_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload multiple photos to a property (multipart form)."""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj or property_obj.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Property not found or not owned")

    if len(files) > settings.MAX_IMAGES_PER_PROPERTY:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.MAX_IMAGES_PER_PROPERTY} images per batch",
        )
    existing_count = (
        db.query(PropertyPhoto).filter(PropertyPhoto.property_id == property_id).count()
    )
    if existing_count + len(files) > settings.MAX_IMAGES_PER_PROPERTY:
        raise HTTPException(
            status_code=400,
            detail="Property already has the maximum number of images",
        )

    uploaded_photos = []
    for index, file in enumerate(files):
        # Validate and upload (server-side compression in upload_service)
        success, url, error = await upload_service.upload_upload_file(file, property_id)
        if not success:
            raise HTTPException(status_code=400, detail=error or "Upload failed")

        # Main photo is the one with sort_order 0 (the schema has no is_main
        # column — photos are ordered by sort_order). First uploaded photo
        # becomes main if none exists yet; the flag is returned for API
        # convenience only.
        has_main = (
            db.query(PropertyPhoto.id)
            .filter(
                PropertyPhoto.property_id == property_id,
                PropertyPhoto.sort_order == 0,
            )
            .first()
        )
        is_main = not has_main and index == 0

        photo = PropertyPhoto(
            property_id=property_id,
            url=url,
            sort_order=index,
        )
        db.add(photo)
        db.flush()  # populate photo.id so the response includes a real id
        uploaded_photos.append({"id": photo.id, "url": url, "is_main": is_main})

    db.commit()
    return {"message": f"Uploaded {len(uploaded_photos)} photos", "photos": uploaded_photos}


@router.post("/{property_id}/price", response_model=dict)
def update_price(
    property_id: int,
    price_byn: int = Body(..., embed=True),
    price_usd: int | None = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update property price (creates history record)."""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj or property_obj.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Property not found or not owned")

    # Deactivate current price
    db.query(PropertyPrice).filter(
        PropertyPrice.property_id == property_id,
        PropertyPrice.is_current == True,
    ).update({"is_current": False})

    # Calculate price_per_m2
    price_per_m2 = None
    if property_obj.total_area and property_obj.total_area > 0:
        price_per_m2 = price_byn // int(property_obj.total_area)

    new_price = PropertyPrice(
        property_id=property_id,
        price_byn=price_byn,
        price_usd=price_usd,
        price_per_m2_byn=price_per_m2,
        is_current=True,
    )
    db.add(new_price)
    db.commit()

    return {"message": "Price updated", "price_per_m2_byn": price_per_m2}
