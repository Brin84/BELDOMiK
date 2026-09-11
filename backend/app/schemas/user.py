"""User schemas."""
from datetime import datetime

from pydantic import Field

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
    """Частичное обновление профиля — применяются только переданные поля.

    Длины совпадают с колонками: users.username/first_name/last_name — varchar(100),
    users.phone — varchar(20), user_profiles.bio — Text.
    """
    username: str | None = Field(default=None, max_length=100)
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    phone_verified: bool | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=2000)


class UserSettingsRead(BaseSchema):
    """Настройки приложения (Kufar-стандарт): регион по умолчанию, уведомления."""
    default_city_id: int | None = None
    notify_price_drop: bool = True
    notify_saved_searches: bool = True
    theme: str = "light"
    language: str = "ru"


class UserSettingsUpdate(BaseSchema):
    """Частичное обновление настроек — меняются только переданные поля."""
    default_city_id: int | None = None
    notify_price_drop: bool | None = None
    notify_saved_searches: bool | None = None
    theme: str | None = None
    language: str | None = None


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    telegram_id: int
    avatar_url: str | None = None
    bio: str | None = None
    settings: UserSettingsRead | None = None

    @classmethod
    def model_validate(cls, obj: dict | object) -> "UserRead":
        data = obj if isinstance(obj, dict) else obj.__dict__
        if 'tg_id' in data and 'telegram_id' not in data:
            data = dict(data)
            data['telegram_id'] = data['tg_id']
        # Профильное (avatar_url, bio) и настройки хранятся в связанных
        # таблицах и подтягиваются lazy-load'ом — все вызовы model_validate
        # идут в активной сессии (/auth/telegram, /auth/me, admin). Ложим
        # поверх данных пользователя.
        profile = getattr(obj, 'profile', None)
        if profile is not None:
            data = dict(data)
            data['avatar_url'] = profile.avatar_url
            data['bio'] = profile.bio
        settings = getattr(obj, 'settings', None)
        if settings is not None:
            data = dict(data)
            data['settings'] = UserSettingsRead.model_validate(settings)
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
