"""Property note service."""
from sqlalchemy.orm import Session

from app.models.property import Property
from app.models.property_note import PropertyNote


class PropertyNoteService:
    """Manage personal notes on properties."""

    @staticmethod
    def upsert(db: Session, user_id: int, property_id: int, text: str) -> PropertyNote | None:
        """Create or update a note for a property (owner only)."""
        property_obj = db.query(Property).filter(Property.id == property_id).first()
        if not property_obj:
            return None

        note = db.query(PropertyNote).filter(
            PropertyNote.user_id == user_id,
            PropertyNote.property_id == property_id,
        ).first()

        if note:
            note.text = text
        else:
            note = PropertyNote(user_id=user_id, property_id=property_id, text=text)
            db.add(note)

        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def get(db: Session, user_id: int, property_id: int) -> PropertyNote | None:
        """Get a note for a property."""
        return db.query(PropertyNote).filter(
            PropertyNote.user_id == user_id,
            PropertyNote.property_id == property_id,
        ).first()

    @staticmethod
    def delete(db: Session, user_id: int, property_id: int) -> bool:
        """Delete a note (owner only)."""
        note = PropertyNoteService.get(db, user_id, property_id)
        if not note:
            return False
        db.delete(note)
        db.commit()
        return True
