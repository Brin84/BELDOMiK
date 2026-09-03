"""Agency schemas: catalog, management, members."""
from datetime import datetime

from app.schemas.common import BaseSchema


# ── Agency ───────────────────────────────────────────────────────
class AgencyCreate(BaseSchema):
    """Create a new agency."""
    name: str
    logo_url: str | None = None
    description: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    website: str | None = None


class AgencyUpdate(BaseSchema):
    """Update agency info (partial)."""
    name: str | None = None
    logo_url: str | None = None
    description: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    website: str | None = None


class AgencyShort(BaseSchema):
    """Compact agency data for catalog list."""
    id: int
    name: str
    logo_url: str | None = None
    description: str | None = None
    verified: bool = False
    property_count: int = 0


class AgencyRead(BaseSchema):
    """Full agency data (detail view)."""
    id: int
    name: str
    logo_url: str | None = None
    description: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    website: str | None = None
    verified: bool = False
    is_active: bool = True
    property_count: int = 0
    member_count: int = 0
    created_at: datetime | None = None


# ── Members ──────────────────────────────────────────────────────
class AgencyMemberRead(BaseSchema):
    """Agency member info."""
    user_id: int
    name: str
    role: str
    joined_at: datetime | None = None


class AgencyMemberAdd(BaseSchema):
    """Add a user to the agency."""
    user_id: int
    role: str = "agent"
