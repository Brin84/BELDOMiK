"""Moderation schemas."""
from datetime import datetime

from pydantic import BaseModel


class PropertyModerationRequest(BaseModel):
    """Property moderation action request."""
    action: str  # approve | reject | block
    reason: str | None = None


class ReportResponse(BaseModel):
    """Report response."""
    id: int
    reporter_id: int
    property_id: int
    reason: str
    description: str | None = None
    status: str
    created_at: datetime
    resolved_at: datetime | None = None
    resolution: str | None = None

    model_config = {"from_attributes": True}


class ModerationActionResponse(BaseModel):
    """Moderation action response."""
    id: int
    moderator_id: int
    property_id: int
    action_type: str
    reason: str | None = None
    old_status: str | None = None
    new_status: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
