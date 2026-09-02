"""Tests for collections feature."""
import pytest
from sqlalchemy.orm import Session

from app.models.geography import City, Region
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.collection_service import CollectionService


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        tg_id=222222222,
        username="collections_tester",
        first_name="Collections",
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

    price = PropertyPrice(
        property_id=property_obj.id,
        price_byn=100000,
        price_usd=30000,
        price_per_m2_byn=2000,
        is_current=True,
    )
    db_session.add(price)
    db_session.commit()

    return property_obj


class TestCollectionService:
    """Tests for CollectionService."""

    def test_create_collection(self, db_session: Session, test_user: User):
        """Test creating a collection."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Моя подборка", "Описание"
        )
        assert collection.id > 0
        assert collection.user_id == test_user.id
        assert collection.name == "Моя подборка"
        assert collection.description == "Описание"

    def test_get_user_collections(self, db_session: Session, test_user: User):
        """Test listing user collections."""
        CollectionService.create_collection(db_session, test_user.id, "Подборка 1", None)
        CollectionService.create_collection(db_session, test_user.id, "Подборка 2", None)

        collections = CollectionService.get_user_collections(db_session, test_user.id)
        assert len(collections) == 2

    def test_update_collection(self, db_session: Session, test_user: User):
        """Test renaming a collection (owner only)."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Старое имя", None
        )
        updated = CollectionService.update_collection(
            db_session, collection.id, test_user.id, "Новое имя", "Новое описание"
        )
        assert updated.name == "Новое имя"
        assert updated.description == "Новое описание"

    def test_update_collection_other_user(self, db_session: Session, test_user: User):
        """Test that another user cannot update the collection."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Имя", None
        )
        other_user = User(tg_id=333333333, username="other", first_name="Other")
        db_session.add(other_user)
        db_session.commit()

        updated = CollectionService.update_collection(
            db_session, collection.id, other_user.id, "Чужая попытка", None
        )
        assert updated is None

    def test_delete_collection(self, db_session: Session, test_user: User):
        """Test deleting a collection."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Удалить", None
        )
        assert CollectionService.delete_collection(db_session, collection.id, test_user.id) is True
        assert CollectionService.get_user_collections(db_session, test_user.id) == []

    def test_add_and_remove_item(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test adding and removing a property from a collection."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Подборка", None
        )
        item = CollectionService.add_item(db_session, collection.id, test_user.id, test_property.id)
        assert item is not None
        assert item.property_id == test_property.id

        # Duplicate add returns existing
        item2 = CollectionService.add_item(db_session, collection.id, test_user.id, test_property.id)
        assert item2.id == item.id

        # Item count
        assert CollectionService.get_item_count(db_session, collection.id) == 1

        # Remove
        assert CollectionService.remove_item(
            db_session, collection.id, test_user.id, test_property.id
        ) is True
        assert CollectionService.get_item_count(db_session, collection.id) == 0

    def test_add_item_nonexistent_collection(self, db_session: Session, test_user: User):
        """Test adding to a nonexistent collection returns None."""
        item = CollectionService.add_item(db_session, 999999, test_user.id, 1)
        assert item is None

    def test_get_collection_property_ids(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test getting property IDs in a collection."""
        collection = CollectionService.create_collection(
            db_session, test_user.id, "Подборка", None
        )
        CollectionService.add_item(db_session, collection.id, test_user.id, test_property.id)
        ids = CollectionService.get_collection_property_ids(
            db_session, collection.id, test_user.id
        )
        assert test_property.id in ids


class TestCollectionsAPI:
    """Tests for collections API endpoints."""

    def _auth(self, app, test_user: User):
        from app.api.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: test_user

    def test_create_collection_endpoint(self, client, test_user: User):
        """Test POST /collections."""
        from app.main import app
        self._auth(app, test_user)

        response = client.post(
            "/api/v1/collections", json={"name": "Моя подборка", "description": "Описание"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Моя подборка"
        assert data["property_count"] == 0

        app.dependency_overrides.clear()

    def test_collections_require_auth(self, client):
        """Test collections endpoints require auth."""
        response = client.get("/api/v1/collections")
        assert response.status_code == 401

    def test_list_collections_endpoint(self, client, test_user: User):
        """Test GET /collections."""
        from app.main import app
        self._auth(app, test_user)

        client.post("/api/v1/collections", json={"name": "Подборка 1"})
        client.post("/api/v1/collections", json={"name": "Подборка 2"})

        response = client.get("/api/v1/collections")
        assert response.status_code == 200
        assert len(response.json()) == 2

        app.dependency_overrides.clear()

    def test_get_collection_detail(
        self, client, test_user: User, test_property: Property
    ):
        """Test GET /collections/{id} returns collection with items."""
        from app.main import app
        self._auth(app, test_user)

        created = client.post(
            "/api/v1/collections", json={"name": "Подборка"}
        ).json()
        client.post(
            f"/api/v1/collections/{created['id']}/items",
            json={"property_id": test_property.id},
        )

        response = client.get(f"/api/v1/collections/{created['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Подборка"
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == test_property.id

        app.dependency_overrides.clear()

    def test_delete_collection_endpoint(self, client, test_user: User):
        """Test DELETE /collections/{id}."""
        from app.main import app
        self._auth(app, test_user)

        created = client.post(
            "/api/v1/collections", json={"name": "Удалить"}
        ).json()

        response = client.delete(f"/api/v1/collections/{created['id']}")
        assert response.status_code == 200

        # Verify it's gone
        response = client.get(f"/api/v1/collections/{created['id']}")
        assert response.status_code == 404

        app.dependency_overrides.clear()

    def test_add_item_endpoint(self, client, test_user: User, test_property: Property):
        """Test POST /collections/{id}/items."""
        from app.main import app
        self._auth(app, test_user)

        created = client.post(
            "/api/v1/collections", json={"name": "Подборка"}
        ).json()

        response = client.post(
            f"/api/v1/collections/{created['id']}/items",
            json={"property_id": test_property.id},
        )
        assert response.status_code == 201
        assert response.json()["property_id"] == test_property.id

        app.dependency_overrides.clear()

    def test_remove_item_endpoint(self, client, test_user: User, test_property: Property):
        """Test DELETE /collections/{id}/items/{property_id}."""
        from app.main import app
        self._auth(app, test_user)

        created = client.post(
            "/api/v1/collections", json={"name": "Подборка"}
        ).json()
        client.post(
            f"/api/v1/collections/{created['id']}/items",
            json={"property_id": test_property.id},
        )

        response = client.delete(
            f"/api/v1/collections/{created['id']}/items/{test_property.id}"
        )
        assert response.status_code == 200

        app.dependency_overrides.clear()
