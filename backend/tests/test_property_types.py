"""Property types and operation types API tests.

Regression: literal routes (/operations, /operations/list, /operations/{id})
must be declared before /{type_id} on the router. Otherwise FastAPI matches
"/operations" against /{type_id} first and returns 422 (int parse error),
which broke the frontend's operation-types dropdown.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.usefixtures("seed_test_data")
def test_get_property_types(client: TestClient):
    """Get all property types."""
    resp = client.get("/api/v1/property-types")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2  # Квартира + Дом
    assert data[0]["name"] == "Квартира"


@pytest.mark.usefixtures("seed_test_data")
def test_get_operations(client: TestClient):
    """Canonical /operations route (used by the frontend)."""
    resp = client.get("/api/v1/property-types/operations")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2  # Продажа + Аренда
    assert data[0]["name"] == "Продажа"


@pytest.mark.usefixtures("seed_test_data")
def test_get_operations_list_alias(client: TestClient):
    """Backward-compatible /operations/list alias."""
    resp = client.get("/api/v1/property-types/operations/list")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.usefixtures("seed_test_data")
def test_get_operation_by_id(client: TestClient):
    """Single operation by id (declared before /{type_id})."""
    resp = client.get("/api/v1/property-types/operations/1")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == 1


@pytest.mark.usefixtures("seed_test_data")
def test_get_property_type_by_id(client: TestClient):
    """Single type by id — /{type_id} must still work after the reorder."""
    resp = client.get("/api/v1/property-types/1")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == 1