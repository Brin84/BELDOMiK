"""Test configuration and fixtures."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_db
from app.db.base import Base
from app.main import app

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before tests."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: TestingSessionLocal) -> TestClient:
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Seed test data
@pytest.fixture(scope="session")
def seed_test_data():
    """Seed test database with sample data."""
    from app.models.geography import (
        City,
        District,
        MetroLine,
        MetroStation,
        Region,
    )
    from app.models.property_types import OperationType, PropertyType

    session = TestingSessionLocal()

    # Regions
    regions = [
        Region(name="Минск", name_en="Minsk", sort_order=1),
        Region(name="Минская область", name_en="Minsk Region", sort_order=2),
    ]
    session.add_all(regions)
    session.commit()

    # Minsk city
    minsk_region = session.query(Region).filter(Region.name == "Минск").first()
    minsk = City(
        name="Минск", name_en="Minsk", region_id=minsk_region.id, is_major=True, sort_order=1
    )
    session.add(minsk)
    session.commit()

    # Districts for Minsk
    districts = [
        District(name="Центральный", name_en="Central", city_id=minsk.id, sort_order=1),
        District(name="Советский", name_en="Soviet", city_id=minsk.id, sort_order=2),
    ]
    session.add_all(districts)
    session.commit()

    # Metro lines
    metro_lines = [
        MetroLine(name="Московская линия", city_id=minsk.id, color="#FF0000"),
        MetroLine(name="Автозаводская линия", city_id=minsk.id, color="#0000FF"),
    ]
    session.add_all(metro_lines)
    session.commit()

    # Metro stations
    line1 = session.query(MetroLine).filter(MetroLine.name == "Московская линия").first()
    _ = session.query(MetroLine).filter(MetroLine.name == "Автозаводская линия").first()

    stations_line1 = [
        MetroStation(name="Уручье", line_id=line1.id, sort_order=1),
        MetroStation(name="Борисовский тракт", line_id=line1.id, sort_order=2),
    ]
    session.add_all(stations_line1)
    session.commit()

    # Property types
    property_types = [
        PropertyType(
            category="apartment",
            name="Квартира",
            name_en="Apartment",
            name_plural="Квартиры",
            icon="apartment",
            sort_order=1,
            is_active=True,
        ),
        PropertyType(
            category="house",
            name="Дом",
            name_en="House",
            name_plural="Дома",
            icon="house",
            sort_order=2,
            is_active=True,
        ),
    ]
    session.add_all(property_types)
    session.commit()

    # Operation types
    operation_types = [
        OperationType(
            name="Продажа",
            name_en="Sale",
            name_plural="Продажи",
            sort_order=1,
            is_active=True,
        ),
        OperationType(
            name="Аренда",
            name_en="Rent",
            name_plural="Аренда",
            sort_order=2,
            is_active=True,
        ),
    ]
    session.add_all(operation_types)
    session.commit()

    session.close()

    yield

    # Cleanup
    session = TestingSessionLocal()
    session.query(MetroStation).delete()
    session.query(MetroLine).delete()
    session.query(District).delete()
    session.query(City).delete()
    session.query(Region).delete()
    session.query(PropertyType).delete()
    session.query(OperationType).delete()
    session.commit()
    session.close()