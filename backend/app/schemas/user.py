"""User schemas."""
from datetime import datetime

from app.schemas.common import BaseSchema


class UserBase(BaseSchema):
    tg_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language_code: str | None = None
    phone: str | None = None
    phone_verified: bool = False
    tg_verified: bool = True
    role: str = "owner"
    is_active: bool = True
    is_blocked: bool = False
    telegram_id: int | None = None

    @property
    def telegram_id_property(self) -> int:
        """Alias for tg_id for frontend compatibility."""
        return self.tg_id


class UserCreate(BaseSchema):
    tg_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language_code: str | None = None


class UserUpdate(BaseSchema):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    phone_verified: bool | None = None
    avatar_url: str | None = None
    bio: str | None = None


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    telegram_id: int

    @classmethod
    def model_validate(cls, obj: dict | object) -> "UserRead":
        data = obj if isinstance(obj, dict) else obj.__dict__
        if 'tg_id' in data and 'telegram_id' not in data:
            data = dict(data)
            data['telegram_id'] = data['tg_id']
        return super().model_validate(data)


# Alias for backward compatibility with routes
UserResponse = UserRead


class UserProfileBase(BaseSchema):
    avatar_url: str | None = None
    bio: str | None = None
    is_agency: bool = False
    agency_id: int | None = None


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileRead(UserProfileBase):
    id: int
    user_id: int
