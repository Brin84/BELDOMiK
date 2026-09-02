"""Viewing request service."""
import logging
from datetime import date

from sqlalchemy.orm import Session

from app.models.property import Property
from app.models.user import User
from app.models.viewing import ViewingRequest
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ViewingService:
    """Manage viewing requests for properties."""

    @staticmethod
    def create_request(
        db: Session,
        property_id: int,
        user_id: int | None,
        name: str,
        phone: str,
        preferred_date: date | None,
        preferred_time: str | None,
        comment: str | None,
    ) -> ViewingRequest | None:
        """Create a viewing request."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        request = ViewingRequest(
            property_id=property_id,
            user_id=user_id,
            name=name,
            phone=phone,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            comment=comment,
            status="pending",
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        return request

    @staticmethod
    def list_incoming(db: Session, owner_id: int) -> list[ViewingRequest]:
        """Get viewing requests for the owner's properties (newest first)."""
        return (
            db.query(ViewingRequest)
            .join(Property, Property.id == ViewingRequest.property_id)
            .filter(Property.owner_id == owner_id)
            .order_by(ViewingRequest.created_at.desc())
            .all()
        )

    @staticmethod
    def update_status(db: Session, request_id: int, owner_id: int, status: str) -> ViewingRequest | None:
        """Update viewing request status (owner only)."""
        request = (
            db.query(ViewingRequest)
            .join(Property, Property.id == ViewingRequest.property_id)
            .filter(
                ViewingRequest.id == request_id,
                Property.owner_id == owner_id,
            )
            .first()
        )
        if not request:
            return None

        request.status = status
        db.commit()
        db.refresh(request)
        return request

    @staticmethod
    async def notify_owner(db: Session, request: ViewingRequest) -> bool:
        """Notify the property owner about a new viewing request via Telegram."""
        property_obj = db.query(Property).filter(Property.id == request.property_id).first()
        if not property_obj:
            return False

        owner = db.query(User).filter(User.id == property_obj.owner_id).first()
        if not owner or not owner.tg_id:
            return False

        type_name = property_obj.type.name if property_obj.type else "Недвижимость"
        city_name = property_obj.city.name if property_obj.city else ""
        date_text = request.preferred_date.isoformat() if request.preferred_date else "не указано"
        time_text = request.preferred_time or "не указано"
        comment_text = f"\n💬 {request.comment}" if request.comment else ""

        text = (
            f"📅 <b>Новая заявка на осмотр</b>\n\n"
            f"🏠 {type_name} · {city_name}\n"
            f"🔗 Объявление #{property_obj.id}\n"
            f"👤 {request.name}\n"
            f"📞 {request.phone}\n"
            f"🗓 {date_text} в {time_text}\n"
            f"{comment_text}"
        )

        return await NotificationService.send_telegram_message(owner.tg_id, text)
