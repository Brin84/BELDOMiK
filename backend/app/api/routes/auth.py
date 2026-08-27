"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    RefreshTokenRequest,
    RefreshTokenResponse,
    TelegramAuthRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth import AuthService
from app.services.telegram_auth import TelegramAuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/telegram", response_model=TokenResponse)
def telegram_auth(
    request: TelegramAuthRequest,
    db: Session = Depends(get_db),
):
    """Authenticate via Telegram WebApp initData."""
    # Validate initData and extract user
    user_data = TelegramAuthService.extract_user(request.init_data)

    # Get or create user
    user = AuthService.get_or_create_user(db, user_data)

    # Update user info
    user.first_name = user_data.get("first_name", user.first_name)
    user.last_name = user_data.get("last_name", user.last_name)
    user.username = user_data.get("username", user.username)
    user.language_code = user_data.get("language_code", user.language_code)
    db.commit()

    # Create tokens
    tokens = AuthService.create_tokens(user.id, user.tg_id)

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=tokens["expires_in"],
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Refresh access token."""
    payload = AuthService.decode_refresh_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    tokens = AuthService.create_tokens(user.id, user.tg_id)
    return RefreshTokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        expires_in=tokens["expires_in"],
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout():
    """Logout (client-side token removal)."""
    return {"message": "Logged out successfully"}