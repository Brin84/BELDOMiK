"""API dependencies."""
from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(None),
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def get_optional_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(None),
) -> User | None:
    """Get current user if authenticated, otherwise None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload is None:
            return None

        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require admin role."""
    if current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_moderator_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require moderator or admin role."""
    if current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Moderator access required")
    return current_user


def get_telegram_init_data(
    request: Request,
    x_telegram_init_data: str | None = Header(None, alias="X-Telegram-Init-Data"),
) -> str:
    """Extract Telegram initData from header."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=400, detail="X-Telegram-Init-Data header required")
    return x_telegram_init_data