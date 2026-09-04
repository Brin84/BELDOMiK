"""Geography models for Belarus real estate marketplace."""

from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Region(Base):
    """Region (oblast) of Belarus."""
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    cities = relationship("City", back_populates="region", cascade="all, delete-orphan")


class City(Base):
    """City or town in Belarus."""
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True)
    # Nullable: пользователь может добавить свой населённый пункт (деревню) без области.
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    is_major = Column(Boolean, default=False, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    region = relationship("Region", back_populates="cities")
    districts = relationship(
        "District", back_populates="city", cascade="all, delete-orphan"
    )
    neighborhoods = relationship(
        "Neighborhood", back_populates="city", cascade="all, delete-orphan"
    )
    streets = relationship(
        "Street", back_populates="city", cascade="all, delete-orphan"
    )
    metro_lines = relationship(
        "MetroLine", back_populates="city", cascade="all, delete-orphan"
    )
    properties = relationship("Property", back_populates="city")


class District(Base):
    """Administrative district of a city (e.g. Minsk districts)."""
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    city = relationship("City", back_populates="districts")
    neighborhoods = relationship(
        "Neighborhood", back_populates="district", cascade="all, delete-orphan"
    )
    properties = relationship("Property", back_populates="district")


class Neighborhood(Base):
    """Neighborhood (microdistrict) within a district."""
    __tablename__ = "neighborhoods"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    city = relationship("City", back_populates="neighborhoods")
    district = relationship("District", back_populates="neighborhoods")
    properties = relationship("Property", back_populates="neighborhood")


class Street(Base):
    """Street within a city."""
    __tablename__ = "streets"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    name_en = Column(String(200), nullable=True)

    # Relationships
    city = relationship("City", back_populates="streets")
    properties = relationship("Property", back_populates="street")


class MetroLine(Base):
    """Metro line in a city (Minsk only)."""
    __tablename__ = "metro_lines"

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color like #FF0000

    # Relationships
    city = relationship("City", back_populates="metro_lines")
    stations = relationship("MetroStation", back_populates="line", cascade="all, delete-orphan")


class MetroStation(Base):
    """Metro station within a line."""
    __tablename__ = "metro_stations"

    id = Column(Integer, primary_key=True, index=True)
    line_id = Column(Integer, ForeignKey("metro_lines.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    line = relationship("MetroLine", back_populates="stations")
    properties = relationship("Property", back_populates="metro_station")
