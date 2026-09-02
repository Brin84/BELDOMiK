"""Admin panel routes — dashboard, user management, property moderation."""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import String, func
from sqlalchemy.orm import Session

from app.api.dependencies import get_admin_user, get_db
from app.models.moderation import ModerationAction
from app.models.property import Property, PropertyView, Report
from app.models.user import User
from app.schemas.user import UserRead
from app.services.moderation_service import _publish_to_channel
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Schemas ──────────────────────────────────────────────────


class AdminDashboard(BaseModel):
    """Aggregated platform stats."""
    total_users: int
    total_properties: int
    published_properties: int
    pending_properties: int
    blocked_properties: int
    total_views: int
    total_favorites: int
    open_reports: int
    properties_today: int
    users_today: int


class UserListItem(BaseModel):
    """Compact user row for admin table."""
    id: int
    tg_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    role: str
    is_active: bool
    is_blocked: bool
    properties_count: int
    created_at: datetime


class PropertyListItem(BaseModel):
    """Compact property row for admin table."""
    id: int
    title: str | None
    type_name: str | None
    operation_name: str | None
    city_name: str | None
    status: str
    owner_id: int
    owner_name: str | None
    price_byn: int | None
    views_count: int
    created_at: datetime


class UserRoleUpdate(BaseModel):
    role: str


class UserBlockUpdate(BaseModel):
    is_blocked: bool
    reason: str | None = None


class PropertyStatusUpdate(BaseModel):
    status: str
    reason: str | None = None


# ── Dashboard ────────────────────────────────────────────────


@router.get("/dashboard", response_model=AdminDashboard)
def get_dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Platform-wide aggregated statistics."""
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    return AdminDashboard(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_properties=db.query(func.count(Property.id)).scalar() or 0,
        published_properties=db.query(func.count(Property.id))
        .filter(Property.status == "published").scalar() or 0,
        pending_properties=db.query(func.count(Property.id))
        .filter(Property.status.in_(["pending_moderation", "draft"])).scalar() or 0,
        blocked_properties=db.query(func.count(Property.id))
        .filter(Property.status == "blocked").scalar() or 0,
        total_views=db.query(func.count(PropertyView.id)).scalar() or 0,
        total_favorites=db.query(
            func.count(func.distinct(PropertyView.user_id))
        ).scalar() or 0,
        open_reports=db.query(func.count(Report.id))
        .filter(Report.status.in_(["pending", "open"])).scalar() or 0,
        properties_today=db.query(func.count(Property.id))
        .filter(Property.created_at >= today_start).scalar() or 0,
        users_today=db.query(func.count(User.id))
        .filter(User.created_at >= today_start).scalar() or 0,
    )


# ── User Management ──────────────────────────────────────────


@router.get("/users", response_model=list[UserListItem])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List users with search and role filter."""
    q = db.query(User)

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (User.username.ilike(pattern))
            | (User.first_name.ilike(pattern))
            | (User.last_name.ilike(pattern))
            | (User.tg_id.cast(String).ilike(pattern))
        )
    if role:
        q = q.filter(User.role == role)

    q = q.order_by(User.created_at.desc())
    users = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for u in users:
        props_count = (
            db.query(func.count(Property.id))
            .filter(Property.owner_id == u.id)
            .scalar()
            or 0
        )
        result.append(
            UserListItem(
                id=u.id,
                tg_id=u.tg_id,
                username=u.username,
                first_name=u.first_name,
                last_name=u.last_name,
                role=u.role,
                is_active=u.is_active,
                is_blocked=u.is_blocked,
                properties_count=props_count,
                created_at=u.created_at,
            )
        )
    return result


@router.get("/users/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Get user detail."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead.model_validate(user)


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Change user role (admin only can assign admin)."""
    if data.role not in ("owner", "agent", "agency_admin", "moderator", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    # Only admin can assign admin role
    if data.role == "admin" and admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign admin role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = data.role
    db.commit()
    return {"message": f"User {user_id} role changed to {data.role}"}


@router.patch("/users/{user_id}/block")
def block_user(
    user_id: int,
    data: UserBlockUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Block or unblock a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot block another admin")

    user.is_blocked = data.is_blocked
    user.is_active = not data.is_blocked
    db.commit()

    action = "blocked" if data.is_blocked else "unblocked"
    return {"message": f"User {user_id} {action}"}


# ── Property Management ──────────────────────────────────────


@router.get("/properties", response_model=list[PropertyListItem])
def list_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    city_id: int | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List properties with filters for admin review."""
    q = db.query(Property).outerjoin(Property.city).outerjoin(Property.owner)

    if status:
        q = q.filter(Property.status == status)
    if city_id:
        q = q.filter(Property.city_id == city_id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(Property.title.ilike(pattern) | Property.address.ilike(pattern))

    q = q.order_by(Property.created_at.desc())
    properties = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for p in properties:
        current_price = None
        if p.prices:
            for pr in p.prices:
                if pr.is_current:
                    current_price = pr.price_byn
                    break
            if current_price is None and p.prices:
                current_price = p.prices[0].price_byn

        result.append(
            PropertyListItem(
                id=p.id,
                title=p.title,
                type_name=p.type.name if p.type else None,
                operation_name=p.operation.name if p.operation else None,
                city_name=p.city.name if p.city else None,
                status=p.status.value if hasattr(p.status, "value") else str(p.status),
                owner_id=p.owner_id,
                owner_name=(
                    f"{p.owner.first_name or ''} {p.owner.last_name or ''}".strip()
                    if p.owner
                    else None
                ),
                price_byn=current_price,
                views_count=p.views_count,
                created_at=p.created_at,
            )
        )
    return result


@router.patch("/properties/{property_id}/status")
def update_property_status(
    property_id: int,
    data: PropertyStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Change property status (moderate, block, etc.)."""
    valid_statuses = [
        "draft", "pending_moderation", "published",
        "rejected", "archived", "blocked",
    ]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")

    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    old_status = prop.status.value if hasattr(prop.status, "value") else str(prop.status)
    prop.status = data.status

    if data.status == "published":
        prop.published_at = datetime.now(UTC)
        prop.moderated_at = datetime.now(UTC)
        prop.moderated_by = admin.id
    elif data.status in ("rejected", "blocked"):
        prop.moderated_at = datetime.now(UTC)
        prop.moderated_by = admin.id

    # Log moderation action
    action = ModerationAction(
        property_id=property_id,
        admin_id=admin.id,
        action=data.status,
        reason=data.reason,
    )
    db.add(action)
    db.commit()

    # Автопубликация объявления в Telegram-канал при публикации
    if data.status == "published" and old_status != "published":
        _publish_to_channel(db, prop)

    return {
        "message": f"Property {property_id} status: {old_status} → {data.status}",
        "property_id": property_id,
    }


@router.get("/properties/{property_id}")
def get_property_detail(
    property_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Get full property detail for admin review."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    current_price = None
    if prop.prices:
        for pr in prop.prices:
            if pr.is_current:
                current_price = pr.price_byn
                break
        if current_price is None:
            current_price = prop.prices[0].price_byn

    return {
        "id": prop.id,
        "title": prop.title,
        "description": prop.description,
        "status": prop.status.value if hasattr(prop.status, "value") else str(prop.status),
        "type_name": prop.type.name if prop.type else None,
        "operation_name": prop.operation.name if prop.operation else None,
        "city_name": prop.city.name if prop.city else None,
        "district_name": prop.district.name if prop.district else None,
        "address": prop.address,
        "floor": prop.floor,
        "total_floors": prop.total_floors,
        "total_area": prop.total_area,
        "rooms_count": prop.rooms_count,
        "price_byn": current_price,
        "views_count": prop.views_count,
        "favorites_count": prop.favorites_count,
        "owner_id": prop.owner_id,
        "owner_name": (
            f"{prop.owner.first_name or ''} {prop.owner.last_name or ''}".strip()
            if prop.owner
            else None
        ),
        "owner_tg_id": prop.owner.tg_id if prop.owner else None,
        "is_new_building": prop.is_new_building,
        "renovation": prop.renovation.value if prop.renovation else None,
        "photos_count": len(prop.photos) if prop.photos else 0,
        "reports_count": len(prop.reports) if prop.reports else 0,
        "created_at": prop.created_at,
        "published_at": prop.published_at,
    }


# ── Reports Management ───────────────────────────────────────


@router.get("/reports")
def list_reports(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List user reports."""
    q = db.query(Report)
    if status:
        q = q.filter(Report.status == status)
    else:
        q = q.filter(Report.status.in_(["pending", "open"]))

    total = q.count()
    reports = q.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": r.id,
                "reporter_id": r.reporter_id,
                "property_id": r.property_id,
                "reason": r.reason,
                "description": r.description,
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
    resolution: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Resolve a user report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = "resolved"
    report.resolved_by = admin.id
    report.resolved_at = datetime.now(UTC)
    db.commit()

    return {"message": "Report resolved", "report_id": report_id}


# ── Telegram Channel ─────────────────────────────────────────


class ChannelWelcomeResponse(BaseModel):
    success: bool
    message: str


@router.post("/telegram/channel-welcome", response_model=ChannelWelcomeResponse)
async def send_channel_welcome(
    _admin: User = Depends(get_admin_user),
):
    """Отправить приветственное сообщение в Telegram-канал вручную."""
    success = await NotificationService.post_channel_welcome()
    if success:
        return ChannelWelcomeResponse(success=True, message="Приветствие отправлено в канал")
    raise HTTPException(status_code=502, detail="Не удалось отправить приветствие в канал")


@router.post("/telegram/post-listing/{property_id}", response_model=ChannelWelcomeResponse)
async def post_listing_to_channel(
    property_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Вручную опубликовать объявление в Telegram-канал."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    price = prop.prices[0] if prop.prices else None
    photo_url = prop.photos[0].url if prop.photos else None
    success = await NotificationService.post_property_to_channel(
        property_id=prop.id,
        type_name=prop.type.name if prop.type else "Недвижимость",
        operation_name=prop.operation.name if prop.operation else "",
        city_name=prop.city.name if prop.city else "",
        district_name=prop.district.name if prop.district else "",
        price_byn=price.price_byn if price else None,
        price_usd=price.price_usd if price else None,
        total_area=prop.total_area,
        rooms_count=prop.rooms_count,
        description=prop.description,
        photo_url=photo_url,
    )
    if success:
        return ChannelWelcomeResponse(success=True, message=f"Объявление {property_id} опубликовано в канале")
    raise HTTPException(status_code=502, detail="Не удалось опубликовать объявление в канал")
