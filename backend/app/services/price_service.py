"""Price history and analysis service."""
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.property import Property, PropertyPrice


class PriceService:
    """Price history and market analysis."""

    @staticmethod
    def get_price_history(db: Session, property_id: int) -> list[PropertyPrice]:
        """Get price history for a property."""
        return (
            db.query(PropertyPrice)
            .filter(PropertyPrice.property_id == property_id)
            .order_by(PropertyPrice.changed_at.asc())
            .all()
        )

    @staticmethod
    def analyze_price(db: Session, property_id: int) -> dict[str, Any]:
        """Analyze property price vs similar properties."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return {"error": "Property not found"}

        # Get current price
        current_price = (
            db.query(PropertyPrice)
            .filter(PropertyPrice.property_id == property_id, PropertyPrice.is_current == True)
            .first()
        )
        if not current_price:
            return {"error": "No current price"}

        # Find similar properties (same city, type, operation, similar rooms/area)
        similar_query = (
            db.query(func.avg(PropertyPrice.price_byn))
            .join(Property, Property.id == PropertyPrice.property_id)
            .filter(
                Property.city_id == property_obj.city_id,
                Property.type_id == property_obj.type_id,
                Property.operation_id == property_obj.operation_id,
                Property.status == "published",
                Property.id != property_id,
                PropertyPrice.is_current == True,
            )
        )

        if property_obj.rooms_count:
            similar_query = similar_query.filter(Property.rooms_count == property_obj.rooms_count)

        if property_obj.total_area:
            # Within ±20% area
            area_min = property_obj.total_area * 0.8
            area_max = property_obj.total_area * 1.2
            similar_query = similar_query.filter(Property.total_area.between(area_min, area_max))

        similar_avg = similar_query.scalar()
        similar_count = (
            db.query(func.count(Property.id))
            .join(PropertyPrice, PropertyPrice.property_id == Property.id)
            .filter(
                Property.city_id == property_obj.city_id,
                Property.type_id == property_obj.type_id,
                Property.operation_id == property_obj.operation_id,
                Property.status == "published",
                Property.id != property_id,
                PropertyPrice.is_current == True,
            )
        )
        if property_obj.rooms_count:
            similar_count = similar_count.filter(Property.rooms_count == property_obj.rooms_count)
        if property_obj.total_area:
            area_min = property_obj.total_area * 0.8
            area_max = property_obj.total_area * 1.2
            similar_count = similar_count.filter(Property.total_area.between(area_min, area_max))
        similar_count = similar_count.scalar()

        if not similar_avg or similar_count < 3:
            return {
                "current_price_byn": current_price.price_byn,
                "similar_avg_byn": None,
                "deviation_percent": None,
                "assessment": "unknown",
                "similar_count": similar_count or 0,
                "message": "Недостаточно данных для оценки",
            }

        deviation = ((current_price.price_byn - similar_avg) / similar_avg) * 100

        if deviation <= -10:
            assessment = "good"
        elif deviation <= 0:
            assessment = "fair"
        elif deviation <= 10:
            assessment = "high"
        else:
            assessment = "very_high"

        return {
            "current_price_byn": current_price.price_byn,
            "similar_avg_byn": round(similar_avg),
            "deviation_percent": round(deviation, 1),
            "assessment": assessment,
            "similar_count": similar_count or 0,
            "message": None,
        }

    @staticmethod
    def get_price_stats(
        db: Session, city_id: int | None = None, type_id: int | None = None
    ) -> dict[str, Any]:
        """Get price statistics for a city/type."""
        query = (
            db.query(
                func.avg(PropertyPrice.price_byn).label("avg_price"),
                func.min(PropertyPrice.price_byn).label("min_price"),
                func.max(PropertyPrice.price_byn).label("max_price"),
                func.count(Property.id).label("count"),
            )
            .join(Property, Property.id == PropertyPrice.property_id)
            .filter(Property.status == "published", PropertyPrice.is_current == True)
        )
        if city_id:
            query = query.filter(Property.city_id == city_id)
        if type_id:
            query = query.filter(Property.type_id == type_id)

        result = query.first()
        return {
            "avg_price_byn": round(result.avg_price) if result.avg_price else 0,
            "min_price_byn": result.min_price if result.min_price else 0,
            "max_price_byn": result.max_price if result.max_price else 0,
            "count": result.count or 0,
        }