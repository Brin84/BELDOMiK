"""Moderation service for admin content review."""
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.moderation import ModerationAction
from app.models.property import Property, Report


class ModerationService:
    """Handle content moderation and reports."""

    @staticmethod
    def get_pending_properties(
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Property], int]:
        """Get properties pending moderation."""
        query = (
            db.query(Property)
            .filter(Property.status.in_(["pending", "draft"]))
            .order_by(Property.created_at.asc())
        )
        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_published_properties(
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Property], int]:
        """Get published properties for review."""
        query = (
            db.query(Property)
            .filter(Property.status == "published")
            .order_by(Property.created_at.desc())
        )
        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_reports(
        db: Session,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Report], int]:
        """Get user reports."""
        query = db.query(Report)
        if status:
            query = query.filter(Report.status == status)
        else:
            query = query.filter(Report.status.in_(["open", "investigating"]))
        query = query.order_by(Report.created_at.desc())
        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def moderate_property(
        db: Session,
        property_id: int,
        moderator_id: int,
        action: str,  # "approve" | "reject" | "block"
        reason: str | None = None,
    ) -> Property | None:
        """Moderate a property."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        old_status = property_obj.status
        if action == "approve":
            property_obj.status = "published"
            property_obj.published_at = datetime.now(UTC)
        elif action == "reject":
            property_obj.status = "rejected"
        elif action == "block":
            property_obj.status = "blocked"

        moderation_action = ModerationAction(
            moderator_id=moderator_id,
            property_id=property_id,
            action_type=action,
            reason=reason,
            old_status=old_status,
            new_status=property_obj.status,
        )
        db.add(moderation_action)
        db.commit()
        db.refresh(property_obj)
        return property_obj

    @staticmethod
    def resolve_report(
        db: Session,
        report_id: int,
        moderator_id: int,
        resolution: str | None = None,
    ) -> Report | None:
        """Resolve a user report."""
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return None

        report.status = "resolved"
        report.resolved_by = moderator_id
        report.resolved_at = datetime.now(UTC)
        report.resolution = resolution

        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_moderation_stats(db: Session) -> dict[str, Any]:
        """Get moderation dashboard stats."""
        return {
            "pending_properties": db.query(func.count(Property.id))
            .filter(Property.status.in_(["pending", "draft"]))
            .scalar()
            or 0,
            "published_properties": db.query(func.count(Property.id))
            .filter(Property.status == "published")
            .scalar()
            or 0,
            "open_reports": db.query(func.count(Report.id))
            .filter(Report.status.in_(["open", "investigating"]))
            .scalar()
            or 0,
            "blocked_properties": db.query(func.count(Property.id))
            .filter(Property.status == "blocked")
            .scalar()
            or 0,
        }
