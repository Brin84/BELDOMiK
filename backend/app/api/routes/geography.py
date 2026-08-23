"""Geography routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.geography import (
    City,
    District,
    MetroLine,
    MetroStation,
    Neighborhood,
    Region,
    Street,
)
from app.schemas.geography import (
    CityResponse,
    DistrictResponse,
    MetroLineResponse,
    MetroStationResponse,
    NeighborhoodResponse,
    RegionResponse,
    StreetResponse,
)

router = APIRouter(prefix="/geography", tags=["Geography"])


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
    return query.order_by(City.name).all()


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