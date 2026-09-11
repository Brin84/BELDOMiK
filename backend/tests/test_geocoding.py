"""Tests for the best-effort geocoding service (OSM Nominatim).

Geocoding goes to the network (1 req/s, no API key), so the whole suite keeps
it disabled via ``GEOCODING_ENABLED=false`` in conftest plus an autouse stub on
``GeocodingService.maybe_geocode``. Here the real logic is exercised with
``httpx.MockTransport`` (no real network), and the real ``maybe_geocode`` is
restored for the orchestration tests.
"""

import httpx
import pytest

from app.core.config import settings
from app.models.geography import City
from app.models.property import Property
from app.models.property_types import OperationType, PropertyType
from app.services.geocoding_service import GeocodingService

# Autouse-фикстура в conftest подменяет maybe_geocode на no-op для каждого теста.
# Захватываем настоящий classmethod на этапе импорта (до запуска фикстур),
# чтобы тесты оркестрации могли вернуть его через собственный monkeypatch.
_REAL_MAYBE_GEOCODE = GeocodingService.__dict__["maybe_geocode"]


@pytest.fixture(autouse=True)
def _no_ratelimit(monkeypatch):
    """Троттлинг Nominatim (1.2 s) для юнит-тестов не нужен — убираем sleep."""
    monkeypatch.setattr(GeocodingService, "_wait_ratelimit", lambda: None)


@pytest.fixture
def real_geocoder(monkeypatch):
    """Для одного теста: включить геокодинг и вернуть настоящий maybe_geocode."""
    monkeypatch.setattr(settings, "GEOCODING_ENABLED", True)
    monkeypatch.setattr(GeocodingService, "maybe_geocode", _REAL_MAYBE_GEOCODE)


@pytest.fixture
def geo(db_session, seed_test_data):
    """Строитель транзиентного Property для тестов геокодера (в БД не пишем)."""

    def build(*, address="ул. Немига 5", lat=None, lng=None):
        minsk = db_session.query(City).filter(City.name == "Минск").first()
        prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
        op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()
        return Property(
            owner_id=1,  # FK в SQLite не проверяется (прагма foreign_keys выключена)
            type_id=prop_type.id,
            operation_id=op_type.id,
            city_id=minsk.id,
            address=address,
            lat=lat,
            lng=lng,
        )

    return build


def _transport(responses, requests=None):
    """MockTransport, который записывает каждый запрос и отдаёт ``responses``."""
    captured = requests if requests is not None else []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json=responses)

    return httpx.MockTransport(handler)


def _ok_payload():
    """Типовой ответ Nominatim /search (limit=1)."""
    return [
        {
            "place_id": 123,
            "lat": "53.89855",
            "lon": "27.56058",
            "display_name": "улица Немига, Минск, Минск, 220004, Беларусь",
        }
    ]


class TestBuildQuery:
    """Сборка адресного запроса для Nominatim."""

    def test_includes_street_city_region(self, db_session, geo):
        prop = geo(address="ул. Немига 5")

        query = GeocodingService.build_query(prop, db_session)

        assert query == {
            "street": "ул. Немига 5",
            "city": "Минск",  # резолвится через БД, а не через свободный текст
            "state": "Минск",
        }

    def test_blank_address_returns_none(self, db_session, geo):
        prop = geo(address="   ")

        assert GeocodingService.build_query(prop, db_session) is None


class TestGeocodeAddress:
    """Вызов Nominatim и разбор ответа (через MockTransport, без сети)."""

    def test_success_parses_lat_lon(self):
        with httpx.Client(transport=_transport(_ok_payload())) as client:
            coords = GeocodingService.geocode_address(
                {"street": "ул. Немига 5", "city": "Минск"}, client=client
            )

        assert coords == (53.89855, 27.56058)

    def test_sends_policy_params(self):
        requests = []
        with httpx.Client(transport=_transport(_ok_payload(), requests)) as client:
            GeocodingService.geocode_address({"street": "ул. Немига 5"}, client=client)

        params = requests[0].url.params
        assert params["format"] == "jsonv2"
        assert params["limit"] == "1"
        assert params["accept-language"] == "ru"
        assert params["countrycodes"] == "by"

    @pytest.mark.parametrize("status", [403, 429, 500, 503])
    def test_http_error_returns_none(self, status):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(status, json=[])

        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            coords = GeocodingService.geocode_address({"street": "нет такой"}, client=client)

        assert coords is None

    def test_empty_results_returns_none(self):
        with httpx.Client(transport=_transport([])) as client:
            coords = GeocodingService.geocode_address({"street": "нет адреса"}, client=client)

        assert coords is None


class TestMaybeGeocode:
    """Оркестрация: краткие замыкания и запись координат в объявление."""

    def test_geocoding_disabled_in_suite(self):
        # По умолчанию во всём прогоне GEOCODING_ENABLED=false (env в conftest),
        # поэтому сетевых вызовов в остальных тестах создать/подать не будет.
        assert settings.GEOCODING_ENABLED is False

    def test_existing_coords_skip_network(self, db_session, geo, real_geocoder, monkeypatch):
        prop = geo(lat=53.9, lng=27.56)
        calls = []

        def stub_geocode(query, client=None):
            calls.append(query)  # сюда попадать не должны
            return (53.9, 27.56)

        monkeypatch.setattr(GeocodingService, "geocode_address", stub_geocode)

        assert GeocodingService.maybe_geocode(db_session, prop) is True
        assert calls == []

    def test_no_address_skip_network(self, db_session, geo, real_geocoder, monkeypatch):
        prop = geo(address="  ")

        monkeypatch.setattr(
            GeocodingService, "geocode_address", lambda *_a: (53.9, 27.56)
        )

        assert GeocodingService.maybe_geocode(db_session, prop) is False
        assert prop.lat is None and prop.lng is None

    def test_geocodes_and_writes_coords(self, db_session, geo, real_geocoder, monkeypatch):
        prop = geo()

        monkeypatch.setattr(
            GeocodingService, "geocode_address", lambda *_a: (53.8985, 27.5606)
        )

        assert GeocodingService.maybe_geocode(db_session, prop) is True
        assert prop.lat == 53.8985
        assert prop.lng == 27.5606

    def test_geocode_failure_leaves_coords(self, db_session, geo, real_geocoder, monkeypatch):
        prop = geo()

        monkeypatch.setattr(
            GeocodingService, "geocode_address", lambda *_a: None
        )

        assert GeocodingService.maybe_geocode(db_session, prop) is False
        assert prop.lat is None and prop.lng is None