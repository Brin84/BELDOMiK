"""Moderation routes (admin/moderator only)."""

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_moderator_user
from app.models.user import User
from app.schemas.moderation import (
    PropertyModerationRequest,
)
from app.services.moderation_service import ModerationService

router = APIRouter(prefix="/moderation", tags=["Moderation"])


@router.get("/properties/pending", response_model=list[dict])
def get_pending_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Get properties pending moderation."""
    properties, total = ModerationService.get_pending_properties(db, page, page_size)
    return {
        "items": [
            {
                "id": p.id,
                "title": p.title,
                "type": p.type.name if p.type else None,
                "operation": p.operation.name if p.operation else None,
                "city": p.city.name if p.city else None,
                "status": p.status,
                "owner_id": p.owner_id,
                "created_at": p.created_at,
            }
            for p in properties
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/properties/published", response_model=list[dict])
def get_published_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Get published properties for review."""
    properties, total = ModerationService.get_published_properties(db, page, page_size)
    return {
        "items": [
            {
                "id": p.id,
                "title": p.title,
                "type": p.type.name if p.type else None,
                "operation": p.operation.name if p.operation else None,
                "city": p.city.name if p.city else None,
                "status": p.status,
                "owner_id": p.owner_id,
                "published_at": p.published_at,
            }
            for p in properties
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/properties/{property_id}/action")
def moderate_property(
    property_id: int,
    data: PropertyModerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Moderate a property (approve/reject/block)."""
    property_obj = ModerationService.moderate_property(
        db,
        property_id,
        current_user.id,
        data.action,
        data.reason,
    )
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": f"Property {data.action}d", "property_id": property_id}


@router.get("/reports", response_model=list[dict])
def get_reports(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Get user reports."""
    reports, total = ModerationService.get_reports(db, status, page, page_size)
    return {
        "items": [
            {
                "id": r.id,
                "reporter_id": r.reporter_id,
                "property_id": r.property_id,
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at,
                "resolved_at": r.resolved_at,
            }
            for r in reports
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    resolution: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Resolve a report."""
    report = ModerationService.resolve_report(db, report_id, current_user.id, resolution)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report resolved"}


@router.get("/stats")
def get_moderation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_moderator_user),
):
    """Get moderation dashboard statistics."""
    return ModerationService.get_moderation_stats(db)