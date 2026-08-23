"""Pagination utilities."""
from typing import TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Query

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = 1
    page_size: int = 20


class PaginatedResponse[T](BaseModel):
    """Paginated response."""
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate(query: Query, page: int, page_size: int) -> PaginatedResponse:
    """Paginate a SQLAlchemy query."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )