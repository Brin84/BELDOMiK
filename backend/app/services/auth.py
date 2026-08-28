"""JWT authentication service."""
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthService:
    """Handle JWT token creation and validation."""

    @staticmethod
    def create_access_token(user_id: int, tg_id: int) -> str:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": str(user_id),
            "tg_id": tg_id,
            "type": "access",
            "exp": expire,
            "iat": datetime.now(UTC),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(user_id: int, tg_id: int) -> str:
        expire = datetime.now(UTC) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        payload = {
            "sub": str(user_id),
            "tg_id": tg_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(UTC),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_tokens(user_id: int, tg_id: int) -> dict[str, Any]:
        """Create both access and refresh tokens."""
        access_token = AuthService.create_access_token(user_id, tg_id)
        refresh_token = AuthService.create_refresh_token(user_id, tg_id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    @staticmethod
    def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
        except jwt.ExpiredSignatureError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            ) from e
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            ) from e

        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        return payload

    @staticmethod
    def decode_refresh_token(token: str) -> dict[str, Any] | None:
        """Decode and validate a refresh token, return None if invalid."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
        except jwt.JWTError:
            return None
        else:
            if payload.get("type") != "refresh":
                return None
            return payload

    @staticmethod
    def get_or_create_user(db: Session, tg_user_data: dict[str, Any]) -> User:
        """Get existing user or create new one from Telegram data."""
        user, _ = AuthService.authenticate_user(db, tg_user_data)
        return user

    @staticmethod
    def authenticate_user(db: Session, tg_user_data: dict[str, Any]) -> tuple[User, bool]:
        """
        Authenticate or create user from Telegram data.

        Returns (user, is_new).
        """
        tg_id = int(tg_user_data["id"])
        is_admin = tg_id in settings.ADMIN_IDS

        user = db.query(User).filter(User.tg_id == tg_id).first()

        if not user:
            # Create new user
            user = User(
                tg_id=tg_id,
                username=tg_user_data.get("username"),
                first_name=tg_user_data.get("first_name"),
                last_name=tg_user_data.get("last_name"),
                language_code=tg_user_data.get("language_code"),
                is_bot=tg_user_data.get("is_bot", False),
                tg_verified=True,
                role="admin" if is_admin else "owner",
                is_active=True,
                is_blocked=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create profile
            from app.models.user import UserProfile
            profile = UserProfile(user_id=user.id, is_agency=False)
            db.add(profile)
            db.commit()

            logger.info("New user created", user_id=user.id, tg_id=tg_id, role=user.role)
            return user, True

        # Update existing user data (name can change)
        if tg_user_data.get("first_name"):
            user.first_name = tg_user_data["first_name"]
        if tg_user_data.get("last_name"):
            user.last_name = tg_user_data["last_name"]
        if tg_user_data.get("username"):
            user.username = tg_user_data["username"]
        if tg_user_data.get("language_code"):
            user.language_code = tg_user_data["language_code"]
        user.is_active = True

        # Promote to admin if listed in ADMIN_IDS (idempotent)
        if is_admin and user.role != "admin":
            user.role = "admin"

        db.commit()
        return user, False

    @staticmethod
    def get_current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
        db: Session = Depends(get_db),
    ) -> User:
        """FastAPI dependency to get current authenticated user."""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = AuthService.decode_token(credentials.credentials, "access")
        user_id = int(payload["sub"])

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active or user.is_blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User inactive or blocked",
            )

        return user

    @staticmethod
    def require_admin(
        user: User = Depends(get_current_user),
    ) -> User:
        """Require admin or moderator role."""
        if user.role not in ("admin", "moderator"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        return user
