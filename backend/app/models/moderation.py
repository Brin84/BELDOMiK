"""Moderation models."""
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ModerationActionType(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    BLOCK = "block"
    UNBLOCK = "unblock"
    ARCHIVE = "archive"
    EDIT = "edit"


class ModerationAction(Base):
    """Admin moderation actions on properties."""
    __tablename__ = "moderation_actions"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(Enum(ModerationActionType), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    property = relationship("Property", back_populates="moderation_actions")
    admin = relationship("User", back_populates="moderation_actions", foreign_keys=[admin_id])