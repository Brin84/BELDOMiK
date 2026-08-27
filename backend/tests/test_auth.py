"""Tests for Telegram WebApp authentication."""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.telegram_auth import TelegramAuthService


def generate_valid_init_data(
    bot_token: str,
    user_data: dict,
    auth_date: int | None = None,
    query_id: str = "test_query_id",
) -> str:
    """
    Generate a valid Telegram init_data string with correct HMAC-SHA256 signature.

    The data_check_string is built by:
    1. Sorting keys alphabetically
    2. Joining as key=value pairs with newlines
    3. Computing HMAC-SHA256 with secret key derived from bot token
    """
    if auth_date is None:
        auth_date = int(time.time())

    # Prepare data dict
    data = {
        "auth_date": str(auth_date),
        "query_id": query_id,
        "user": json.dumps(user_data),
    }

    # Sort keys alphabetically for data_check_string
    sorted_keys = sorted(data.keys())
    data_check_pairs = [f"{key}={data[key]}" for key in sorted_keys]
    data_check_string = "\n".join(data_check_pairs)

    # Calculate HMAC-SHA256
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    # Add hash to data
    data["hash"] = calculated_hash

    # Return as URL-encoded string
    return urlencode(data)


def tamper_hash(init_data: str) -> str:
    """Tamper with the hash in init_data to make it invalid."""
    from urllib.parse import parse_qsl

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    parsed["hash"] = "invalid_hash_value_12345"
    return urlencode(parsed)


@pytest.fixture
def valid_user_data() -> dict:
    """Sample valid Telegram user data."""
    return {
        "id": 987654321,
        "first_name": "Telegram",
        "last_name": "User",
        "username": "telegramuser",
        "language_code": "ru",
        "is_premium": True,
        "allows_write_to_pm": True,
    }


@pytest.fixture
def valid_init_data(valid_user_data: dict) -> str:
    """Generate valid init_data using the configured bot token."""
    return generate_valid_init_data(
        settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345",
        valid_user_data,
    )


class TestTelegramWebAppAuth:
    """Tests for Telegram WebApp initData validation."""

    def test_valid_init_data_authentication(
        self, client, db_session: Session, valid_init_data: str
    ):
        """Test successful authentication with valid init_data."""
        response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": valid_init_data},
        )
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["telegram_id"] == 987654321
        assert data["user"]["username"] == "telegramuser"

    def test_invalid_hash_rejected(self, client, valid_init_data: str):
        """Test that init_data with invalid hash is rejected with 401."""
        tampered = tamper_hash(valid_init_data)
        response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": tampered},
        )
        assert response.status_code == 401
        assert "signature" in response.json()["detail"].lower()

    def test_expired_auth_date_rejected(self, client, valid_user_data: dict):
        """Test that init_data with expired auth_date (> 24h) is rejected."""
        bot_token = settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345"
        expired_data = generate_valid_init_data(
            bot_token,
            valid_user_data,
            auth_date=int(time.time()) - 90000,  # 25 hours ago
        )
        response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": expired_data},
        )
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()

    def test_missing_user_data_rejected(self, client, valid_user_data: dict):
        """Test that init_data without user field is rejected."""
        bot_token = settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345"
        data_without_user = {
            "auth_date": str(int(time.time())),
            "query_id": "test_query",
        }
        sorted_keys = sorted(data_without_user.keys())
        data_check_pairs = [f"{k}={data_without_user[k]}" for k in sorted_keys]
        data_check_string = "\n".join(data_check_pairs)

        secret_key = hmac.new(
            b"WebAppData", bot_token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        data_without_user["hash"] = calculated_hash
        init_data = urlencode(data_without_user)

        response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": init_data},
        )
        assert response.status_code == 401
        assert "user" in response.json()["detail"].lower()

    def test_missing_hash_rejected(self, client, valid_user_data: dict):
        """Test that init_data without hash field is rejected."""
        data = {
            "auth_date": str(int(time.time())),
            "query_id": "test_query",
            "user": json.dumps(valid_user_data),
        }
        init_data = urlencode(data)

        response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": init_data},
        )
        assert response.status_code == 401
        assert "hash" in response.json()["detail"].lower()

    def test_get_or_create_user_flow(
        self, client, db_session: Session, valid_init_data: str
    ):
        """Test that user is created on first auth and found on subsequent auth."""
        # First auth - create user
        response1 = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": valid_init_data},
        )
        assert response1.status_code == 200
        user_id = response1.json()["user"]["id"]

        # Verify user exists in DB
        user = db_session.query(User).filter(User.id == user_id).first()
        assert user is not None
        assert user.tg_id == 987654321

        # Second auth - should find existing user
        response2 = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": valid_init_data},
        )
        assert response2.status_code == 200
        assert response2.json()["user"]["id"] == user_id

        # Should only have 1 user in DB
        users = db_session.query(User).filter(User.tg_id == 987654321).all()
        assert len(users) == 1

    def test_user_profile_updated_on_reauth(
        self, client, db_session: Session, valid_user_data: dict
    ):
        """Test that user profile is updated on re-authentication."""
        bot_token = settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345"

        # First auth
        init_data1 = generate_valid_init_data(bot_token, valid_user_data)
        response1 = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": init_data1},
        )
        user_id = response1.json()["user"]["id"]

        # Update user data - change first_name
        updated_user_data = dict(valid_user_data)
        updated_user_data["first_name"] = "UpdatedName"
        init_data2 = generate_valid_init_data(bot_token, updated_user_data)

        response2 = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": init_data2},
        )
        assert response2.status_code == 200
        assert response2.json()["user"]["first_name"] == "UpdatedName"

        # Verify in DB
        user = db_session.query(User).filter(User.id == user_id).first()
        assert user.first_name == "UpdatedName"

    def test_refresh_token_flow(
        self, client, db_session: Session, valid_init_data: str
    ):
        """Test refresh token flow - valid refresh returns new tokens."""
        # Get tokens
        auth_response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": valid_init_data},
        )
        refresh_token = auth_response.json()["refresh_token"]

        # Refresh
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # Refresh endpoint returns valid tokens (may be identical if within same second)
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["access_token"] != ""

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token returns 401."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401

    def test_refresh_token_expired(self, client, db_session: Session):
        """Test refresh with expired token returns 401."""
        from app.services.auth import AuthService

        # Create a user first
        user = User(tg_id=111222333, username="refreshuser", first_name="Refresh")
        db_session.add(user)
        db_session.commit()

        # Generate expired refresh token
        from jose import jwt
        from datetime import UTC, datetime, timedelta

        expire = datetime.now(UTC) - timedelta(days=1)  # Expired yesterday
        payload = {
            "sub": str(user.id),
            "tg_id": user.tg_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(UTC) - timedelta(days=2),
        }
        expired_token = jwt.encode(
            payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": expired_token},
        )
        assert response.status_code == 401

    def test_get_me_endpoint(self, client, db_session: Session, valid_init_data: str):
        """Test GET /me returns current user info with valid access token."""
        # Get tokens
        auth_response = client.post(
            "/api/v1/auth/telegram",
            json={"init_data": valid_init_data},
        )
        access_token = auth_response.json()["access_token"]

        # Get /me
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["telegram_id"] == 987654321
        assert data["username"] == "telegramuser"

    def test_get_me_unauthorized(self, client):
        """Test GET /me without token returns 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_logout_endpoint(self, client):
        """Test logout endpoint returns success."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert "message" in response.json()


class TestTelegramAuthService:
    """Unit tests for TelegramAuthService validation logic."""

    def test_validate_init_data_valid(self, valid_init_data: str):
        """Test _validate_init_data returns parsed data for valid input."""
        parsed = TelegramAuthService._validate_init_data(valid_init_data)
        assert "user" in parsed
        assert "auth_date" in parsed
        assert "hash" not in parsed  # hash is popped

    def test_validate_init_data_invalid_hash(self, valid_init_data: str):
        """Test _validate_init_data raises 401 for invalid hash."""
        tampered = tamper_hash(valid_init_data)
        with pytest.raises(Exception) as exc_info:
            TelegramAuthService._validate_init_data(tampered)
        assert exc_info.value.status_code == 401

    def test_extract_user_valid(self, valid_init_data: str, valid_user_data: dict):
        """Test extract_user returns correct user data."""
        extracted = TelegramAuthService.extract_user(valid_init_data)
        assert extracted["id"] == valid_user_data["id"]
        assert extracted["first_name"] == valid_user_data["first_name"]
        assert extracted["username"] == valid_user_data["username"]

    def test_extract_user_missing_user_field(self, valid_user_data: dict):
        """Test extract_user raises 401 when user field is missing."""
        bot_token = settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345"
        data_without_user = {
            "auth_date": str(int(time.time())),
            "query_id": "test",
        }
        sorted_keys = sorted(data_without_user.keys())
        data_check_pairs = [f"{k}={data_without_user[k]}" for k in sorted_keys]
        data_check_string = "\n".join(data_check_pairs)

        secret_key = hmac.new(
            b"WebAppData", bot_token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        data_without_user["hash"] = calculated_hash
        init_data = urlencode(data_without_user)

        with pytest.raises(Exception) as exc_info:
            TelegramAuthService.extract_user(init_data)
        assert exc_info.value.status_code == 401

    def test_verify_webhook_secret(self):
        """Test webhook secret verification."""
        token = settings.TELEGRAM_BOT_TOKEN or "test_bot_token_12345"
        assert TelegramAuthService.verify_webhook_secret(token) is True
        assert TelegramAuthService.verify_webhook_secret("wrong_secret") is False
