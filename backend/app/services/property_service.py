"""Property CRUD service."""
import logging
from datetime import UTC, datetime

from sqlalchemy import and_, exists, func
from sqlalchemy.orm import Session, joinedload

from app.models.geography import City, District, MetroStation, Neighborhood, Street
from app.models.property import (
    Favorite,
    Property,
    PropertyFeature,
    PropertyPhoto,
    PropertyPrice,
    PropertyStatus,
)
from app.models.property_types import OperationType, PropertyType
from app.schemas.common import BaseSchema
from app.schemas.property import (
    PropertyCreate,
    PropertyFilterParams,
    PropertyShortRead,
    PropertyUpdate,
)
from app.services.currency_service import CurrencyService

logger = logging.getLogger(__name__)


class PropertyListResponse(BaseSchema):
    """Response for property list endpoint."""
    items: list[PropertyShortRead]
    total: int
    page: int
    page_size: int
    pages: int


class PropertyService:
    """Property management service."""

    @staticmethod
    def create_property(
        db: Session,
        owner_id: int,
        data: PropertyCreate,
        agency_id: int | None = None,
    ) -> Property:
        """Create a new property listing."""
        # Calculate price per m2
        price_per_m2 = CurrencyService.calculate_per_m2(data.price_byn, data.total_area)

        # Get USD rate and convert
        import asyncio
        rate = asyncio.run(CurrencyService.get_usd_to_byn_rate(db))
        price_usd = CurrencyService.convert_byn_to_usd(data.price_byn, rate)
        price_per_m2_usd = (
            CurrencyService.convert_byn_to_usd(price_per_m2, rate)
            if price_per_m2
            else None
        )

        property_obj = Property(
            owner_id=owner_id,
            agency_id=agency_id,
            type_id=data.type_id,
            operation_id=data.operation_id,
            city_id=data.city_id,
            district_id=data.district_id,
            neighborhood_id=data.neighborhood_id,
            street_id=data.street_id,
            metro_station_id=data.metro_station_id,
            metro_distance=data.metro_distance,
            address=data.address,
            lat=data.lat,
            lng=data.lng,
            floor=data.floor,
            total_floors=data.total_floors,
            build_year=data.build_year,
            total_area=data.total_area,
            living_area=data.living_area,
            kitchen_area=data.kitchen_area,
            rooms_count=data.rooms_count,
            renovation=data.renovation,
            furniture=data.furniture,
            balcony=data.balcony,
            parking=data.parking,
            elevator=data.elevator,
            description=data.description,
            status=PropertyStatus.DRAFT,
        )

        db.add(property_obj)
        db.flush()  # Get ID

        # Add photos
        for i, photo in enumerate(data.photos):
            db.add(PropertyPhoto(
                property_id=property_obj.id,
                url=photo.url,
                thumbnail_url=photo.thumbnail_url,
                webp_url=photo.webp_url,
                avif_url=photo.avif_url,
                sort_order=photo.sort_order or i,
                width=photo.width,
                height=photo.height,
                file_size=photo.file_size,
                mime_type=photo.mime_type,
            ))

        # Add features
        for feature in data.features:
            db.add(PropertyFeature(
                property_id=property_obj.id,
                feature_key=feature.feature_key,
                feature_value=feature.feature_value,
            ))

        # Add initial price
        db.add(PropertyPrice(
            property_id=property_obj.id,
            price_byn=data.price_byn,
            price_usd=price_usd,
            price_per_m2_byn=price_per_m2,
            price_per_m2_usd=price_per_m2_usd,
            exchange_rate=rate,
            is_current=True,
            change_reason="initial",
        ))

        db.commit()
        db.refresh(property_obj)
        return property_obj

    @staticmethod
    def get_property(
        db: Session,
        property_id: int,
        user_id: int | None = None,
    ) -> Property | None:
        """Get property by ID with all relations and favorite status."""
        query = (
            db.query(Property)
            .options(
                joinedload(Property.photos),
                joinedload(Property.features),
                joinedload(Property.prices),
                joinedload(Property.type),
                joinedload(Property.operation),
                joinedload(Property.city),
                joinedload(Property.district),
                joinedload(Property.neighborhood),
                joinedload(Property.street),
                joinedload(Property.metro_station),
                joinedload(Property.owner),
                joinedload(Property.agency),
            )
            .filter(Property.id == property_id)
        )
        property_obj = query.first()

        # Add is_favorite attribute if user is authenticated
        if property_obj and user_id:
            property_obj.is_favorite = db.query(
                exists().where(
                    (Favorite.user_id == user_id) & (Favorite.property_id == property_id)
                )
            ).scalar()
        elif property_obj:
            property_obj.is_favorite = False

        return property_obj

    @staticmethod
    def get_properties_for_list(
        db: Session,
        filters: PropertyFilterParams,
        user_id: int | None = None,
    ) -> tuple[list[Property], int]:
        """Get filtered properties for list view with optimized query."""
        # Subquery for favorite check
        fav_subq = None
        if user_id:
            fav_subq = (
                db.query(Favorite.property_id)
                .filter(Favorite.user_id == user_id)
                .subquery()
            )

        # Base query with joins for commonly needed fields
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
                # is_favorite computed field
                exists().where(
                    and_(Favorite.user_id == user_id, Favorite.property_id == Property.id)
                ).label("is_favorite") if user_id else False,
            )
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
            .filter(Property.status == PropertyStatus.PUBLISHED)
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
        )

        # Apply filters
        if filters.region_id:
            query = query.filter(City.region_id == filters.region_id)
        if filters.city_id:
            query = query.filter(Property.city_id == filters.city_id)
        if filters.district_id:
            query = query.filter(Property.district_id == filters.district_id)
        if filters.neighborhood_id:
            query = query.filter(Property.neighborhood_id == filters.neighborhood_id)
        if filters.street_id:
            query = query.filter(Property.street_id == filters.street_id)
        if filters.type_id:
            query = query.filter(Property.type_id == filters.type_id)
        if filters.operation_id:
            query = query.filter(Property.operation_id == filters.operation_id)
        if filters.rooms_count:
            query = query.filter(Property.rooms_count == filters.rooms_count)
        if filters.floor_min:
            query = query.filter(Property.floor >= filters.floor_min)
        if filters.floor_max:
            query = query.filter(Property.floor <= filters.floor_max)
        if filters.total_floors_min:
            query = query.filter(Property.total_floors >= filters.total_floors_min)
        if filters.total_floors_max:
            query = query.filter(Property.total_floors <= filters.total_floors_max)
        if filters.build_year_min:
            query = query.filter(Property.build_year >= filters.build_year_min)
        if filters.build_year_max:
            query = query.filter(Property.build_year <= filters.build_year_max)
        if filters.total_area_min:
            query = query.filter(Property.total_area >= filters.total_area_min)
        if filters.total_area_max:
            query = query.filter(Property.total_area <= filters.total_area_max)
        if filters.price_byn_min:
            query = query.filter(PropertyPrice.price_byn >= filters.price_byn_min)
        if filters.price_byn_max:
            query = query.filter(PropertyPrice.price_byn <= filters.price_byn_max)
        if filters.renovation:
            query = query.filter(Property.renovation == filters.renovation)
        if filters.furniture is not None:
            query = query.filter(Property.furniture == filters.furniture)
        if filters.balcony is not None:
            query = query.filter(Property.balcony == filters.balcony)
        if filters.parking is not None:
            query = query.filter(Property.parking == filters.parking)
        if filters.elevator is not None:
            query = query.filter(Property.elevator == filters.elevator)
        if filters.metro_station_id:
            query = query.filter(Property.metro_station_id == filters.metro_station_id)
        if filters.metro_distance_max:
            query = query.filter(Property.metro_distance <= filters.metro_distance_max)
        if filters.with_photos_only:
            # Aggregate must live in HAVING (after GROUP BY), not WHERE —
            # Postgres raises "aggregate functions are not allowed in WHERE".
            query = query.having(func.count(PropertyPhoto.id) > 0)
        if filters.is_favorite_only and user_id:
            fav_subq = db.query(Favorite.property_id).filter(Favorite.user_id == user_id).subquery()
            query = query.filter(Property.id.in_(fav_subq))

        # Bounding box filter for map
        if filters.bbox:
            try:
                lat_min, lng_min, lat_max, lng_max = map(float, filters.bbox.split(","))
                query = query.filter(
                    Property.lat.between(lat_min, lat_max),
                    Property.lng.between(lng_min, lng_max),
                )
            except ValueError:
                pass

        # Sorting
        # sort_by may be a bare column ("created_at", "price_byn") or a
        # composite slug from the frontend ("created_at_desc", "total_area").
        sort_by = filters.sort_by or "created_at"
        sort_order = filters.sort_order or "desc"
        if sort_by.endswith("_desc") or sort_by.endswith("_asc"):
            sort_order = "desc" if sort_by.endswith("_desc") else "asc"
            sort_by = sort_by.rsplit("_", 1)[0]

        # Price columns live on PropertyPrice (already outer-joined and in GROUP BY).
        sort_column = (
            getattr(PropertyPrice, sort_by)
            if sort_by in ("price_byn", "price_usd", "price_per_m2_byn")
            else getattr(Property, sort_by, Property.created_at)
        )
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Total count
        total = query.count()

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)

        results = query.all()
        return results, total

    @staticmethod
    def search_properties(
        db: Session,
        filters: PropertyFilterParams,
        page: int = 1,
        page_size: int = 20,
        user_id: int | None = None,
    ) -> PropertyListResponse:
        """Search properties with pagination and return structured response."""
        filters.page = page
        filters.page_size = page_size
        results, total = PropertyService.get_properties_for_list(db, filters, user_id)

        # Convert to PropertyShortRead format
        items = []
        for row in results:
            prop = row[0]  # Property object
            item = PropertyShortRead(
                id=prop.id,
                type_id=prop.type_id,
                operation_id=prop.operation_id,
                city_id=prop.city_id,
                district_id=prop.district_id,
                neighborhood_id=prop.neighborhood_id,
                street_id=prop.street_id,
                metro_station_id=prop.metro_station_id,
                metro_distance=prop.metro_distance,
                address=prop.address,
                lat=prop.lat,
                lng=prop.lng,
                floor=prop.floor,
                total_floors=prop.total_floors,
                build_year=prop.build_year,
                total_area=prop.total_area,
                living_area=prop.living_area,
                kitchen_area=prop.kitchen_area,
                rooms_count=prop.rooms_count,
                renovation=prop.renovation,
                furniture=prop.furniture,
                balcony=prop.balcony,
                parking=prop.parking,
                elevator=prop.elevator,
                description=prop.description,
                status=prop.status.value if hasattr(prop.status, 'value') else str(prop.status),
                views_count=prop.views_count,
                favorites_count=prop.favorites_count,
                created_at=prop.created_at,
                updated_at=prop.updated_at,
                price_byn=row[1],
                price_usd=row[2],
                price_per_m2_byn=row[3],
                photo_url=row[5],
                photo_count=row[4],
                city_name=row[6],
                district_name=row[7],
                neighborhood_name=row[8],
                street_name=row[9],
                metro_station_name=row[10],
                type_name=row[11],
                operation_name=row[12],
                owner_id=prop.owner_id,
                owner_name=prop.owner.first_name if prop.owner else None,
                is_favorite=row[13] if user_id else False,
            )
            items.append(item)

        pages = (total + page_size - 1) // page_size
        return PropertyListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    @staticmethod
    def update_property(
        db: Session,
        property_id: int,
        data: PropertyUpdate,
        user_id: int,
        is_admin: bool = False,
    ) -> Property | None:
        """Update property (owner or admin)."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        # Check ownership
        if not is_admin and property_obj.owner_id != user_id:
            return None

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(property_obj, field, value)

        property_obj.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(property_obj)
        return property_obj

    @staticmethod
    def delete_property(
        db: Session, property_id: int, user_id: int, is_admin: bool = False
    ) -> bool:
        """Soft delete (archive) property."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return False
        if not is_admin and property_obj.owner_id != user_id:
            return False

        property_obj.status = PropertyStatus.ARCHIVED
        property_obj.archived_at = datetime.now(UTC)
        db.commit()
        return True

    @staticmethod
    def submit_for_moderation(db: Session, property_id: int, user_id: int) -> Property | None:
        """Submit property for moderation."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj or property_obj.owner_id != user_id:
            return None
        if property_obj.status not in (PropertyStatus.DRAFT, PropertyStatus.REJECTED):
            return None

        property_obj.status = PropertyStatus.PENDING_MODERATION
        db.commit()
        db.refresh(property_obj)
        return property_obj

    @staticmethod
    def moderate_property(
        db: Session,
        property_id: int,
        admin_id: int,
        action: str,
        reason: str | None = None,
    ) -> Property | None:
        """Moderate property (approve/reject/block)."""
        from app.models.moderation import ModerationAction, ModerationActionType

        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        if action == "approve":
            property_obj.status = PropertyStatus.PUBLISHED
            property_obj.published_at = datetime.now(UTC)
        elif action == "reject":
            property_obj.status = PropertyStatus.REJECTED
        elif action == "block":
            property_obj.status = PropertyStatus.BLOCKED

        db.add(ModerationAction(
            property_id=property_id,
            admin_id=admin_id,
            action=ModerationActionType(action),
            reason=reason,
        ))
        db.commit()
        db.refresh(property_obj)
        return property_obj

    @staticmethod
    def update_price(
        db: Session,
        property_id: int,
        price_byn: int,
        change_reason: str | None = None,
    ) -> PropertyPrice:
        """Update property price and record history."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            raise ValueError("Property not found")

        # Mark old price as not current
        db.query(PropertyPrice).filter(
            PropertyPrice.property_id == property_id,
            PropertyPrice.is_current == True,
        ).update({PropertyPrice.is_current: False})

        rate = CurrencyService.get_usd_to_byn_rate_sync()
        price_usd = CurrencyService.convert_byn_to_usd(price_byn, rate)
        price_per_m2 = CurrencyService.calculate_per_m2(price_byn, property_obj.total_area)
        price_per_m2_usd = (
            CurrencyService.convert_byn_to_usd(price_per_m2, rate)
            if price_per_m2
            else None
        )

        new_price = PropertyPrice(
            property_id=property_id,
            price_byn=price_byn,
            price_usd=price_usd,
            price_per_m2_byn=price_per_m2,
            price_per_m2_usd=price_per_m2_usd,
            exchange_rate=rate,
            is_current=True,
            change_reason=change_reason or "manual",
        )
        db.add(new_price)
        db.commit()
        db.refresh(new_price)
        return new_price