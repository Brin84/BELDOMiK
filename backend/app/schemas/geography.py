"""Geography schemas."""
from app.schemas.common import BaseSchema


class RegionBase(BaseSchema):
    name: str
    name_en: str | None = None
    sort_order: int = 0


class RegionCreate(RegionBase):
    pass


class RegionRead(RegionBase):
    id: int


# Aliases for backward compatibility with routes
RegionResponse = RegionRead


class CityBase(BaseSchema):
    region_id: int | None = None
    name: str
    name_en: str | None = None
    is_major: bool = False
    lat: float | None = None
    lng: float | None = None
    sort_order: int = 0


class CityCreate(CityBase):
    """Create a settlement. region_id optional — for user-added villages."""


class CityRead(CityBase):
    id: int


# Aliases for backward compatibility with routes
CityResponse = CityRead


class DistrictBase(BaseSchema):
    city_id: int
    name: str
    name_en: str | None = None
    sort_order: int = 0


class DistrictCreate(DistrictBase):
    pass


class DistrictRead(DistrictBase):
    id: int


# Aliases for backward compatibility with routes
DistrictResponse = DistrictRead


class NeighborhoodBase(BaseSchema):
    city_id: int
    district_id: int | None = None
    name: str
    name_en: str | None = None
    sort_order: int = 0


class NeighborhoodCreate(NeighborhoodBase):
    pass


class NeighborhoodRead(NeighborhoodBase):
    id: int


# Aliases for backward compatibility with routes
NeighborhoodResponse = NeighborhoodRead


class StreetBase(BaseSchema):
    city_id: int
    name: str
    name_en: str | None = None


class StreetCreate(StreetBase):
    pass


class StreetRead(StreetBase):
    id: int


# Aliases for backward compatibility with routes
StreetResponse = StreetRead


class MetroLineBase(BaseSchema):
    city_id: int
    name: str
    name_en: str | None = None
    color: str | None = None


class MetroLineCreate(MetroLineBase):
    pass


class MetroStationRead(BaseSchema):
    id: int
    line_id: int
    name: str
    name_en: str | None = None
    lat: float | None = None
    lng: float | None = None
    sort_order: int = 0


class MetroLineRead(MetroLineBase):
    id: int
    stations: list[MetroStationRead] = []


# Aliases for backward compatibility with routes
MetroLineResponse = MetroLineRead
MetroStationResponse = MetroStationRead


class MetroStationCreate(BaseSchema):
    line_id: int
    name: str
    name_en: str | None = None
    lat: float | None = None
    lng: float | None = None
    sort_order: int = 0
