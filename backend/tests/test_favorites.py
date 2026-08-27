"""Tests for favorites feature."""
import pytest
from sqlalchemy.orm import Session

from app.models.geography import City, Region
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.favorite_service import FavoriteService


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        tg_id=123456789,
        username="testuser",
        first_name="Test",
        last_name="User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_property(db_session: Session, test_user: User) -> Property:
    """Create a test property."""
    # Create required related objects
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
        name="Sale",
        name_en="Sale",
        name_plural="Sales",
        sort_order=1,
        is_active=True,
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
        floor=3,
        total_floors=5,
        build_year=2020,
        status=PropertyStatus.PUBLISHED,
        favorites_count=0,
    )
    db_session.add(property_obj)
    db_session.commit()
    db_session.refresh(property_obj)

    # Add price
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


class TestFavoriteService:
    """Tests for FavoriteService."""

    def test_add_favorite(self, db_session: Session, test_user: User, test_property: Property):
        """Test adding a property to favorites."""
        favorite = FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        assert favorite is not None
        assert favorite.user_id == test_user.id
        assert favorite.property_id == test_property.id

        # Verify favorites_count was incremented
        db_session.refresh(test_property)
        assert test_property.favorites_count == 1

    def test_add_favorite_duplicate_returns_existing(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test adding duplicate favorite returns existing."""
        fav1 = FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        fav2 = FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        assert fav1.id == fav2.id
        # Count should not double increment
        db_session.refresh(test_property)
        assert test_property.favorites_count == 1

    def test_add_favorite_nonexistent_property(self, db_session: Session, test_user: User):
        """Test adding favorite for nonexistent property returns None."""
        favorite = FavoriteService.add_favorite(db_session, test_user.id, 999999)
        assert favorite is None

    def test_remove_favorite(self, db_session: Session, test_user: User, test_property: Property):
        """Test removing a property from favorites."""
        # First add
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        db_session.refresh(test_property)
        assert test_property.favorites_count == 1

        # Then remove
        success = FavoriteService.remove_favorite(db_session, test_user.id, test_property.id)
        assert success is True
        db_session.refresh(test_property)
        assert test_property.favorites_count == 0

    def test_remove_favorite_not_exists(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test removing non-existent favorite returns False."""
        success = FavoriteService.remove_favorite(
            db_session, test_user.id, test_property.id
        )
        assert success is False

    def test_remove_favorite_does_not_go_negative(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test favorites_count doesn't go negative."""
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        FavoriteService.remove_favorite(db_session, test_user.id, test_property.id)
        # Try to remove again
        FavoriteService.remove_favorite(db_session, test_user.id, test_property.id)
        db_session.refresh(test_property)
        assert test_property.favorites_count == 0

    def test_get_user_favorites(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test getting user's favorite properties."""
        # Add multiple properties
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)

        # Create another property
        prop_type = db_session.query(PropertyType).first()
        op_type = db_session.query(OperationType).first()
        city = db_session.query(City).first()

        property2 = Property(
            owner_id=test_user.id,
            type_id=prop_type.id,
            operation_id=op_type.id,
            city_id=city.id,
            address="Test Address 456",
            total_area=60.0,
            rooms_count=3,
            status=PropertyStatus.PUBLISHED,
            favorites_count=0,
        )
        db_session.add(property2)
        db_session.commit()
        db_session.refresh(property2)

        price2 = PropertyPrice(
            property_id=property2.id,
            price_byn=150000,
            price_usd=45000,
            price_per_m2_byn=2500,
            is_current=True,
        )
        db_session.add(price2)
        db_session.commit()

        FavoriteService.add_favorite(db_session, test_user.id, property2.id)

        favorites, total = FavoriteService.get_user_favorites(db_session, test_user.id)
        assert total == 2
        assert len(favorites) == 2

    def test_get_user_favorites_pagination(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test pagination of user favorites."""
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)

        # Create more properties
        prop_type = db_session.query(PropertyType).first()
        op_type = db_session.query(OperationType).first()
        city = db_session.query(City).first()

        for i in range(3):
            prop = Property(
                owner_id=test_user.id,
                type_id=prop_type.id,
                operation_id=op_type.id,
                city_id=city.id,
                address=f"Test Address {i}",
                total_area=50.0 + i * 10,
                rooms_count=2,
                status=PropertyStatus.PUBLISHED,
                favorites_count=0,
            )
            db_session.add(prop)
            db_session.commit()
            db_session.refresh(prop)

            price = PropertyPrice(
                property_id=prop.id,
                price_byn=100000 + i * 10000,
                price_usd=30000 + i * 5000,
                price_per_m2_byn=2000 + i * 100,
                is_current=True,
            )
            db_session.add(price)
            db_session.commit()

            FavoriteService.add_favorite(db_session, test_user.id, prop.id)

        # Test first page
        favorites, total = FavoriteService.get_user_favorites(
            db_session, test_user.id, page=1, page_size=2
        )
        assert total == 4
        assert len(favorites) == 2

        # Test second page
        favorites, total = FavoriteService.get_user_favorites(
            db_session, test_user.id, page=2, page_size=2
        )
        assert total == 4
        assert len(favorites) == 2

    def test_is_favorite(self, db_session: Session, test_user: User, test_property: Property):
        """Test checking if property is in favorites."""
        assert FavoriteService.is_favorite(db_session, test_user.id, test_property.id) is False
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        assert FavoriteService.is_favorite(db_session, test_user.id, test_property.id) is True

    def test_get_favorite_ids(self, db_session: Session, test_user: User, test_property: Property):
        """Test getting all favorite IDs."""
        assert FavoriteService.get_favorite_ids(db_session, test_user.id) == []
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        ids = FavoriteService.get_favorite_ids(db_session, test_user.id)
        assert test_property.id in ids

    def test_atomic_counter_increment(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test that favorites_count is atomically incremented."""
        # Add multiple favorites from different users
        user2 = User(tg_id=987654321, username="user2", first_name="User2")
        db_session.add(user2)
        db_session.commit()

        # Add from user1
        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        db_session.refresh(test_property)
        count_after_user1 = test_property.favorites_count

        # Add from user2
        FavoriteService.add_favorite(db_session, user2.id, test_property.id)
        db_session.refresh(test_property)
        count_after_user2 = test_property.favorites_count

        assert count_after_user1 == 1
        assert count_after_user2 == 2

    def test_atomic_counter_decrement(
        self, db_session: Session, test_user: User, test_property: Property
    ):
        """Test that favorites_count is atomically decremented."""
        user2 = User(tg_id=987654321, username="user2", first_name="User2")
        db_session.add(user2)
        db_session.commit()

        FavoriteService.add_favorite(db_session, test_user.id, test_property.id)
        FavoriteService.add_favorite(db_session, user2.id, test_property.id)
        db_session.refresh(test_property)
        assert test_property.favorites_count == 2

        # Remove from user1
        FavoriteService.remove_favorite(db_session, test_user.id, test_property.id)
        db_session.refresh(test_property)
        assert test_property.favorites_count == 1

        # Remove from user2
        FavoriteService.remove_favorite(db_session, user2.id, test_property.id)
        db_session.refresh(test_property)
        assert test_property.favorites_count == 0


class TestFavoritesAPI:
    """Tests for favorites API endpoints."""

    def test_add_favorite_endpoint(self, client, test_user: User, test_property: Property):
        """Test POST /favorites/{property_id} endpoint."""
        # Mock authentication
        from app.api.dependencies import get_current_user
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: test_user

        response = client.post(f"/api/v1/favorites/{test_property.id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Added to favorites"

        app.dependency_overrides.clear()

    def test_add_favorite_unauthorized(self, client, test_property: Property):
        """Test adding favorite without authentication returns 401."""
        response = client.post(f"/api/v1/favorites/{test_property.id}")
        assert response.status_code == 401

    def test_remove_favorite_endpoint(self, client, test_user: User, test_property: Property):
        """Test DELETE /favorites/{property_id} endpoint."""
        from app.api.dependencies import get_current_user
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: test_user

        # First add
        client.post(f"/api/v1/favorites/{test_property.id}")

        # Then remove
        response = client.delete(f"/api/v1/favorites/{test_property.id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Removed from favorites"

        app.dependency_overrides.clear()

    def test_list_favorites_endpoint(self, client, test_user: User, test_property: Property):
        """Test GET /favorites endpoint."""
        from app.api.dependencies import get_current_user
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: test_user

        # Add favorite first
        client.post(f"/api/v1/favorites/{test_property.id}")

        response = client.get("/api/v1/favorites")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == test_property.id

        app.dependency_overrides.clear()

    def test_check_favorite_endpoint(self, client, test_user: User, test_property: Property):
        """Test GET /favorites/check/{property_id} endpoint."""
        from app.api.dependencies import get_current_user
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: test_user

        # Check before adding
        response = client.get(f"/api/v1/favorites/check/{test_property.id}")
        assert response.status_code == 200
        assert response.json()["is_favorite"] is False

        # Add favorite
        client.post(f"/api/v1/favorites/{test_property.id}")

        # Check after adding
        response = client.get(f"/api/v1/favorites/check/{test_property.id}")
        assert response.status_code == 200
        assert response.json()["is_favorite"] is True

        app.dependency_overrides.clear()

    def test_get_favorite_ids_endpoint(self, client, test_user: User, test_property: Property):
        """Test GET /favorites/ids endpoint."""
        from app.api.dependencies import get_current_user
        from app.main import app

        app.dependency_overrides[get_current_user] = lambda: test_user

        # Add favorite
        client.post(f"/api/v1/favorites/{test_property.id}")

        response = client.get("/api/v1/favorites/ids")
        assert response.status_code == 200
        data = response.json()
        assert "favorite_ids" in data
        assert test_property.id in data["favorite_ids"]

        app.dependency_overrides.clear()