"""Viewing request routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.viewing import (
    ViewingRequestCreate,
    ViewingRequestRead,
    ViewingRequestStatusUpdate,
)
from app.services.viewing_service import ViewingService

router = APIRouter(prefix="/viewings", tags=["Viewings"])


@router.post("", response_model=ViewingRequestRead, status_code=201)
async def create_viewing(
    data: ViewingRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a viewing request for a property."""
    request = ViewingService.create_request(
        db,
        data.property_id,
        current_user.id,
        data.name,
        data.phone,
        data.preferred_date,
        data.preferred_time,
        data.comment,
    )
    if not request:
        raise HTTPException(status_code=404, detail="Property not found")

    # Notify the owner via Telegram (best-effort, don't fail the request)
    await ViewingService.notify_owner(db, request)
    return ViewingRequestRead.model_validate(request)


@router.get("", response_model=list[ViewingRequestRead])
def list_incoming(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get viewing requests for the owner's properties."""
    requests = ViewingService.list_incoming(db, current_user.id)
    return [ViewingRequestRead.model_validate(r) for r in requests]


@router.patch("/{request_id}", response_model=ViewingRequestRead)
def update_status(
    request_id: int,
    data: ViewingRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update viewing request status (owner only)."""
    request = ViewingService.update_status(db, request_id, current_user.id, data.status)
    if not request:
        raise HTTPException(status_code=404, detail="Viewing request not found")
    return ViewingRequestRead.model_validate(request)
