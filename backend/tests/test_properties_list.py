"""Tests for the properties list endpoint (Krisha-style filters and sorting).

Batch 1 of the Krisha.kz roadmap: rich filters + correct sorting.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.geography import City
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User


def _utc(year, month, day):
    return datetime(year, month, day)


@pytest.fixture
def property_seed(db_session: Session, seed_test_data) -> dict:
    """Create published test properties with distinct prices/areas/rooms/dates."""
    owner = User(
        tg_id=987654321,
        username="sample_owner",
        first_name="Sample",
        last_name="Owner",
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    city = db_session.query(City).filter(City.name == "Минск").first()
    prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
    op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()

    rows = [
        (250000, 65.0, 2, _utc(2026, 8, 20), PropertyStatus.PUBLISHED),  # A price 250k
        (100000, 40.0, 1, _utc(2026, 8, 28), PropertyStatus.PUBLISHED),  # B price 100k
        (150000, 90.0, 3, _utc(2026, 8, 25), PropertyStatus.PUBLISHED),  # C price 150k
        (500000, 300.0, 5, _utc(2026, 8, 30), PropertyStatus.DRAFT),  # D hidden
    ]

    created_ids = []
    for price_byn, total_area, rooms_count, created_at, status in rows:
        prop = Property(
            owner_id=owner.id,
            type_id=prop_type.id,
            operation_id=op_type.id,
            city_id=city.id,
            address=f"Test Address {price_byn}",
            total_area=total_area,
            rooms_count=rooms_count,
            floor=3,
            total_floors=9,
            build_year=2018,
            status=status,
            created_at=created_at,
            favorites_count=0,
        )
        db_session.add(prop)
        db_session.flush()
        db_session.add(
            PropertyPrice(
                property_id=prop.id,
                price_byn=price_byn,
                price_usd=price_byn // 3,
                price_per_m2_byn=int(price_byn / total_area),
                is_current=True,
            )
        )
        db_session.commit()
        db_session.refresh(prop)
        created_ids.append(prop.id)

    published_ids = [created_ids[0], created_ids[1], created_ids[2]]
    return {
        "ids": published_ids,  # [A, B, C] creation order (A price 250k ...)
        "a": created_ids[0],  # price 250k, area 65
        "b": created_ids[1],  # price 100k, area 40
        "c": created_ids[2],  # price 150k, area 90
    }


class TestPropertiesList:
    """List endpoint: filters and sorting."""

    def test_default_sort_newest_first(self, client: TestClient, property_seed):
        resp = client.get("/api/v1/properties")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        # Only published properties are returned
        assert len(data["items"]) == 3
        # created_at desc -> C (Aug 25? no) ... newest published is B (Aug 28),
        # then C (Aug 25), then A (Aug 20)
        assert [p["id"] for p in data["items"]] == [
            property_seed["b"],
            property_seed["c"],
            property_seed["a"],
        ]

    def test_sort_price_asc(self, client: TestClient, property_seed):
        resp = client.get(
            "/api/v1/properties", params={"sort_by": "price_byn", "sort_order": "asc"}
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["b"],
            property_seed["c"],
            property_seed["a"],
        ]

    def test_sort_price_desc_composite_slug(self, client: TestClient, property_seed):
        # Composite slug used by the frontend
        resp = client.get("/api/v1/properties", params={"sort_by": "price_byn_desc"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["a"],
            property_seed["c"],
            property_seed["b"],
        ]

    def test_sort_by_total_area(self, client: TestClient, property_seed):
        resp = client.get(
            "/api/v1/properties", params={"sort_by": "total_area", "sort_order": "asc"}
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["b"],
            property_seed["a"],
            property_seed["c"],
        ]

    def test_filter_by_rooms(self, client: TestClient, property_seed):
        resp = client.get("/api/v1/properties", params={"rooms_count": 2})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["a"]]

    def test_filter_price_range(self, client: TestClient, property_seed):
        resp = client.get(
            "/api/v1/properties",
            params={"price_byn_min": 120000, "price_byn_max": 200000},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["c"]]

    def test_filter_area_range(self, client: TestClient, property_seed):
        resp = client.get(
            "/api/v1/properties",
            params={"area_min": 50, "area_max": 80},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["a"]]
