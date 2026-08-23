"""Common Pydantic schemas."""
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @property
    def has_next(self) -> bool:
        return self.page < self.total_pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1


class ErrorResponse(BaseSchema):
    detail: str
    code: str | None = None


class SuccessResponse(BaseSchema):
    success: bool = True
    message: str | None = None
    data: Any = None


class MessageResponse(BaseSchema):
    message: str