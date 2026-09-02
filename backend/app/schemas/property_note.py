"""Property note schemas."""
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class PropertyNoteCreate(BaseSchema):
    text: str = Field(..., min_length=1, max_length=10000)


class PropertyNoteRead(BaseSchema):
    id: int
    user_id: int
    property_id: int
    text: str
    created_at: datetime
    updated_at: datetime
