"""Property and related models."""
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class PropertyStatus(StrEnum):
    DRAFT = "draft"
    PENDING_MODERATION = "pending_moderation"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    SOLD = "sold"
    RENTED = "rented"
    BLOCKED = "blocked"


class RenovationType(StrEnum):
    NONE = "none"
    COSMETIC = "cosmetic"
    EURO = "euro"
    DESIGNER = "designer"
    NEEDS_RENOVATION = "needs_renovation"


class Property(Base):
    """Main property listing."""
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)

    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True, index=True)

    # Type and operation
    type_id = Column(Integer, ForeignKey("property_types.id"), nullable=False, index=True)
    operation_id = Column(Integer, ForeignKey("operation_types.id"), nullable=False, index=True)

    # Geography
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.id"), nullable=True, index=True)
    street_id = Column(Integer, ForeignKey("streets.id"), nullable=True, index=True)
    metro_station_id = Column(Integer, ForeignKey("metro_stations.id"), nullable=True, index=True)
    metro_distance = Column(Integer, nullable=True)  # meters

    # Address
    address = Column(String(300), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # Physical characteristics
    floor = Column(Integer, nullable=True)
    total_floors = Column(Integer, nullable=True)
    build_year = Column(Integer, nullable=True)
    # Новостройки: отдельный раздел (Krisha-style) — постройка, реализуемая
    # застройщиком, а не вторичное жильё.
    is_new_building = Column(Boolean, default=False, nullable=False)
    total_area = Column(Float, nullable=True)
    living_area = Column(Float, nullable=True)
    kitchen_area = Column(Float, nullable=True)
    rooms_count = Column(Integer, nullable=True)

    # Features
    renovation = Column(Enum(RenovationType), nullable=True, default=RenovationType.NONE)
    furniture = Column(Boolean, default=False, nullable=False)
    balcony = Column(Boolean, default=False, nullable=False)
    parking = Column(Boolean, default=False, nullable=False)
    elevator = Column(Boolean, default=False, nullable=False)

    # Description
    description = Column(Text, nullable=True)

    # Status
    status = Column(Enum(PropertyStatus), default=PropertyStatus.DRAFT, nullable=False, index=True)
    views_count = Column(Integer, default=0, nullable=False)
    favorites_count = Column(Integer, default=0, nullable=False)

    # Moderation
    moderated_at = Column(DateTime, nullable=True)
    moderated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="properties", foreign_keys="Property.owner_id")
    agency = relationship("Agency", back_populates="properties")
    type = relationship("PropertyType")
    operation = relationship("OperationType")
    city = relationship("City", back_populates="properties")
    district = relationship("District", back_populates="properties")
    neighborhood = relationship("Neighborhood", back_populates="properties")
    street = relationship("Street", back_populates="properties")
    metro_station = relationship("MetroStation", back_populates="properties")
    photos = relationship(
        "PropertyPhoto",
        back_populates="property",
        cascade="all, delete-orphan",
        order_by="PropertyPhoto.sort_order",
    )
    features = relationship(
        "PropertyFeature", back_populates="property", cascade="all, delete-orphan"
    )
    prices = relationship(
        "PropertyPrice", back_populates="property", cascade="all, delete-orphan"
    )
    favorites = relationship(
        "Favorite", back_populates="property", cascade="all, delete-orphan"
    )
    views = relationship(
        "PropertyView", back_populates="property", cascade="all, delete-orphan"
    )
    contacts = relationship(
        "PropertyContact", back_populates="property", cascade="all, delete-orphan"
    )
    promotions = relationship(
        "Promotion", back_populates="property", cascade="all, delete-orphan"
    )
    reports = relationship(
        "Report", back_populates="property", cascade="all, delete-orphan"
    )
    moderation_actions = relationship(
        "ModerationAction", back_populates="property", cascade="all, delete-orphan"
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_properties_city_status_created", "city_id", "status", "created_at"),
        Index("ix_properties_type_operation_city", "type_id", "operation_id", "city_id"),
        Index("ix_properties_price_published", "status", "published_at"),
        Index("ix_properties_owner_status", "owner_id", "status"),
    )


class PropertyPhoto(Base):
    """Property photo with multiple formats."""
    __tablename__ = "property_photos"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)  # Original
    thumbnail_url = Column(String(500), nullable=True)
    webp_url = Column(String(500), nullable=True)
    avif_url = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="photos")


class PropertyFeature(Base):
    """Dynamic property features (EAV model for type-specific attributes)."""
    __tablename__ = "property_features"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    feature_key = Column(String(100), nullable=False, index=True)
    feature_value = Column(String(500), nullable=False)

    # Relationships
    property = relationship("Property", back_populates="features")

    __table_args__ = (
        UniqueConstraint("property_id", "feature_key", name="uq_property_feature"),
    )


class PropertyPrice(Base):
    """Price history for a property."""
    __tablename__ = "property_prices"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    price_byn = Column(Integer, nullable=False)
    price_usd = Column(Integer, nullable=True)
    price_per_m2_byn = Column(Integer, nullable=True)
    price_per_m2_usd = Column(Integer, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    change_reason = Column(String(100), nullable=True)  # manual, promotion, auto

    # Relationships
    property = relationship("Property", back_populates="prices")


class Favorite(Base):
    """User favorites."""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="favorites")
    property = relationship("Property", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_user_favorite"),
    )


class SavedSearch(Base):
    """User saved searches with notification settings."""
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=True)
    filters_json = Column(Text, nullable=False)  # JSON with all filter params
    notify_frequency = Column(
        String(20), default="daily", nullable=False
    )  # instant, daily, weekly, disabled
    is_active = Column(Boolean, default=True, nullable=False)
    last_notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="saved_searches")
    notifications = relationship(
        "SearchNotification", back_populates="search", cascade="all, delete-orphan"
    )


class SearchNotification(Base):
    """Notifications sent for saved searches."""
    __tablename__ = "search_notifications"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(Integer, ForeignKey("saved_searches.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), default="sent", nullable=False)  # sent, failed, clicked

    # Relationships
    search = relationship("SavedSearch", back_populates="notifications")


class PropertyView(Base):
    """Property view analytics."""
    __tablename__ = "property_views"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    referrer = Column(String(200), nullable=True)

    # Relationships
    property = relationship("Property", back_populates="views")
    user = relationship("User", back_populates="property_views")


class PropertyContact(Base):
    """Contact actions (call, chat, share)."""
    __tablename__ = "property_contacts"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    contact_type = Column(String(20), nullable=False, index=True)  # call, chat, share
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="contacts")
    user = relationship("User", back_populates="property_contacts")


class Report(Base):
    """User reports on properties."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    reason = Column(String(50), nullable=False)  # fake, spam, wrong_price, wrong_info, other
    description = Column(Text, nullable=True)
    status = Column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, reviewed, resolved, dismissed
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reports", foreign_keys=[reporter_id])
    property = relationship("Property", back_populates="reports")