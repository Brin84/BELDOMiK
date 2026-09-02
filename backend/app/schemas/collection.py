"""Collection schemas."""
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class CollectionCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)


class CollectionUpdate(BaseSchema):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)


class CollectionItemCreate(BaseSchema):
    property_id: int


class CollectionItemRead(BaseSchema):
    id: int
    collection_id: int
    property_id: int
    created_at: datetime


class CollectionRead(BaseSchema):
    id: int
    user_id: int
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    property_count: int = 0
