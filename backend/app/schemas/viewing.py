"""Viewing request schemas."""
from datetime import date, datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class ViewingRequestCreate(BaseSchema):
    property_id: int
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=3, max_length=30)
    preferred_date: date | None = None
    preferred_time: str | None = Field(None, max_length=20)
    comment: str | None = Field(None, max_length=2000)


class ViewingRequestStatusUpdate(BaseSchema):
    status: str = Field(..., pattern="^(pending|confirmed|cancelled)$")


class ViewingRequestRead(BaseSchema):
    id: int
    property_id: int
    user_id: int | None = None
    name: str
    phone: str
    preferred_date: date | None = None
    preferred_time: str | None = None
    comment: str | None = None
    status: str
    created_at: datetime
