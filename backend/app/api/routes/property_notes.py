"""Property notes routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.property_note import PropertyNoteCreate, PropertyNoteRead
from app.services.property_note_service import PropertyNoteService

router = APIRouter(prefix="/properties", tags=["Property Notes"])


@router.put("/{property_id}/note", response_model=PropertyNoteRead)
def upsert_note(
    property_id: int,
    data: PropertyNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a personal note on a property."""
    note = PropertyNoteService.upsert(db, current_user.id, property_id, data.text)
    if not note:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyNoteRead.model_validate(note)


@router.get("/{property_id}/note", response_model=PropertyNoteRead | None)
def get_note(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's note on a property."""
    note = PropertyNoteService.get(db, current_user.id, property_id)
    if not note:
        return None
    return PropertyNoteRead.model_validate(note)


@router.delete("/{property_id}/note")
def delete_note(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the user's note on a property."""
    success = PropertyNoteService.delete(db, current_user.id, property_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}
