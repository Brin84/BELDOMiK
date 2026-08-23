"""Geography service for Belarus regions/cities/streets."""
from sqlalchemy.orm import Session

from app.models.geography import (
    City,
    District,
    MetroLine,
    MetroStation,
    Neighborhood,
    Region,
    Street,
)


class GeographyService:
    """Service for geography-related queries."""

    @staticmethod
    def get_regions(db: Session) -> list[Region]:
        return db.query(Region).order_by(Region.sort_order).all()

    @staticmethod
    def get_cities(db: Session, region_id: int | None = None) -> list[City]:
        query = db.query(City)
        if region_id:
            query = query.filter(City.region_id == region_id)
        return query.order_by(City.sort_order, City.name).all()

    @staticmethod
    def get_districts(db: Session, city_id: int) -> list[District]:
        return (
            db.query(District)
            .filter(District.city_id == city_id)
            .order_by(District.sort_order)
            .all()
        )

    @staticmethod
    def get_neighborhoods(db: Session, district_id: int | None = None) -> list[Neighborhood]:
        query = db.query(Neighborhood)
        if district_id:
            query = query.filter(Neighborhood.district_id == district_id)
        return query.order_by(Neighborhood.sort_order).all()

    @staticmethod
    def get_streets(db: Session, city_id: int, search: str | None = None) -> list[Street]:
        query = db.query(Street).filter(Street.city_id == city_id)
        if search:
            query = query.filter(Street.name.ilike(f"%{search}%"))
        return query.order_by(Street.name).limit(50).all()

    @staticmethod
    def get_metro_lines(db: Session, city_id: int) -> list[MetroLine]:
        return (
            db.query(MetroLine)
            .filter(MetroLine.city_id == city_id)
            .order_by(MetroLine.id)
            .all()
        )

    @staticmethod
    def get_metro_stations(db: Session, line_id: int) -> list[MetroStation]:
        return (
            db.query(MetroStation)
            .filter(MetroStation.line_id == line_id)
            .order_by(MetroStation.sort_order)
            .all()
        )

    @staticmethod
    def search_city(db: Session, search: str) -> list[City]:
        return (
            db.query(City)
            .filter(City.name.ilike(f"%{search}%"))
            .order_by(City.is_major.desc(), City.sort_order)
            .limit(20)
            .all()
        )
