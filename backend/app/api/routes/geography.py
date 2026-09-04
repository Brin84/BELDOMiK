"""Geography routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.geography import (
    City,
    District,
    MetroLine,
    MetroStation,
    Neighborhood,
    Region,
    Street,
)
from app.models.user import User
from app.schemas.geography import (
    CityCreate,
    CityResponse,
    DistrictResponse,
    MetroLineResponse,
    MetroStationResponse,
    NeighborhoodResponse,
    RegionResponse,
    StreetResponse,
)

router = APIRouter(prefix="/geography", tags=["Geography"])


def _find_existing_city(db: Session, name: str, region_id: int | None) -> City | None:
    """Find a settlement by name, case-insensitive (Cyrillic-safe).

    SQLite's SQL `lower()` handles only ASCII, so a pure-SQL compare would miss
    case differences in Cyrillic words. Do an exact (indexed) hit first, then a
    Python-side casefold fallback.
    """
    name_key = name.casefold()

    query = db.query(City).filter(City.name == name)
    if region_id is not None:
        query = query.filter(City.region_id == region_id)
    exact = query.first()
    if exact:
        return exact

    # Fallback: scan matching rows and compare in Python.
    fallback = db.query(City)
    if region_id is not None:
        fallback = fallback.filter(City.region_id == region_id)
    for city in fallback.all():
        if city.name.casefold() == name_key:
            return city
    return None


@router.get("/regions", response_model=list[RegionResponse])
def get_regions(db: Session = Depends(get_db)):
    """Get all regions of Belarus."""
    return db.query(Region).order_by(Region.name).all()


@router.get("/cities", response_model=list[CityResponse])
def get_cities(
    region_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get cities, optionally filtered by region."""
    query = db.query(City)
    if region_id:
        query = query.filter(City.region_id == region_id)
    return query.order_by(City.sort_order, City.name).all()


@router.post("/cities", response_model=CityResponse, status_code=201)
def create_city(
    payload: CityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a user-created settlement (village/town) not present in the list.

    Idempotent: if a settlement with the same name already exists (in the same
    region when one is given, otherwise anywhere), it is returned instead of
    creating a duplicate.
    """
    name = payload.name.strip()[:100]
    if not name:
        raise HTTPException(status_code=422, detail="Название населённого пункта не может быть пустым")

    existing = _find_existing_city(db, name, payload.region_id)
    if existing:
        return existing

    if payload.region_id is not None:
        region = db.query(Region).filter(Region.id == payload.region_id).first()
        if not region:
            raise HTTPException(status_code=422, detail="Регион не найден")

    city = City(
        region_id=payload.region_id,
        name=name,
        is_major=False,
        sort_order=1000,
    )
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


@router.get("/districts", response_model=list[DistrictResponse])
def get_districts(
    city_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Get districts for a city."""
    return db.query(District).filter(District.city_id == city_id).order_by(District.name).all()


@router.get("/neighborhoods", response_model=list[NeighborhoodResponse])
def get_neighborhoods(
    district_id: int | None = Query(None),
    city_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get neighborhoods, filtered by district or city."""
    query = db.query(Neighborhood)
    if district_id:
        query = query.filter(Neighborhood.district_id == district_id)
    if city_id:
        query = query.filter(Neighborhood.city_id == city_id)
    return query.order_by(Neighborhood.name).all()


@router.get("/streets", response_model=list[StreetResponse])
def get_streets(
    city_id: int = Query(...),
    district_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get streets for a city/district."""
    query = db.query(Street).filter(Street.city_id == city_id)
    if district_id:
        query = query.filter(Street.district_id == district_id)
    return query.order_by(Street.name).all()


@router.get("/metro", response_model=list[MetroStationResponse])
def get_metro_stations(
    city_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get metro stations, optionally by city."""
    query = db.query(MetroStation)
    if city_id:
        query = query.join(MetroLine).filter(MetroLine.city_id == city_id)
    return query.order_by(MetroStation.line_id, MetroStation.name).all()


@router.get("/metro-lines", response_model=list[MetroLineResponse])
def get_metro_lines(
    city_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get metro lines, optionally by city."""
    query = db.query(MetroLine)
    if city_id:
        query = query.filter(MetroLine.city_id == city_id)
    return query.order_by(MetroLine.name).all()