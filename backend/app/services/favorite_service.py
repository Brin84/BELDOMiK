"""Favorite service."""
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.geography import City, District, MetroStation, Neighborhood, Street
from app.models.property import Favorite, Property, PropertyPhoto, PropertyPrice
from app.models.property_types import OperationType, PropertyType


class FavoriteService:
    """Manage user favorites."""

    @staticmethod
    def add_favorite(db: Session, user_id: int, property_id: int) -> Favorite | None:
        """Add property to favorites atomically."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        # Check if already favorited first (avoids integrity error)
        existing = db.query(Favorite).filter(
            Favorite.user_id == user_id,
            Favorite.property_id == property_id,
        ).first()
        if existing:
            return existing

        favorite = Favorite(user_id=user_id, property_id=property_id)
        db.add(favorite)

        # Atomically increment counter using SQL
        db.query(Property).filter(Property.id == property_id).update(
            {Property.favorites_count: Property.favorites_count + 1},
            synchronize_session=False
        )

        try:
            db.commit()
        except Exception:
            db.rollback()
            # Check if it was a duplicate key error (race condition)
            existing = db.query(Favorite).filter(
                Favorite.user_id == user_id,
                Favorite.property_id == property_id,
            ).first()
            if existing:
                return existing
            raise

        db.refresh(favorite)
        return favorite

    @staticmethod
    def remove_favorite(db: Session, user_id: int, property_id: int) -> bool:
        """Remove property from favorites atomically."""
        favorite = db.query(Favorite).filter(
            Favorite.user_id == user_id,
            Favorite.property_id == property_id,
        ).first()
        if not favorite:
            return False

        # Atomically decrement counter using SQL (ensure it doesn't go below 0)
        # Use CASE WHEN for SQLite compatibility
        from sqlalchemy import case
        db.query(Property).filter(Property.id == property_id).update(
            {Property.favorites_count: case(
                (Property.favorites_count > 0, Property.favorites_count - 1),
                else_=0
            )},
            synchronize_session=False
        )

        db.delete(favorite)
        db.commit()
        return True

    @staticmethod
    def get_user_favorites(
        db: Session, user_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[Property], int]:
        """Get user's favorite properties."""

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
            )
            .join(Favorite, Favorite.property_id == Property.id)
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
            .filter(Favorite.user_id == user_id)
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
            )
            .order_by(Favorite.created_at.desc())
        )

        total = query.count()
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        results = query.all()
        return results, total

    @staticmethod
    def is_favorite(db: Session, user_id: int, property_id: int) -> bool:
        """Check if property is in user's favorites."""
        return db.query(Favorite).filter(
            Favorite.user_id == user_id,
            Favorite.property_id == property_id,
        ).first() is not None

    @staticmethod
    def get_favorite_ids(db: Session, user_id: int) -> list[int]:
        """Get all favorite property IDs for a user."""
        return [
            r[0]
            for r in db.query(Favorite.property_id)
            .filter(Favorite.user_id == user_id)
            .all()
        ]