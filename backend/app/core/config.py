from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "BELDOMiK"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    DEV_MODE: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/beldomik",
        validation_alias="DATABASE_URL",
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Public URLs (used for SPA, webhook and links)
    FRONTEND_URL: str = Field(default="", validation_alias="FRONTEND_URL")
    BACKEND_PUBLIC_URL: str = Field(default="", validation_alias="BACKEND_PUBLIC_URL")
    CHANNEL_URL: str = Field(default="", validation_alias="CHANNEL_URL")

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = Field(default="change-me-in-production", validation_alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Telegram
    TELEGRAM_BOT_TOKEN: str = Field(default="", validation_alias="TELEGRAM_BOT_TOKEN")
    TELEGRAM_BOT_USERNAME: str = Field(
        default="BELDOMiK_BOT", validation_alias="TELEGRAM_BOT_USERNAME"
    )
    TELEGRAM_WEBAPP_URL: str = Field(default="", validation_alias="TELEGRAM_WEBAPP_URL")
    TELEGRAM_WEBHOOK_SECRET: str = Field(default="", validation_alias="TELEGRAM_WEBHOOK_SECRET")

    # Admin Telegram IDs (auto-assigned admin role on first login)
    ADMIN_IDS: list[int] = []

    # Object Storage (S3-compatible)
    S3_ENDPOINT_URL: str = Field(default="", validation_alias="S3_ENDPOINT_URL")
    S3_ACCESS_KEY: str = Field(default="", validation_alias="S3_ACCESS_KEY")
    S3_SECRET_KEY: str = Field(default="", validation_alias="S3_SECRET_KEY")
    S3_BUCKET_NAME: str = Field(default="beldomik", validation_alias="S3_BUCKET_NAME")
    S3_REGION: str = Field(default="auto", validation_alias="S3_REGION")
    S3_PUBLIC_URL: str = Field(default="", validation_alias="S3_PUBLIC_URL")

    # Object Storage (Google Cloud Storage) — used on Cloud Run via runtime
    # service account (ADC), falls back to S3/local when not configured.
    # GCS bucket is uniform-access + public objectViewer => keys readable at
    # https://storage.googleapis.com/{GCS_BUCKET_NAME}/{object_key}
    GCS_BUCKET_NAME: str = Field(default="beldomik-photos", validation_alias="GCS_BUCKET_NAME")
    GCS_PUBLIC_URL: str = Field(
        default="https://storage.googleapis.com",
        validation_alias="GCS_PUBLIC_URL",
    )

    # Local upload dir (dev fallback, served at /uploads)
    UPLOAD_DIR: str = Field(default="uploads", validation_alias="UPLOAD_DIR")

    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    MAX_IMAGES_PER_PROPERTY: int = 20
    # Server-side image compression (same approach as baraholka)
    PHOTO_MAX_DIMENSION: int = 1600
    PHOTO_QUALITY: int = 80

    # Currency
    DEFAULT_CURRENCY: str = "BYN"
    SUPPORTED_CURRENCIES: list[str] = ["BYN", "USD"]
    EXCHANGE_RATE_API_URL: str = "https://www.nbrb.by/api/exrates/rates/431"  # USD to BYN

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Scheduler (Cloud Scheduler keep-alive)
    SCHEDULER_SECRET: str = Field(default="", validation_alias="SCHEDULER_SECRET")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
