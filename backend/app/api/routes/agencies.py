"""Agency routes: public catalog + management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.agency import (
    AgencyCreate,
    AgencyMemberAdd,
    AgencyMemberRead,
    AgencyRead,
    AgencyShort,
    AgencyUpdate,
)
from app.schemas.common import PaginatedResponse
from app.schemas.property import PropertyShortRead
from app.services.agency_service import AgencyService

router = APIRouter(prefix="/agencies", tags=["Agencies"])


# ── Public catalog ───────────────────────────────────────────────
@router.get("", response_model=PaginatedResponse[AgencyShort])
def list_agencies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List verified active agencies with property counts."""
    agencies, total = AgencyService.list_agencies(db, page, page_size)
    counts = AgencyService.property_counts(db, [a.id for a in agencies])
    items = [
        AgencyShort(
            id=a.id,
            name=a.name,
            logo_url=a.logo_url,
            description=a.description,
            verified=a.verified,
            property_count=counts.get(a.id, 0),
        )
        for a in agencies
    ]
    total_pages = max(1, -(-total // page_size))
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.get("/me", response_model=AgencyRead)
def get_my_agency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's own agency (if any)."""
    agency = AgencyService.get_my_agency(db, current_user)
    if not agency:
        raise HTTPException(status_code=404, detail="Вы не состоите в агентстве")
    return _to_agency_read(db, agency)


@router.post("", response_model=AgencyRead, status_code=201)
def create_agency(
    data: AgencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new agency; the creator becomes the admin."""
    existing = AgencyService.get_my_agency(db, current_user)
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже состоите в агентстве")
    agency = AgencyService.create_agency(db, current_user, data)
    return _to_agency_read(db, agency)


# ── Agency detail ────────────────────────────────────────────────
@router.get("/{agency_id}", response_model=AgencyRead)
def get_agency(
    agency_id: int,
    db: Session = Depends(get_db),
):
    """Get agency detail (only active, verified agencies publicly)."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency or not agency.is_active:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    return _to_agency_read(db, agency)


@router.patch("/{agency_id}", response_model=AgencyRead)
def update_agency(
    agency_id: int,
    data: AgencyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update agency info (admin/manager only)."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    if not AgencyService.is_agency_manager(db, current_user, agency_id):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    agency = AgencyService.update_agency(db, agency, data)
    return _to_agency_read(db, agency)


@router.get("/{agency_id}/properties", response_model=PaginatedResponse[PropertyShortRead])
def get_agency_properties(
    agency_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get published properties of an agency."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency or not agency.is_active:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    props, total = AgencyService.get_agency_properties(db, agency_id, page, page_size)
    total_pages = max(1, -(-total // page_size))
    return PaginatedResponse(
        items=[PropertyShortRead.model_validate(p) for p in props],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── Members ──────────────────────────────────────────────────────
@router.get("/{agency_id}/members", response_model=list[AgencyMemberRead])
def get_agency_members(
    agency_id: int,
    db: Session = Depends(get_db),
):
    """List agency members (public)."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    members = agency.members
    return [
        AgencyMemberRead(
            user_id=m.user_id,
            name=_member_name(m.user),
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@router.post("/{agency_id}/members", response_model=AgencyMemberRead, status_code=201)
def add_agency_member(
    agency_id: int,
    data: AgencyMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a member to the agency (admin only)."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    if not AgencyService.is_agency_admin(db, current_user, agency_id):
        raise HTTPException(status_code=403, detail="Только администратор агентства")
    member = AgencyService.add_member(db, agency, data.user_id, data.role)
    return AgencyMemberRead(
        user_id=member.user_id,
        name=_member_name(member.user),
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{agency_id}/members/{user_id}", status_code=204)
def remove_agency_member(
    agency_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the agency (admin only)."""
    agency = AgencyService.get_agency(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Агентство не найдено")
    if not AgencyService.is_agency_admin(db, current_user, agency_id):
        raise HTTPException(status_code=403, detail="Только администратор агентства")
    removed = AgencyService.remove_member(db, agency, user_id)
    if not removed:
        raise HTTPException(status_code=400, detail="Нельзя удалить последнего администратора")


# ── Helpers ──────────────────────────────────────────────────────
def _member_name(user) -> str:
    parts = [p for p in (getattr(user, "first_name", None), getattr(user, "last_name", None)) if p]
    return " ".join(parts) or user.username or f"user_{user.id}"


def _to_agency_read(db: Session, agency) -> AgencyRead:
    counts = AgencyService.property_counts(db, [agency.id])
    members = agency.members
    return AgencyRead(
        id=agency.id,
        name=agency.name,
        logo_url=agency.logo_url,
        description=agency.description,
        contact_phone=agency.contact_phone,
        contact_email=agency.contact_email,
        website=agency.website,
        verified=agency.verified,
        is_active=agency.is_active,
        property_count=counts.get(agency.id, 0),
        member_count=len(members),
        created_at=agency.created_at,
    )
