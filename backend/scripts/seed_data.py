#!/usr/bin/env python3
"""Seed database with Belarus geography, property types, and operations."""
import sys

from app.db.session import SessionLocal
from app.models.geography import (
    City,
    District,
    MetroLine,
    MetroStation,
    Region,
)
from app.models.property_types import OperationType, PropertyType

sys.path.insert(0, "/app")

db = SessionLocal()

try:
    # Check if already seeded
    if db.query(Region).count() > 0:
        print("Database already seeded, skipping...")
        sys.exit(0)

    print("Seeding Belarus regions...")
    regions = [
        Region(name="Минск", name_en="Minsk", sort_order=1),
        Region(name="Минская область", name_en="Minsk Region", sort_order=2),
        Region(name="Брестская область", name_en="Brest Region", sort_order=3),
        Region(name="Витебская область", name_en="Vitebsk Region", sort_order=4),
        Region(name="Гомельская область", name_en="Gomel Region", sort_order=5),
        Region(name="Гродненская область", name_en="Grodno Region", sort_order=6),
        Region(name="Могилевская область", name_en="Mogilev Region", sort_order=7),
    ]
    db.add_all(regions)
    db.commit()

    # Minsk city
    minsk_region = db.query(Region).filter(Region.name == "Минск").first()
    minsk = City(
        name="Минск",
        name_en="Minsk",
        region_id=minsk_region.id,
        is_major=True,
        sort_order=1,
    )
    db.add(minsk)
    db.commit()

    # Major cities per region
    cities_data = [
        (
            "Минская область",
            ["Борисов", "Солигорск", "Молодечно", "Зодино", "Слуцк", "Березино"],
        ),
        (
            "Брестская область",
            ["Брест", "Барановичи", "Пинск", "Кобрин", "Иваново", "Дрогичин"],
        ),
        (
            "Витебская область",
            ["Витебск", "Орша", "Новополоцк", "Полоцк", "Глубокое", "Поставы"],
        ),
        (
            "Гомельская область",
            ["Гомель", "Мозырь", "Жлобин", "Светлогорск", "Речица", "Калинковичи"],
        ),
        (
            "Гродненская область",
            ["Гродно", "Лида", "Слоним", "Волковыск", "Свислочь", "Щучин"],
        ),
        (
            "Могилевская область",
            ["Могилев", "Бобруйск", "Кричев", "Климов", "Хотимск", "Шклов"],
        ),
    ]

    for region_name, city_names in cities_data:
        region = db.query(Region).filter(Region.name == region_name).first()
        for i, city_name in enumerate(city_names):
            city = City(name=city_name, name_en=city_name, region_id=region.id, sort_order=i+2)
            db.add(city)
    db.commit()

    # Districts for Minsk
    minsk_city = db.query(City).filter(City.name == "Минск").first()
    districts = [
        District(name="Центральный", name_en="Central", city_id=minsk_city.id, sort_order=1),
        District(name="Советский", name_en="Soviet", city_id=minsk_city.id, sort_order=2),
        District(name="Первомайский", name_en="Pervomaysky", city_id=minsk_city.id, sort_order=3),
        District(name="Партизанский", name_en="Partizansky", city_id=minsk_city.id, sort_order=4),
        District(name="Заводской", name_en="Zavodskoy", city_id=minsk_city.id, sort_order=5),
        District(name="Ленинский", name_en="Leninsky", city_id=minsk_city.id, sort_order=6),
        District(name="Октябрьский", name_en="Oktyabrsky", city_id=minsk_city.id, sort_order=7),
        District(name="Московский", name_en="Moskovsky", city_id=minsk_city.id, sort_order=8),
        District(name="Фрунзенский", name_en="Frunzensky", city_id=minsk_city.id, sort_order=9),
    ]
    db.add_all(districts)
    db.commit()

    # Metro lines for Minsk
    print("Seeding metro lines...")
    metro_lines_data = [
        ("Московская линия", "#FF0000"),
        ("Автозаводская линия", "#0000FF"),
    ]

    for line_name, color in metro_lines_data:
        line = MetroLine(name=line_name, city_id=minsk_city.id, color=color)
        db.add(line)
    db.commit()

    # Get the lines
    line1 = db.query(MetroLine).filter(MetroLine.name == "Московская линия").first()
    line2 = db.query(MetroLine).filter(MetroLine.name == "Автозаводская линия").first()

    # Metro stations for line 1 (Moskovskaya)
    print("Seeding metro stations...")
    stations_line1 = [
        ("Уручье", 1), ("Борисовский тракт", 2), ("Кунцевщина", 3), ("Купаловская", 4),
        ("Петровщина", 5), ("Молодежная", 6), ("Фрунзенская", 7), ("Немига", 8),
        ("Купаловская", 9), ("Октябрьская", 10), ("Площадь Якуба Коласа", 11),
        ("Площадь Победы", 12), ("Институт культуры", 13), ("Автозаводская", 14),
        ("Машпроект", 15), ("Спортивная", 16), ("Проспект независимости", 17),
        ("Якуба Коласа", 18), ("Площадь Ленина", 19), ("Московская", 20),
    ]

    for station_name, sort_order in stations_line1:
        station = MetroStation(name=station_name, line_id=line1.id, sort_order=sort_order)
        db.add(station)

    # Metro stations for line 2 (Avtozavodskaya)
    stations_line2 = [
        ("Пушкинская", 1), ("Молодежная", 2), ("Фрунзенская", 3), ("Немига", 4),
        ("Купаловская", 5), ("Октябрьская", 6), ("Площадь Якуба Коласа", 7),
        ("Площадь Победы", 8), ("Институт культуры", 9), ("Автозаводская", 10),
        ("Машпроект", 11), ("Уручье", 12), ("Борисовский тракт", 13),
    ]

    for station_name, sort_order in stations_line2:
        station = MetroStation(name=station_name, line_id=line2.id, sort_order=sort_order)
        db.add(station)
    db.commit()

    # Property types (with category)
    print("Seeding property types...")
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
        PropertyType(
            category="land",
            name="Земельный участок",
            name_en="Land",
            name_plural="Земельные участки",
            icon="land",
            sort_order=3,
            is_active=True,
        ),
        PropertyType(
            category="commercial",
            name="Коммерческая недвижимость",
            name_en="Commercial",
            name_plural="Коммерческая недвижимость",
            icon="commercial",
            sort_order=4,
            is_active=True,
        ),
        PropertyType(
            category="garage",
            name="Гараж/машиноместо",
            name_en="Garage",
            name_plural="Гаражи/машиноместа",
            icon="garage",
            sort_order=5,
            is_active=True,
        ),
        PropertyType(
            category="dacha",
            name="Дача",
            name_en="Dacha",
            name_plural="Дачи",
            icon="dacha",
            sort_order=6,
            is_active=True,
        ),
    ]
    db.add_all(property_types)
    db.commit()

    # Operation types
    print("Seeding operation types...")
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
        OperationType(
            name="Посуточная аренда",
            name_en="Daily rent",
            name_plural="Посуточная аренда",
            sort_order=3,
            is_active=True,
        ),
        OperationType(
            name="Обмен",
            name_en="Exchange",
            name_plural="Обмен",
            sort_order=4,
            is_active=True,
        ),
    ]
    db.add_all(operation_types)
    db.commit()

    print("Seeding completed successfully!")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
    raise
finally:
    db.close()