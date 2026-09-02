"""Viewing request model — booking a property viewing."""
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ViewingRequest(Base):
    """Request to view a property."""
    __tablename__ = "viewing_requests"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    preferred_date = Column(Date, nullable=True)
    preferred_time = Column(String(20), nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, confirmed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", backref="viewing_requests")
    user = relationship("User", backref="viewing_requests")
