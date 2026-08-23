"""Analytics service for market statistics."""
from datetime import UTC
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.geography import City
from app.models.property import Property, PropertyPrice, PropertyView
from app.models.property_types import PropertyType


class AnalyticsService:
    """Market analytics and statistics."""

    @staticmethod
    def get_market_overview(db: Session) -> dict[str, Any]:
        """Get overall market statistics."""
        total_properties = db.query(func.count(Property.id)).filter(
            Property.status == "published"
        ).scalar() or 0

        for_sale = db.query(func.count(Property.id)).filter(
            Property.status == "published",
            Property.operation_id == 1,  # buy
        ).scalar() or 0

        for_rent = db.query(func.count(Property.id)).filter(
            Property.status == "published",
            Property.operation_id == 2,  # rent
        ).scalar() or 0

        avg_price = db.query(func.avg(PropertyPrice.price_byn)).join(
            Property, Property.id == PropertyPrice.property_id
        ).filter(
            Property.status == "published",
            PropertyPrice.is_current == True,
        ).scalar() or 0

        total_views = db.query(func.count(PropertyView.id)).scalar() or 0

        return {
            "total_properties": total_properties,
            "for_sale": for_sale,
            "for_rent": for_rent,
            "avg_price_byn": int(avg_price),
            "total_views": total_views,
        }

    @staticmethod
    def get_city_stats(db: Session, city_id: int | None = None) -> list[dict[str, Any]]:
        """Get statistics by city."""
        query = (
            db.query(
                City.id,
                City.name,
                func.count(Property.id).label("count"),
                func.avg(PropertyPrice.price_byn).label("avg_price"),
            )
            .join(Property, Property.city_id == City.id)
            .outerjoin(PropertyPrice, PropertyPrice.property_id == Property.id)
            .filter(
                Property.status == "published",
                PropertyPrice.is_current == True,
            )
        )
        if city_id:
            query = query.filter(City.id == city_id)

        results = query.group_by(City.id, City.name).all()

        return [
            {
                "city_id": r.id,
                "city_name": r.name,
                "property_count": r.count,
                "avg_price_byn": int(r.avg_price) if r.avg_price else 0,
            }
            for r in results
        ]

    @staticmethod
    def get_popular_properties(
        db: Session,
        limit: int = 10,
        period_days: int = 30,
    ) -> list[dict[str, Any]]:
        """Get most viewed properties."""
        from datetime import datetime, timedelta
        cutoff = datetime.now(UTC) - timedelta(days=period_days)

        results = (
            db.query(
                Property.id,
                Property.title,
                func.count(PropertyView.id).label("view_count"),
            )
            .join(PropertyView, PropertyView.property_id == Property.id)
            .filter(
                Property.status == "published",
                PropertyView.viewed_at >= cutoff,
            )
            .group_by(Property.id, Property.title)
            .order_by(func.count(PropertyView.id).desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "property_id": r.id,
                "title": r.title,
                "view_count": r.view_count,
            }
            for r in results
        ]

    @staticmethod
    def get_price_distribution(
        db: Session,
        city_id: int | None = None,
        type_id: int | None = None,
    ) -> dict[str, Any]:
        """Get price distribution for a given filter."""
        query = (
            db.query(
                func.min(PropertyPrice.price_byn).label("min"),
                func.max(PropertyPrice.price_byn).label("max"),
                func.avg(PropertyPrice.price_byn).label("avg"),
                func.count(PropertyPrice.id).label("count"),
            )
            .join(Property, Property.id == PropertyPrice.property_id)
            .filter(
                Property.status == "published",
                PropertyPrice.is_current == True,
            )
        )
        if city_id:
            query = query.filter(Property.city_id == city_id)
        if type_id:
            query = query.filter(Property.type_id == type_id)

        result = query.first()
        if not result or not result.count:
            return {"min": 0, "max": 0, "avg": 0, "count": 0}

        return {
            "min": int(result.min),
            "max": int(result.max),
            "avg": int(result.avg),
            "count": result.count,
        }

    @staticmethod
    def get_type_distribution(db: Session) -> list[dict[str, Any]]:
        """Get property count by type."""
        results = (
            db.query(
                PropertyType.id,
                PropertyType.name,
                func.count(Property.id).label("count"),
            )
            .join(Property, Property.type_id == PropertyType.id)
            .filter(Property.status == "published")
            .group_by(PropertyType.id, PropertyType.name)
            .all()
        )

        return [
            {
                "type_id": r.id,
                "type_name": r.name,
                "count": r.count,
            }
            for r in results
        ]
