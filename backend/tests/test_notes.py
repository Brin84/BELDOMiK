"""Tests for property notes feature."""
import pytest
from sqlalchemy.orm import Session

from app.models.geography import City, Region
from app.models.property import Property, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.property_note_service import PropertyNoteService


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        tg_id=444444444,
        username="notes_tester",
        first_name="Notes",
        last_name="Tester",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_property(db_session: Session, test_user: User) -> Property:
    """Create a test property."""
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
        owner_id=test_user.id,
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


class TestPropertyNoteService:
    """Tests for PropertyNoteService."""

    def test_create_note(self, db_session: Session, test_user: User, test_property: Property):
        """Test creating a note."""
        note = PropertyNoteService.upsert(
            db_session, test_user.id, test_property.id, "Позвонить владельцу"
        )
        assert note is not None
        assert note.text == "Позвонить владельцу"
        assert note.user_id == test_user.id
        assert note.property_id == test_property.id

    def test_update_note(self, db_session: Session, test_user: User, test_property: Property):
        """Test updating an existing note (upsert)."""
        PropertyNoteService.upsert(db_session, test_user.id, test_property.id, "Старая заметка")
        note = PropertyNoteService.upsert(db_session, test_user.id, test_property.id, "Новая заметка")

        assert note.text == "Новая заметка"
        # Only one note should exist
        notes = db_session.query(type(note)).filter(
            type(note).user_id == test_user.id,
            type(note).property_id == test_property.id,
        ).all()
        assert len(notes) == 1

    def test_get_note(self, db_session: Session, test_user: User, test_property: Property):
        """Test getting a note."""
        PropertyNoteService.upsert(db_session, test_user.id, test_property.id, "Заметка")
        note = PropertyNoteService.get(db_session, test_user.id, test_property.id)
        assert note.text == "Заметка"

    def test_get_note_not_found(self, db_session: Session, test_user: User, test_property: Property):
        """Test getting a non-existent note returns None."""
        note = PropertyNoteService.get(db_session, test_user.id, test_property.id)
        assert note is None

    def test_delete_note(self, db_session: Session, test_user: User, test_property: Property):
        """Test deleting a note."""
        PropertyNoteService.upsert(db_session, test_user.id, test_property.id, "Заметка")
        assert PropertyNoteService.delete(db_session, test_user.id, test_property.id) is True
        assert PropertyNoteService.get(db_session, test_user.id, test_property.id) is None

    def test_delete_note_not_found(self, db_session: Session, test_user: User, test_property: Property):
        """Test deleting a non-existent note returns False."""
        assert PropertyNoteService.delete(db_session, test_user.id, test_property.id) is False

    def test_upsert_nonexistent_property(self, db_session: Session, test_user: User):
        """Test upserting a note for a nonexistent property returns None."""
        note = PropertyNoteService.upsert(db_session, test_user.id, 999999, "Заметка")
        assert note is None


class TestPropertyNotesAPI:
    """Tests for property notes API endpoints."""

    def _auth(self, app, test_user: User):
        from app.api.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: test_user

    def test_upsert_note_endpoint(self, client, test_user: User, test_property: Property):
        """Test PUT /properties/{id}/note."""
        from app.main import app
        self._auth(app, test_user)

        response = client.put(
            f"/api/v1/properties/{test_property.id}/note", json={"text": "Заметка"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Заметка"
        assert data["property_id"] == test_property.id

        app.dependency_overrides.clear()

    def test_get_note_endpoint(self, client, test_user: User, test_property: Property):
        """Test GET /properties/{id}/note."""
        from app.main import app
        self._auth(app, test_user)

        client.put(f"/api/v1/properties/{test_property.id}/note", json={"text": "Заметка"})
        response = client.get(f"/api/v1/properties/{test_property.id}/note")
        assert response.status_code == 200
        assert response.json()["text"] == "Заметка"

        app.dependency_overrides.clear()

    def test_get_note_empty(self, client, test_user: User, test_property: Property):
        """Test GET note when none exists returns null."""
        from app.main import app
        self._auth(app, test_user)

        response = client.get(f"/api/v1/properties/{test_property.id}/note")
        assert response.status_code == 200
        assert response.json() is None

        app.dependency_overrides.clear()

    def test_delete_note_endpoint(self, client, test_user: User, test_property: Property):
        """Test DELETE /properties/{id}/note."""
        from app.main import app
        self._auth(app, test_user)

        client.put(f"/api/v1/properties/{test_property.id}/note", json={"text": "Заметка"})
        response = client.delete(f"/api/v1/properties/{test_property.id}/note")
        assert response.status_code == 200

        # Now it's gone
        response = client.get(f"/api/v1/properties/{test_property.id}/note")
        assert response.json() is None

        app.dependency_overrides.clear()

    def test_note_requires_auth(self, client, test_property: Property):
        """Test notes endpoints require auth."""
        response = client.get(f"/api/v1/properties/{test_property.id}/note")
        assert response.status_code == 401
