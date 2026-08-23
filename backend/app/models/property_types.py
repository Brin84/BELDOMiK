"""Property type and operation type models."""
from sqlalchemy import Boolean, Column, Integer, String

from app.db.base import Base


class PropertyType(Base):
    """Type of property (apartment, house, land, commercial, garage)."""
    __tablename__ = "property_types"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(
        String(50), nullable=False, index=True
    )  # apartment, house, land, commercial, garage
    name = Column(String(100), nullable=False, index=True)
    name_en = Column(String(100), nullable=True)
    name_plural = Column(String(100), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name for UI
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)


class OperationType(Base):
    """Type of operation (sell, rent, daily_rent)."""
    __tablename__ = "operation_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    name_en = Column(String(50), nullable=True)
    name_plural = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
