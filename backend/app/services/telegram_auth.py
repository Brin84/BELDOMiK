"""Telegram WebApp initData validation."""
import hashlib
import hmac
import logging
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qsl, unquote

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramAuthService:
    """Validate Telegram WebApp initData and extract user info."""

    @staticmethod
    def _validate_init_data(init_data: str) -> dict[str, Any]:
        """
        Validate Telegram WebApp initData using HMAC-SHA256.

        Returns parsed data dict if valid, raises HTTPException if invalid.
        """
        if not settings.TELEGRAM_BOT_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Telegram bot token not configured",
            ) from None

        try:
            parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        except Exception as e:
            logger.warning("Failed to parse init_data", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid init_data format",
            ) from None

        if "hash" not in parsed:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing hash in init_data",
            ) from None

        received_hash = parsed.pop("hash")

        # Create data_check_string: sort keys alphabetically, join with \n
        data_check_pairs = []
        for key in sorted(parsed.keys()):
            data_check_pairs.append(f"{key}={parsed[key]}")
        data_check_string = "\n".join(data_check_pairs)

        # Calculate HMAC-SHA256 with webappdata secret
        secret_key = hmac.new(
            b"WebAppData",
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256,
        ).digest()

        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            logger.warning("Telegram init_data validation failed, received=%s", received_hash[:8])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid init_data signature",
            ) from None

        return parsed

    @staticmethod
    def extract_user(init_data: str) -> dict[str, Any]:
        """Extract and validate user data from initData string."""
        parsed = TelegramAuthService._validate_init_data(init_data)

        if "user" not in parsed:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No user data in init_data",
            ) from None

        # user is URL-encoded JSON
        import json
        try:
            user_data = json.loads(unquote(parsed["user"]))
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Failed to parse user JSON", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user data",
            ) from None

        # Optional: check auth_date for freshness (5 min)
        auth_date = parsed.get("auth_date")
        if auth_date:
            try:
                auth_ts = int(auth_date)
                now = datetime.now(UTC).timestamp()
                if now - auth_ts > 86400:  # 24 hours max
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="init_data expired",
                    ) from None
            except ValueError:
                pass

        return user_data

    @staticmethod
    def verify_webhook_secret(secret: str) -> bool:
        """Verify webhook secret for secure webhook calls from Telegram."""
        expected = settings.TELEGRAM_WEBHOOK_SECRET
        if not expected:
            # Fallback to bot token if webhook secret not set
            expected = settings.TELEGRAM_BOT_TOKEN
        return hmac.compare_digest(secret, expected)
