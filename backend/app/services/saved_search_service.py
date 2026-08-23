"""Saved search service."""
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.property import SavedSearch, SearchNotification


class SavedSearchService:
    """Manage user saved searches and notifications."""

    @staticmethod
    def create_search(
        db: Session,
        user_id: int,
        name: str | None,
        filters_json: str,
        notify_frequency: str = "daily",
    ) -> SavedSearch:
        """Create a saved search."""
        search = SavedSearch(
            user_id=user_id,
            name=name,
            filters_json=filters_json,
            notify_frequency=notify_frequency,
            is_active=True,
        )
        db.add(search)
        db.commit()
        db.refresh(search)
        return search

    @staticmethod
    def get_user_searches(db: Session, user_id: int) -> list[SavedSearch]:
        """Get all user saved searches."""
        return (
            db.query(SavedSearch)
            .filter(SavedSearch.user_id == user_id)
            .order_by(SavedSearch.created_at.desc())
            .all()
        )

    @staticmethod
    def update_search(
        db: Session,
        search_id: int,
        user_id: int,
        name: str | None = None,
        filters_json: str | None = None,
        notify_frequency: str | None = None,
        is_active: bool | None = None,
    ) -> SavedSearch | None:
        """Update a saved search (owner only)."""
        search = db.query(SavedSearch).filter(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id,
        ).first()
        if not search:
            return None

        if name is not None:
            search.name = name
        if filters_json is not None:
            search.filters_json = filters_json
        if notify_frequency is not None:
            search.notify_frequency = notify_frequency
        if is_active is not None:
            search.is_active = is_active

        search.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(search)
        return search

    @staticmethod
    def delete_search(db: Session, search_id: int, user_id: int) -> bool:
        """Delete a saved search (owner only)."""
        search = db.query(SavedSearch).filter(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id,
        ).first()
        if not search:
            return False
        db.delete(search)
        db.commit()
        return True

    @staticmethod
    def toggle_notifications(db: Session, search_id: int, user_id: int) -> SavedSearch | None:
        """Toggle notification status for a search."""
        search = db.query(SavedSearch).filter(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id,
        ).first()
        if not search:
            return None

        search.is_active = not search.is_active
        search.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(search)
        return search

    @staticmethod
    def record_notification(
        db: Session, search_id: int, property_id: int, status: str = "sent"
    ) -> SearchNotification:
        """Record a notification sent for a search."""
        notification = SearchNotification(
            search_id=search_id,
            property_id=property_id,
            status=status,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def update_last_notified(db: Session, search_id: int) -> None:
        """Update last_notified_at timestamp."""
        search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if search:
            search.last_notified_at = datetime.now(UTC)
            db.commit()