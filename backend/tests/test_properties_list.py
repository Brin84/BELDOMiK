"""Tests for the properties list endpoint (Krisha-style filters and sorting).

Batch 1 of the Krisha.kz roadmap: rich filters + correct sorting.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.geography import City
from app.models.property import Property, PropertyPhoto, PropertyPrice, PropertyStatus
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
        # (price, total_area, rooms, created_at, status, living_area, kitchen_area, is_new_building)
        (250000, 65.0, 2, _utc(2026, 8, 20), PropertyStatus.PUBLISHED, 45.0, 9.0, False),  # A price 250k
        (100000, 40.0, 1, _utc(2026, 8, 28), PropertyStatus.PUBLISHED, 28.0, 12.0, False),  # B price 100k
        (150000, 90.0, 3, _utc(2026, 8, 25), PropertyStatus.PUBLISHED, 60.0, 8.0, True),  # C price 150k (новостройка)
        (500000, 300.0, 5, _utc(2026, 8, 30), PropertyStatus.DRAFT, 200.0, 40.0, False),  # D hidden
    ]

    created_ids = []
    for price_byn, total_area, rooms_count, created_at, status, living_area, kitchen_area, is_new_building in rows:
        prop = Property(
            owner_id=owner.id,
            type_id=prop_type.id,
            operation_id=op_type.id,
            city_id=city.id,
            address=f"Test Address {price_byn}",
            total_area=total_area,
            living_area=living_area,
            kitchen_area=kitchen_area,
            rooms_count=rooms_count,
            floor=3,
            total_floors=9,
            build_year=2018,
            is_new_building=is_new_building,
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

    # Give property A a photo so with_photos_only is testable.
    a = db_session.get(Property, created_ids[0])
    db_session.add(PropertyPhoto(property_id=a.id, url="https://example.com/a.jpg"))
    # Property C is an agency listing — used by the «без посредников» (direct) filter.
    c = db_session.get(Property, created_ids[2])
    c.agency_id = 1
    db_session.commit()

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

    def test_filter_with_photos_only(self, client: TestClient, property_seed):
        # Only property A has a photo; the count aggregate must live in HAVING,
        # not WHERE (Postgres rejects aggregate in WHERE).
        resp = client.get("/api/v1/properties", params={"with_photos_only": True})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["a"]]

    def test_q_search_by_address(self, client: TestClient, property_seed):
        # Free-text search matches address (ILINE over joined fields).
        resp = client.get("/api/v1/properties", params={"q": "Test Address 250000"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["a"]]

    def test_q_search_by_city(self, client: TestClient, property_seed):
        # City.name is joined, so the same text matches location names.
        # NOTE: SQLite lower() is ASCII-only, so the Cyrillic query must match
        # the stored case here; on Postgres ILIKE handles Cyrillic properly.
        resp = client.get("/api/v1/properties", params={"q": "Минск"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        # All published properties are in Минск
        assert len(data["items"]) == 3

    def test_q_search_no_results(self, client: TestClient, property_seed):
        resp = client.get("/api/v1/properties", params={"q": "несуществующий_текст"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["items"] == []
        assert resp.json()["total"] == 0

    def test_q_search_escapes_wildcards(self, client: TestClient, property_seed):
        # '%' in the query must not expand to everything; it is escaped.
        resp = client.get("/api/v1/properties", params={"q": "%"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["total"] == 0

    def test_is_direct_only(self, client: TestClient, property_seed):
        # «Без посредников»: C (agency_id) is filtered out, owners A and B remain.
        resp = client.get("/api/v1/properties", params={"is_direct_only": True})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["b"],
            property_seed["a"],
        ]

    def test_new_building_only(self, client: TestClient, property_seed):
        # Новостройки: только объявления с is_new_building=True (C).
        resp = client.get("/api/v1/properties", params={"new_building_only": True})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [property_seed["c"]]

    def test_new_building_combined_with_type(self, client: TestClient, property_seed):
        # Фильтр новостроек сочетается с типом/операцией и отдаёт поле is_new_building.
        resp = client.get(
            "/api/v1/properties", params={"new_building_only": True, "operation_id": 1}
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["is_new_building"] is True

    def test_all_properties_expose_is_new_building(self, client: TestClient, property_seed):
        # Поле is_new_building присутствует в списке (batch-контракт для фронтенда).
        resp = client.get("/api/v1/properties")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert all("is_new_building" in p for p in data["items"])
        new_buildings = [p for p in data["items"] if p["is_new_building"]]
        assert [p["id"] for p in new_buildings] == [property_seed["c"]]

    def test_is_direct_in_list(self, client: TestClient, property_seed):
        # Поле is_direct (без посредников) присутствует в списке и верно вычислено:
        # A/B — собственники (agency_id None → True), C — агентство (False).
        resp = client.get("/api/v1/properties")
        assert resp.status_code == 200, resp.text
        items = {p["id"]: p for p in resp.json()["items"]}
        assert items[property_seed["a"]]["is_direct"] is True
        assert items[property_seed["b"]]["is_direct"] is True
        assert items[property_seed["c"]]["is_direct"] is False

    def test_is_direct_in_detail(self, client: TestClient, property_seed):
        # В деталях is_direct вычисляется из agency_id.
        resp = client.get(f"/api/v1/properties/{property_seed['a']}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["is_direct"] is True
        resp_c = client.get(f"/api/v1/properties/{property_seed['c']}")
        assert resp_c.status_code == 200, resp.text
        assert resp_c.json()["is_direct"] is False

    def test_living_area_range(self, client: TestClient, property_seed):
        # living: A=45, B=28, C=60
        resp = client.get("/api/v1/properties", params={"living_area_min": 40})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["c"],
            property_seed["a"],
        ]

    def test_kitchen_area_range(self, client: TestClient, property_seed):
        # kitchen: A=9, B=12, C=8
        resp = client.get("/api/v1/properties", params={"kitchen_area_max": 10})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert [p["id"] for p in data["items"]] == [
            property_seed["c"],
            property_seed["a"],
        ]
