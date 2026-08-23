"""Authentication schemas."""

from pydantic import BaseModel, Field

from app.schemas.common import BaseSchema
from app.schemas.user import UserRead


class TelegramInitData(BaseModel):
    init_data: str = Field(..., description="Raw Telegram WebApp initData string")


# Alias for backward compatibility with routes
TelegramAuthRequest = TelegramInitData


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TelegramUser(BaseSchema):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None
    is_bot: bool = False
    photo_url: str | None = None


class AuthResponse(BaseSchema):
    user: UserRead
    tokens: TokenResponse
    is_new: bool = False
