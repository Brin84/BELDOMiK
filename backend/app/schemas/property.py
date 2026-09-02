"""Property schemas."""
from datetime import datetime

from app.schemas.common import BaseSchema


class PropertyPhotoBase(BaseSchema):
    url: str
    thumbnail_url: str | None = None
    webp_url: str | None = None
    avif_url: str | None = None
    sort_order: int = 0
    width: int | None = None
    height: int | None = None
    file_size: int | None = None
    mime_type: str | None = None


class PropertyPhotoCreate(BaseSchema):
    url: str
    thumbnail_url: str | None = None
    webp_url: str | None = None
    avif_url: str | None = None
    width: int | None = None
    height: int | None = None
    file_size: int | None = None
    mime_type: str | None = None


class PropertyPhotoRead(PropertyPhotoBase):
    id: int
    property_id: int
    created_at: datetime


class PropertyFeatureBase(BaseSchema):
    feature_key: str
    feature_value: str


class PropertyFeatureCreate(PropertyFeatureBase):
    pass


class PropertyFeatureRead(PropertyFeatureBase):
    id: int
    property_id: int


class PropertyPriceBase(BaseSchema):
    price_byn: int
    price_usd: int | None = None
    price_per_m2_byn: int | None = None
    price_per_m2_usd: int | None = None
    exchange_rate: float | None = None
    change_reason: str | None = None


class PropertyPriceRead(PropertyPriceBase):
    id: int
    property_id: int
    is_current: bool
    changed_at: datetime


class PropertyBase(BaseSchema):
    type_id: int
    operation_id: int
    city_id: int
    district_id: int | None = None
    neighborhood_id: int | None = None
    street_id: int | None = None
    metro_station_id: int | None = None
    metro_distance: int | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    build_year: int | None = None
    total_area: float | None = None
    living_area: float | None = None
    kitchen_area: float | None = None
    rooms_count: int | None = None
    renovation: str | None = None
    furniture: bool = False
    balcony: bool = False
    parking: bool = False
    elevator: bool = False
    is_new_building: bool = False
    description: str | None = None


class PropertyCreate(PropertyBase):
    photos: list[PropertyPhotoCreate] = []
    features: list[PropertyFeatureCreate] = []
    price_byn: int


class PropertyUpdate(BaseSchema):
    district_id: int | None = None
    neighborhood_id: int | None = None
    street_id: int | None = None
    metro_station_id: int | None = None
    metro_distance: int | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    build_year: int | None = None
    total_area: float | None = None
    living_area: float | None = None
    kitchen_area: float | None = None
    rooms_count: int | None = None
    renovation: str | None = None
    furniture: bool | None = None
    balcony: bool | None = None
    parking: bool | None = None
    elevator: bool | None = None
    is_new_building: bool | None = None
    description: str | None = None


class PropertyShortRead(BaseSchema):
    """Minimal property data for list views."""
    id: int
    type_id: int
    operation_id: int
    city_id: int
    district_id: int | None = None
    neighborhood_id: int | None = None
    street_id: int | None = None
    metro_station_id: int | None = None
    metro_distance: int | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    build_year: int | None = None
    total_area: float | None = None
    living_area: float | None = None
    kitchen_area: float | None = None
    rooms_count: int | None = None
    renovation: str | None = None
    furniture: bool = False
    balcony: bool = False
    parking: bool = False
    elevator: bool = False
    is_new_building: bool = False
    description: str | None = None
    status: str
    views_count: int = 0
    favorites_count: int = 0
    created_at: datetime
    updated_at: datetime
    # Joined fields
    price_byn: int | None = None
    price_usd: int | None = None
    price_per_m2_byn: int | None = None
    photo_url: str | None = None
    photo_count: int = 0
    city_name: str | None = None
    district_name: str | None = None
    neighborhood_name: str | None = None
    street_name: str | None = None
    metro_station_name: str | None = None
    type_name: str | None = None
    operation_name: str | None = None
    owner_id: int
    owner_name: str | None = None
    is_favorite: bool = False
    is_direct: bool = False  # «без посредников» (собственник, без агентства)


class PropertyRead(PropertyShortRead):
    """Full property data."""
    agency_id: int | None = None
    photos: list[PropertyPhotoRead] = []
    features: list[PropertyFeatureRead] = []
    price_history: list[PropertyPriceRead] = []
    published_at: datetime | None = None


# Aliases for backward compatibility with routes
PropertyResponse = PropertyRead


class PropertyPriceHistoryResponse(BaseSchema):
    history: list[PropertyPriceRead]


class PropertyPriceAnalysisResponse(BaseSchema):
    current_price_byn: int
    similar_avg_byn: int | None = None
    deviation_percent: float | None = None
    assessment: str | None = None  # good, fair, high, unknown
    similar_count: int = 0
    message: str | None = None


class FavoriteResponse(BaseSchema):
    id: int
    user_id: int
    property_id: int
    created_at: datetime


class SavedSearchBase(BaseSchema):
    name: str | None = None
    filters_json: str
    notify_frequency: str = "daily"
    is_active: bool = True


class SavedSearchCreate(SavedSearchBase):
    pass


class SavedSearchUpdate(BaseSchema):
    name: str | None = None
    filters_json: str | None = None
    notify_frequency: str | None = None
    is_active: bool | None = None


class SavedSearchRead(SavedSearchBase):
    id: int
    user_id: int
    last_notified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# Aliases for backward compatibility with routes
SavedSearchResponse = SavedSearchRead


class PriceUpdateRequest(BaseSchema):
    price_byn: int
    change_reason: str | None = None


# Filters for search
class PropertyFilterParams(BaseSchema):
    city_id: int | None = None
    region_id: int | None = None
    district_id: int | None = None
    neighborhood_id: int | None = None
    street_id: int | None = None
    type_id: int | None = None
    operation_id: int | None = None
    q: str | None = None  # free-text search (address/description/location)
    rooms_count: int | None = None
    floor_min: int | None = None
    floor_max: int | None = None
    total_floors_min: int | None = None
    total_floors_max: int | None = None
    build_year_min: int | None = None
    build_year_max: int | None = None
    total_area_min: float | None = None
    total_area_max: float | None = None
    living_area_min: float | None = None
    living_area_max: float | None = None
    kitchen_area_min: float | None = None
    kitchen_area_max: float | None = None
    price_byn_min: int | None = None
    price_byn_max: int | None = None
    renovation: str | None = None
    furniture: bool | None = None
    balcony: bool | None = None
    parking: bool | None = None
    elevator: bool | None = None
    metro_station_id: int | None = None
    metro_distance_max: int | None = None
    lat_min: float | None = None
    lat_max: float | None = None
    lng_min: float | None = None
    lng_max: float | None = None
    bbox: str | None = None  # "lat_min,lng_min,lat_max,lng_max"
    is_direct_only: bool = False  # без посредников (только собственники)
    new_building_only: bool = False  # только новостройки (застройщики)
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    page_size: int = 20
    with_photos_only: bool = False
    is_favorite_only: bool = False


# Aliases for backward compatibility with routes
PropertyFilter = PropertyFilterParams
