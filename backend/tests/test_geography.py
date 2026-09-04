"""Geography API tests."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User


@pytest.mark.usefixtures("seed_test_data")
def test_get_regions(client: TestClient):
    """Test get all regions."""
    response = client.get("/api/v1/geography/regions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2  # Minsk + Minsk Region


@pytest.mark.usefixtures("seed_test_data")
def test_get_cities(client: TestClient):
    """Test get all cities."""
    response = client.get("/api/v1/geography/cities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Test seed data has only Minsk city
    assert len(data) == 1


def test_get_cities_filtered_by_region(client: TestClient):
    """Test get cities filtered by region."""
    # Get regions first
    regions_resp = client.get("/api/v1/geography/regions")
    regions = regions_resp.json()
    minsk_region = next(r for r in regions if r["name"] == "Минск")

    response = client.get(f"/api/v1/geography/cities?region_id={minsk_region['id']}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Minsk region should have Minsk city
    assert len(data) == 1
    assert data[0]["name"] == "Минск"


@pytest.mark.usefixtures("seed_test_data")
def test_get_districts(client: TestClient):
    """Test get districts for a city."""
    # Get Minsk city
    cities_resp = client.get("/api/v1/geography/cities")
    cities = cities_resp.json()
    minsk = next(c for c in cities if c["name"] == "Минск")

    response = client.get(f"/api/v1/geography/districts?city_id={minsk['id']}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Test seed data has 2 districts
    assert len(data) == 2


def test_get_metro_lines(client: TestClient):
    """Test get metro lines."""
    response = client.get("/api/v1/geography/metro-lines")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2  # Moscow and Avtozavodskaya lines


def test_get_metro_stations(client: TestClient):
    """Test get metro stations."""
    response = client.get("/api/v1/geography/metro")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have stations from both lines
    assert len(data) > 0


def test_get_neighborhoods(client: TestClient):
    """Test get neighborhoods (empty for now)."""
    response = client.get("/api/v1/geography/neighborhoods")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_streets(client: TestClient):
    """Test get streets (empty for now)."""
    response = client.get("/api/v1/geography/streets?city_id=1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.fixture
def user(db_session: Session) -> User:
    """Create a test user for authenticated endpoints."""
    user = User(
        tg_id=300000001,
        username="geo_test",
        first_name="Geo",
        last_name="Tester",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


def test_create_city_requires_auth(client: TestClient):
    """Unauthenticated request is rejected."""
    response = client.post(
        "/api/v1/geography/cities",
        json={"name": "Купаловцы"},
    )
    assert response.status_code == 401


def test_create_city_and_get_in_list(client: TestClient, auth_headers: dict):
    """Adding a custom settlement marks it visible in the full city list."""
    response = client.post(
        "/api/v1/geography/cities",
        json={"name": "Купаловцы"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Купаловцы"
    assert data["region_id"] is None
    assert data["is_major"] is False

    cities = client.get("/api/v1/geography/cities").json()
    names = [c["name"] for c in cities]
    assert "Купаловцы" in names


def test_create_city_is_idempotent(client: TestClient, auth_headers: dict):
    """Same name (case-insensitive) does not create duplicates."""
    first = client.post(
        "/api/v1/geography/cities",
        json={"name": "Заречье"},
        headers=auth_headers,
    ).json()
    second = client.post(
        "/api/v1/geography/cities",
        json={"name": "заречье"},
        headers=auth_headers,
    ).json()
    assert first["id"] == second["id"]


def test_create_city_attached_to_region(client: TestClient, auth_headers: dict, db_session: Session):
    """A settlement created with a valid region is saved under it."""
    from app.models.geography import Region

    region = db_session.query(Region).first()
    response = client.post(
        "/api/v1/geography/cities",
        json={"name": "Новосёлки", "region_id": region.id},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["region_id"] == region.id


def test_create_city_invalid_region(client: TestClient, auth_headers: dict):
    """Unknown region returns 422."""
    response = client.post(
        "/api/v1/geography/cities",
        json={"name": "Борятино", "region_id": 999},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_city_empty_name(client: TestClient, auth_headers: dict):
    """Blank/whitespace-only name is rejected."""
    response = client.post(
        "/api/v1/geography/cities",
        json={"name": "   "},
        headers=auth_headers,
    )
    assert response.status_code == 422
