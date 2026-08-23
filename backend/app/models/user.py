"""User and agency models."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    """Telegram user."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(Integer, nullable=False, unique=True, index=True)
    username = Column(String(100), nullable=True, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    language_code = Column(String(10), nullable=True)
    is_bot = Column(Boolean, default=False, nullable=False)
    phone = Column(String(20), nullable=True)
    phone_verified = Column(Boolean, default=False, nullable=False)
    tg_verified = Column(Boolean, default=True, nullable=False)

    # Role: owner, agent, agency_admin, moderator, admin
    role = Column(String(20), default="owner", nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    properties = relationship(
        "Property",
        back_populates="owner",
        foreign_keys="Property.owner_id",
        cascade="all, delete-orphan",
    )
    favorites = relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan"
    )
    saved_searches = relationship(
        "SavedSearch", back_populates="user", cascade="all, delete-orphan"
    )
    agency_memberships = relationship(
        "AgencyMember", back_populates="user", cascade="all, delete-orphan"
    )
    moderation_actions = relationship("ModerationAction", back_populates="admin")
    reports = relationship(
        "Report",
        back_populates="reporter",
        foreign_keys="Report.reporter_id",
    )
    property_views = relationship("PropertyView", back_populates="user")
    property_contacts = relationship("PropertyContact", back_populates="user")


class UserProfile(Base):
    """Extended user profile."""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    is_agency = Column(Boolean, default=False, nullable=False)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="profile")
    agency = relationship("Agency", back_populates="members_profiles")


class Agency(Base):
    """Real estate agency."""
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    logo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(200), nullable=True)
    website = Column(String(200), nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    members_profiles = relationship("UserProfile", back_populates="agency")
    members = relationship("AgencyMember", back_populates="agency", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="agency")


class AgencyMember(Base):
    """Membership of a user in an agency."""
    __tablename__ = "agency_members"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), default="agent", nullable=False)  # agent, manager, admin
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    agency = relationship("Agency", back_populates="members")
    user = relationship("User", back_populates="agency_memberships")
