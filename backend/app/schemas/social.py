"""Social schemas — seller reviews/ratings and follow subscriptions."""
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class ReviewAuthorRead(BaseSchema):
    """Мини-карточка автора отзыва (имя + аватар из профиля)."""
    id: int
    name: str | None = None
    avatar_url: str | None = None


class ReviewCreate(BaseSchema):
    """Создание/обновление отзыва о продавце (1 отзыв на пару)."""
    user_id: int = Field(..., description="Продавец, которого оценивают")
    rating: float = Field(..., ge=1, le=5)
    text: str | None = Field(default=None, max_length=1000)


class ReviewRead(BaseSchema):
    """Развёрнутый отзыв о продавце."""
    id: int
    target_user_id: int
    author: ReviewAuthorRead
    rating: float
    text: str | None = None
    created_at: datetime


class UserSummaryRead(BaseSchema):
    """Карточка продавца (профиль + соц-метрики) — блок «Продавец»."""
    id: int
    name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    created_at: datetime | None = None
    rating: float = 0.0
    reviews_count: int = 0
    deals_count: int = 0
    followers_count: int = 0
    is_following: bool = False
    is_self: bool = False


class ReviewListResponse(BaseSchema):
    items: list[ReviewRead]
    total: int
    summary: UserSummaryRead