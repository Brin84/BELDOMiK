"""Tests for viewing requests feature."""
import pytest
from sqlalchemy.orm import Session

from app.models.geography import City, Region
from app.models.property import Property, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.viewing_service import ViewingService


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        tg_id=555555555,
        username="viewings_tester",
        first_name="Viewings",
        last_name="Tester",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_owner(db_session: Session) -> User:
    """Create a property owner."""
    user = User(
        tg_id=666666666,
        username="owner",
        first_name="Owner",
        last_name="User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_property(db_session: Session, test_owner: User) -> Property:
    """Create a test property owned by test_owner."""
    region = Region(name="Test Region", sort_order=1)
    db_session.add(region)
    db_session.commit()

    city = City(name="Test City", region_id=region.id, is_major=True, sort_order=1)
    db_session.add(city)
    db_session.commit()

    prop_type = PropertyType(
        category="apartment",
        name="Test Apartment",
        name_en="Test Apartment",
        name_plural="Test Apartments",
        icon="apartment",
        sort_order=1,
        is_active=True,
    )
    db_session.add(prop_type)
    db_session.commit()

    op_type = OperationType(
        name="Sale", name_en="Sale", name_plural="Sales", sort_order=1, is_active=True
    )
    db_session.add(op_type)
    db_session.commit()

    property_obj = Property(
        owner_id=test_owner.id,
        type_id=prop_type.id,
        operation_id=op_type.id,
        city_id=city.id,
        address="Test Address 123",
        total_area=50.0,
        rooms_count=2,
        status=PropertyStatus.PUBLISHED,
        favorites_count=0,
    )
    db_session.add(property_obj)
    db_session.commit()
    db_session.refresh(property_obj)
    return property_obj


class TestViewingService:
    """Tests for ViewingService."""

    def test_create_request(self, db_session: Session, test_user: User, test_property: Property):
        """Test creating a viewing request."""
        request = ViewingService.create_request(
            db_session,
            test_property.id,
            test_user.id,
            "Иван",
            "+375291234567",
            None,
            "18:00",
            "После работы",
        )
        assert request is not None
        assert request.property_id == test_property.id
        assert request.user_id == test_user.id
        assert request.name == "Иван"
        assert request.phone == "+375291234567"
        assert request.preferred_time == "18:00"
        assert request.comment == "После работы"
        assert request.status == "pending"

    def test_create_request_nonexistent_property(self, db_session: Session, test_user: User):
        """Test creating a request for a nonexistent property returns None."""
        request = ViewingService.create_request(
            db_session, 999999, test_user.id, "Иван", "+375291234567", None, None, None
        )
        assert request is None

    def test_list_incoming(self, db_session: Session, test_user: User, test_owner: User, test_property: Property):
        """Test listing incoming requests for the owner."""
        ViewingService.create_request(
            db_session, test_property.id, test_user.id, "Иван", "+375291234567", None, None, None
        )
        requests = ViewingService.list_incoming(db_session, test_owner.id)
        assert len(requests) == 1
        assert requests[0].name == "Иван"

    def test_list_incoming_empty(self, db_session: Session, test_owner: User):
        """Test listing incoming requests for an owner with no requests."""
        requests = ViewingService.list_incoming(db_session, test_owner.id)
        assert requests == []

    def test_update_status(self, db_session: Session, test_user: User, test_owner: User, test_property: Property):
        """Test updating request status (owner only)."""
        request = ViewingService.create_request(
            db_session, test_property.id, test_user.id, "Иван", "+375291234567", None, None, None
        )
        updated = ViewingService.update_status(db_session, request.id, test_owner.id, "confirmed")
        assert updated.status == "confirmed"

    def test_update_status_other_user_rejected(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test that a non-owner cannot update status."""
        request = ViewingService.create_request(
            db_session, test_property.id, test_user.id, "Иван", "+375291234567", None, None, None
        )
        other_user = User(tg_id=777777777, username="other", first_name="Other")
        db_session.add(other_user)
        db_session.commit()

        updated = ViewingService.update_status(db_session, request.id, other_user.id, "confirmed")
        assert updated is None


class TestViewingsAPI:
    """Tests for viewings API endpoints."""

    def _auth(self, app, user: User):
        from app.api.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: user

    def test_create_viewing_endpoint(self, client, test_user: User, test_property: Property):
        """Test POST /viewings."""
        from app.main import app
        self._auth(app, test_user)

        response = client.post(
            "/api/v1/viewings",
            json={
                "property_id": test_property.id,
                "name": "Иван",
                "phone": "+375291234567",
                "preferred_time": "18:00",
                "comment": "После работы",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Иван"
        assert data["status"] == "pending"
        assert data["property_id"] == test_property.id

        app.dependency_overrides.clear()

    def test_create_viewing_nonexistent_property(self, client, test_user: User):
        """Test creating a viewing for a nonexistent property returns 404."""
        from app.main import app
        self._auth(app, test_user)

        response = client.post(
            "/api/v1/viewings",
            json={"property_id": 999999, "name": "Иван", "phone": "+375291234567"},
        )
        assert response.status_code == 404

        app.dependency_overrides.clear()

    def test_viewings_require_auth(self, client):
        """Test viewings endpoints require auth."""
        response = client.get("/api/v1/viewings")
        assert response.status_code == 401

    def test_list_incoming_endpoint(
        self, client, test_user: User, test_owner: User, test_property: Property
    ):
        """Test GET /viewings returns owner's incoming requests."""
        from app.main import app

        # Create a request as test_user (only swap get_current_user; keep get_db override)
        self._auth(app, test_user)
        client.post(
            "/api/v1/viewings",
            json={"property_id": test_property.id, "name": "Иван", "phone": "+375291234567"},
        )

        # Owner lists incoming
        self._auth(app, test_owner)
        response = client.get("/api/v1/viewings")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Иван"

        app.dependency_overrides.clear()

    def test_update_status_endpoint(
        self, client, test_user: User, test_owner: User, test_property: Property
    ):
        """Test PATCH /viewings/{id} to confirm a request."""
        from app.main import app

        self._auth(app, test_user)
        created = client.post(
            "/api/v1/viewings",
            json={"property_id": test_property.id, "name": "Иван", "phone": "+375291234567"},
        ).json()

        self._auth(app, test_owner)
        response = client.patch(
            f"/api/v1/viewings/{created['id']}", json={"status": "confirmed"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "confirmed"

        app.dependency_overrides.clear()
