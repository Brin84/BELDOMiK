"""Agency service: public catalog + management."""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.property import Property, PropertyStatus
from app.models.user import Agency, AgencyMember, User, UserProfile


class AgencyService:
    """CRUD for agencies and their members."""

    @staticmethod
    def list_agencies(
        db: Session, page: int = 1, page_size: int = 20, include_unverified: bool = False
    ) -> tuple[list[Agency], int]:
        """List agencies with published property counts."""
        query = db.query(Agency).filter(Agency.is_active.is_(True))
        if not include_unverified:
            query = query.filter(Agency.verified.is_(True))

        total = query.count()
        agencies = (
            query.order_by(Agency.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return agencies, total

    @staticmethod
    def property_counts(db: Session, agency_ids: list[int]) -> dict[int, int]:
        """Published property count per agency id."""
        if not agency_ids:
            return {}
        rows = (
            db.query(Property.agency_id, func.count(Property.id))
            .filter(
                Property.agency_id.in_(agency_ids),
                Property.status == PropertyStatus.PUBLISHED,
            )
            .group_by(Property.agency_id)
            .all()
        )
        return {aid: count for aid, count in rows}

    @staticmethod
    def get_agency(db: Session, agency_id: int) -> Agency | None:
        return db.query(Agency).filter(Agency.id == agency_id).first()

    @staticmethod
    def get_agency_properties(
        db: Session, agency_id: int, page: int = 1, page_size: int = 20
    ) -> tuple[list[Property], int]:
        """Published properties of an agency."""
        query = (
            db.query(Property)
            .filter(
                Property.agency_id == agency_id,
                Property.status == PropertyStatus.PUBLISHED,
            )
            .order_by(Property.created_at.desc())
        )
        total = query.count()
        items = (
            query.offset((page - 1) * page_size).limit(page_size).all()
        )
        return items, total

    @staticmethod
    def get_my_agency(db: Session, user: User) -> Agency | None:
        """The agency the user belongs to (via AgencyMember), if any."""
        member = (
            db.query(AgencyMember)
            .filter(AgencyMember.user_id == user.id)
            .order_by(AgencyMember.id.asc())
            .first()
        )
        if not member:
            return None
        return db.query(Agency).filter(Agency.id == member.agency_id).first()

    @staticmethod
    def get_member(db: Session, agency_id: int, user_id: int) -> AgencyMember | None:
        return (
            db.query(AgencyMember)
            .filter(
                AgencyMember.agency_id == agency_id,
                AgencyMember.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def is_agency_admin(db: Session, user: User, agency_id: int) -> bool:
        member = AgencyService.get_member(db, agency_id, user.id)
        return bool(member and member.role == "admin")

    @staticmethod
    def is_agency_manager(db: Session, user: User, agency_id: int) -> bool:
        member = AgencyService.get_member(db, agency_id, user.id)
        return bool(member and member.role in ("admin", "manager"))

    @staticmethod
    def create_agency(db: Session, user: User, data) -> Agency:
        """Create an agency; the creator becomes the admin."""
        agency = Agency(
            name=data.name,
            logo_url=data.logo_url,
            description=data.description,
            contact_phone=data.contact_phone,
            contact_email=data.contact_email,
            website=data.website,
        )
        db.add(agency)
        db.flush()

        db.add(AgencyMember(agency_id=agency.id, user_id=user.id, role="admin"))

        # Point the user's profile at the agency and elevate the role.
        profile = user.profile
        if not profile:
            profile = UserProfile(user_id=user.id)
            db.add(profile)
            db.flush()
        profile.is_agency = True
        profile.agency_id = agency.id
        user.role = "agency_admin"

        db.commit()
        db.refresh(agency)
        return agency

    @staticmethod
    def update_agency(db: Session, agency: Agency, data) -> Agency:
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(agency, field, value)
        db.commit()
        db.refresh(agency)
        return agency

    @staticmethod
    def add_member(db: Session, agency: Agency, user_id: int, role: str = "agent") -> AgencyMember:
        """Add a user to the agency (no-op if already a member)."""
        existing = AgencyService.get_member(db, agency.id, user_id)
        if existing:
            return existing

        member = AgencyMember(agency_id=agency.id, user_id=user_id, role=role)
        db.add(member)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            profile = user.profile
            if not profile:
                profile = UserProfile(user_id=user.id)
                db.add(profile)
                db.flush()
            profile.is_agency = True
            profile.agency_id = agency.id
            if user.role == "owner":
                user.role = "agent"

        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def remove_member(db: Session, agency: Agency, user_id: int) -> bool:
        """Remove a user from the agency. Returns False if not a member."""
        member = AgencyService.get_member(db, agency.id, user_id)
        if not member:
            return False
        if member.role == "admin":
            # Prevent removing the last admin.
            admins = (
                db.query(AgencyMember)
                .filter(
                    AgencyMember.agency_id == agency.id,
                    AgencyMember.role == "admin",
                )
                .count()
            )
            if admins <= 1:
                return False
        db.delete(member)
        db.commit()
        return True
