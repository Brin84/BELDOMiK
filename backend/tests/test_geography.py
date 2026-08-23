"""Geography API tests."""
import pytest
from fastapi.testclient import TestClient


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