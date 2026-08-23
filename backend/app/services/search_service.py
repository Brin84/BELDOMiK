"""Search service for map and advanced queries."""
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.geography import City
from app.models.property import Property, PropertyPhoto, PropertyPrice
from app.models.property_types import OperationType, PropertyType


class SearchService:
    """Advanced search for map view and comparisons."""

    @staticmethod
    def get_properties_for_map(
        db: Session,
        lat_min: float,
        lng_min: float,
        lat_max: float,
        lng_max: float,
        filters: dict[str, Any] | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """Get properties within bounding box for map display."""
        query = (
            db.query(
                Property.id,
                Property.lat,
                Property.lng,
                Property.type_id,
                Property.operation_id,
                Property.city_id,
                Property.district_id,
                Property.neighborhood_id,
                Property.metro_station_id,
                Property.total_area,
                Property.rooms_count,
                Property.floor,
                Property.status,
                PropertyPrice.price_byn,
                PropertyPrice.price_usd,
                PropertyPrice.price_per_m2_byn,
                func.min(PropertyPhoto.url).label("photo_url"),
                City.name.label("city_name"),
                PropertyType.name.label("type_name"),
                OperationType.name.label("operation_name"),
            )
            .outerjoin(PropertyPrice, PropertyPrice.property_id == Property.id)
            .outerjoin(PropertyPhoto, PropertyPhoto.property_id == Property.id)
            .join(City, City.id == Property.city_id)
            .join(PropertyType, PropertyType.id == Property.type_id)
            .join(OperationType, OperationType.id == Property.operation_id)
            .filter(
                Property.status == "published",
                Property.lat.isnot(None),
                Property.lng.isnot(None),
                Property.lat.between(lat_min, lat_max),
                Property.lng.between(lng_min, lng_max),
                PropertyPrice.is_current == True,
            )
            .group_by(
                Property.id,
                PropertyPrice.price_byn,
                PropertyPrice.price_usd,
                PropertyPrice.price_per_m2_byn,
                City.name,
                PropertyType.name,
                OperationType.name,
            )
            .limit(limit)
        )

        if filters:
            if filters.get("type_id"):
                query = query.filter(Property.type_id == filters["type_id"])
            if filters.get("operation_id"):
                query = query.filter(Property.operation_id == filters["operation_id"])
            if filters.get("price_byn_min"):
                query = query.filter(PropertyPrice.price_byn >= filters["price_byn_min"])
            if filters.get("price_byn_max"):
                query = query.filter(PropertyPrice.price_byn <= filters["price_byn_max"])

        results = query.all()

        return [
            {
                "id": r.id,
                "lat": r.lat,
                "lng": r.lng,
                "type_id": r.type_id,
                "operation_id": r.operation_id,
                "city_id": r.city_id,
                "district_id": r.district_id,
                "neighborhood_id": r.neighborhood_id,
                "metro_station_id": r.metro_station_id,
                "total_area": r.total_area,
                "rooms_count": r.rooms_count,
                "floor": r.floor,
                "price_byn": r.price_byn,
                "price_usd": r.price_usd,
                "price_per_m2_byn": r.price_per_m2_byn,
                "photo_url": r.photo_url,
                "city_name": r.city_name,
                "type_name": r.type_name,
                "operation_name": r.operation_name,
            }
            for r in results
        ]

    @staticmethod
    def compare_properties(db: Session, property_ids: list[int]) -> list[dict[str, Any]]:
        """Get properties for comparison view."""
        if not property_ids:
            return []

        properties = (
            db.query(Property)
            .options(
                joinedload(Property.type),
                joinedload(Property.operation),
                joinedload(Property.city),
                joinedload(Property.district),
                joinedload(Property.neighborhood),
                joinedload(Property.photos),
            )
            .filter(Property.id.in_(property_ids))
            .all()
        )

        # Maintain order
        prop_dict = {p.id: p for p in properties}
        ordered = [prop_dict.get(pid) for pid in property_ids if pid in prop_dict]

        results = []
        for prop in ordered:
            current_price = next((p for p in prop.prices if p.is_current), None)
            results.append({
                "id": prop.id,
                "type": prop.type.name if prop.type else None,
                "operation": prop.operation.name if prop.operation else None,
                "city": prop.city.name if prop.city else None,
                "district": prop.district.name if prop.district else None,
                "neighborhood": prop.neighborhood.name if prop.neighborhood else None,
                "total_area": prop.total_area,
                "living_area": prop.living_area,
                "kitchen_area": prop.kitchen_area,
                "rooms_count": prop.rooms_count,
                "floor": prop.floor,
                "total_floors": prop.total_floors,
                "build_year": prop.build_year,
                "renovation": prop.renovation,
                "furniture": prop.furniture,
                "balcony": prop.balcony,
                "parking": prop.parking,
                "elevator": prop.elevator,
                "metro_station": prop.metro_station.name if prop.metro_station else None,
                "metro_distance": prop.metro_distance,
                "price_byn": current_price.price_byn if current_price else None,
                "price_usd": current_price.price_usd if current_price else None,
                "price_per_m2_byn": current_price.price_per_m2_byn if current_price else None,
                "photos": [p.url for p in prop.photos[:5]],
                "description": prop.description,
            })

        return results