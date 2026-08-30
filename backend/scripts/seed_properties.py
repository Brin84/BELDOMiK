#!/usr/bin/env python3
"""Seed production DB with test property listings (Krisha-style variety).

Creates a few test owner users and a set of PUBLISHED properties across
property/operation types, cities, districts, metro stations with varied
price / area / rooms / floor / build_year / created_at so the list filters
and sorting can be verified live on the production endpoint.

Idempotent: if test users already exist, it refreshes their listings instead
of duplicating them. Safe to re-run.
"""
import sys
from datetime import UTC, datetime, timedelta

from app.db.session import SessionLocal
from app.models.geography import City, District, MetroStation, Neighborhood
from app.models.property import (
    Property,
    PropertyPhoto,
    PropertyPrice,
    PropertyStatus,
    RenovationType,
)
from app.models.property_types import OperationType, PropertyType
from app.models.user import User

# Marker so we can identify/cleanup test data later.
TEST_MARKER = "BELDOMiK test"

OWNERS = [
    dict(tg_id=99000001, username="test_owner_a", first_name="Анна", last_name="Тестова"),
    dict(tg_id=99000002, username="test_owner_b", first_name="Иван", last_name="Тестов"),
    dict(tg_id=99000003, username="test_owner_c", first_name="Мария", last_name="Продавец"),
]


# (type_name, operation_name, city_name, district_name, metro_name,
#  price_byn, total_area, living_area, kitchen_area, rooms, floor, total_floors,
#  build_year, renovation, furniture, balcony, parking, elevator,
#  metro_distance, description, days_ago)
PROPERTIES = [
    # --- Квартиры, продажа, Минск ---
    ("Квартира", "Продажа", "Минск", "Центральный", "Немига", 265000, 62.0, 48.0, 11.0,
     2, 7, 16, 2019, "designer", True, True, True, True, 300,
     "2-комн. квартира в самом центре, дизайнерский ремонт, вид на Немигу", 1),
    ("Квартира", "Продажа", "Минск", "Первомайский", "Борисовский тракт", 118000, 40.5, 30.0, 9.0,
     1, 4, 12, 2015, "cosmetic", True, True, False, True, 500,
     "1-комн. квартира, ухоженный косметический ремонт", 3),
    ("Квартира", "Продажа", "Минск", "Фрунзенский", "Пушкинская", 159000, 55.0, 41.0, 10.0,
     2, 9, 14, 2017, "euro", True, True, True, True, 400,
     "2-комн. евроремонт, рядом парк и метро", 2),
    ("Квартира", "Продажа", "Минск", "Заводской", "Автозаводская", 89000, 33.0, 24.0, 8.0,
     1, 2, 9, 2008, "needs_renovation", False, False, False, False, 700,
     "1-комн. квартира, требуется косметика, отличная цена", 5),
    ("Квартира", "Продажа", "Минск", "Советский", "Площадь Якуба Коласа", 342000, 78.0, 56.0, 13.0,
     3, 11, 18, 2021, "designer", True, True, True, True, 250,
     "3-комн. просторная квартира в новом доме", 0),
    ("Квартира", "Аренда", "Минск", "Московский", "Институт культуры", 1500, 44.0, 33.0, 9.0,
     1, 5, 12, 2016, "euro", True, True, False, True, 600,
     "Сдам 1-комн. квартиру, мебель и техника", 8),
    ("Квартира", "Аренда", "Минск", "Октябрьский", "Октябрьская", 2100, 58.0, 42.0, 11.0,
     2, 8, 16, 2020, "designer", True, True, True, False, 350,
     "Сдам 2-комн. в новостройке у торгового центра", 4),
    # --- Дома ---
    ("Дом", "Продажа", "Минск", "Центральный", None, 520000, 210.0, 145.0, 25.0,
     0, 2, 2, 2015, "euro", True, True, True, False, None,
     "Кирпичный дом с участком, гараж, сад", 6),
    ("Дом", "Продажа", "Борисов", None, None, 145000, 130.0, 85.0, 18.0,
     0, 1, 2, 2011, "cosmetic", True, True, True, False, None,
     "Дачный дом в Борисове, участок 8 соток", 9),
    ("Дом", "Продажа", "Брест", None, None, 310000, 165.0, 110.0, 20.0,
     0, 2, 2, 2018, "euro", True, True, True, False, None,
     "Коттедж в черте Бреста", 12),
    # --- Земельные участки ---
    ("Земельный участок", "Продажа", "Молодечно", None, None, 18000, 800.0, None, None,
     0, None, None, None, None, False, False, False, False, None,
     "Участок 8 соток под ИЖС, Молодечно", 15),
    ("Земельный участок", "Продажа", "Витебск", None, None, 24000, 1200.0, None, None,
     0, None, None, None, None, False, False, False, False, None,
     "Участок 12 соток, Витебск, возможна аренда", 20),
    # --- Коммерческая ---
    ("Коммерческая недвижимость", "Аренда", "Минск", "Фрунзенский", "Молодежная", 3500, 90.0, None, None,
     0, 1, 2, None, None, False, False, False, True, 800,
     "Помещение под магазин/офис, не первый этаж", 30),
]


def _renovation(name):
    return RenovationType(name) if name else None


def seed(db):
    # Resolve lookup maps
    cities = {c.name: c for c in db.query(City).all()}
    districts = {(d.city_id, d.name): d for d in db.query(District).all()}
    stations = {s.name: s for s in db.query(MetroStation).all()}
    types = {t.name: t for t in db.query(PropertyType).all()}
    ops = {o.name: o for o in db.query(OperationType).all()}

    if not (cities and types and ops):
        raise RuntimeError("Geography/types not seeded — run seed_data.py first")

    # Upsert owners
    owner_ids = []
    for info in OWNERS:
        owner = db.query(User).filter(User.username == info["username"]).first()
        if not owner:
            owner = User(
                tg_id=info["tg_id"],
                username=info["username"],
                first_name=info["first_name"],
                last_name=info["last_name"],
                role="owner",
                is_active=True,
            )
            db.add(owner)
            db.flush()
        owner_ids.append(owner.id)
    db.commit()

    # Remove old test properties (from a previous run) to keep re-runs clean
    old_ids = [
        pid for (pid,) in
        db.query(Property.id).filter(Property.description.like(f"%{TEST_MARKER}%")).all()
    ]
    if old_ids:
        db.query(PropertyPhoto).filter(PropertyPhoto.property_id.in_(old_ids)).delete(
            synchronize_session=False
        )
        db.query(PropertyPrice).filter(PropertyPrice.property_id.in_(old_ids)).delete(
            synchronize_session=False
        )
        db.query(Property).filter(Property.id.in_(old_ids)).delete(synchronize_session=False)
        db.commit()

    # Insert properties
    counter = 0
    for row in PROPERTIES:
        (type_name, op_name, city_name, distr_name, metro_name,
         price_byn, total_area, living_area, kitchen_area, rooms,
         floor, total_floors, build_year, ren_name, furniture,
         balcony, parking, elevator, metro_distance, desc, days_ago) = row

        city = cities.get(city_name)
        if not city:
            print(f"  ! skip unknown city {city_name}")
            continue
        city_id = city.id
        district = districts.get((city_id, distr_name)) if distr_name else None
        station = stations.get(metro_name) if metro_name else None

        owner_id = owner_ids[counter % len(owner_ids)]
        counter += 1

        prop = Property(
            owner_id=owner_id,
            type_id=types[type_name].id,
            operation_id=ops[op_name].id,
            city_id=city_id,
            district_id=district.id if district else None,
            metro_station_id=station.id if station else None,
            metro_distance=metro_distance,
            address=f"{TEST_MARKER}: {type_name} в {city_name} ({counter})",
            lat=53.9045 + (counter * 0.05) % 0.4,
            lng=27.5615 + (counter * 0.04) % 0.5,
            floor=floor,
            total_floors=total_floors,
            build_year=build_year,
            total_area=total_area,
            living_area=living_area,
            kitchen_area=kitchen_area,
            rooms_count=rooms,
            renovation=_renovation(ren_name),
            furniture=furniture,
            balcony=balcony,
            parking=parking,
            elevator=elevator,
            description=f"{desc}. {TEST_MARKER}",
            status=PropertyStatus.PUBLISHED,
            views_count=(counter * 37) % 900,
            favorites_count=counter % 5,
            created_at=datetime.now(UTC) - timedelta(days=days_ago),
            published_at=datetime.now(UTC) - timedelta(days=days_ago),
        )
        db.add(prop)
        db.flush()

        # Photo so with_photos_only works
        db.add(PropertyPhoto(
            property_id=prop.id,
            url=(
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
                f"?w=1200&q=80&sig={counter}"
            ),
            thumbnail_url=(
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c"
                f"?w=400&q=60&sig={counter}"
            ),
            sort_order=0,
            width=1200,
            height=800,
            mime_type="image/jpeg",
        ))

        # Price (per-m2 derived; USD via fixed ~3.2 test rate)
        rate = 3.2
        per_m2 = int(price_byn / total_area) if total_area else None
        db.add(PropertyPrice(
            property_id=prop.id,
            price_byn=price_byn,
            price_usd=round(price_byn / rate),
            price_per_m2_byn=per_m2,
            price_per_m2_usd=round(per_m2 / rate) if per_m2 else None,
            exchange_rate=rate,
            is_current=True,
            change_reason="seed_test",
        ))
        db.flush()

    db.commit()
    print(f"Seeded/refreshed {len(PROPERTIES)} test properties.")


db = SessionLocal()
try:
    seed(db)
finally:
    db.close()
