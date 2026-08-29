"""Health check tests."""
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test health endpoint returns ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "BELDOMiK API"


def test_root_endpoint(client: TestClient):
    """Test root endpoint returns either API info or serves frontend HTML."""
    response = client.get("/")
    assert response.status_code == 200
    # In test environment without frontend dist, returns JSON
    # With frontend dist, returns HTML
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        data = response.json()
        assert "name" in data
        assert "version" in data
    else:
        # Frontend served - check for HTML
        assert "text/html" in content_type
        assert "BELDOMiK" in response.text