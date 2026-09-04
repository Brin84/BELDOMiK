"""Migration test: seed all Belarus cities & make City.region_id nullable.

Reproduces the production DB state *before* the migration (7 regions + the 37
cities seeded by scripts/seed_data.py, including the 'Зодино'/'Могилев' typos),
then executes the migration's `upgrade()` against its own scratch SQLite DB and
verifies the seeded total, region-by-region counts, and the typo fixes.

SQLite cannot `ALTER COLUMN`, so the NOT NULL -> nullable change (real on
Postgres in production) is stubbed; the assertions here focus on the seeding
logic and the final shape of the data.
"""
import importlib.util
from pathlib import Path

from sqlalchemy import create_engine, text

from app.db.base import Base

MIGRATION_FILE = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "4d8e2f1a3b9c_seed_all_belarus_cities.py"
)

# Fresh per-region counts after the migration (seed list + pre-existing leftovers).
EXPECTED_CITY_COUNTS = {
    "Минск": 1,  # only Минск
    "Минская область": 39,  # 24 cities + 15 PGT
    "Брестская область": 28,  # 21 + 7
    "Витебская область": 32,  # 19 + 13
    "Гомельская область": 27,  # 18 + 9
    "Гродненская область": 27,  # 15 + 12
    "Могилевская область": 23,  # 17 + 5 seed, + pre-existing 'Климов'
}


def _load_migration():
    """Load the migration module by path (name starts with a digit)."""
    spec = importlib.util.spec_from_file_location("_seed_all_belarus_cities", MIGRATION_FILE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _OpStub:
    """Minimal substitute for alembic.op inside the migration.

    SQLite cannot ALTER COLUMN, so `alter_column` is a no-op here — the real
    NOT NULL -> nullable change is applied on Postgres in production.
    """

    def __init__(self, conn):
        self.conn = conn

    def get_bind(self):
        return self.conn

    def alter_column(self, *args, **kwargs):
        pass


def _seed_prod_state(engine) -> None:
    """Replicate the pre-migration production data (7 regions + 37 cities)."""
    region_names = [
        "Минск",
        "Минская область",
        "Брестская область",
        "Витебская область",
        "Гомельская область",
        "Гродненская область",
        "Могилевская область",
    ]
    cities_by_region = {
        "Минск": ["Минск"],
        "Минская область": ["Борисов", "Солигорск", "Молодечно", "Зодино", "Слуцк", "Березино"],
        "Брестская область": ["Брест", "Барановичи", "Пинск", "Кобрин", "Иваново", "Дрогичин"],
        "Витебская область": ["Витебск", "Орша", "Новополоцк", "Полоцк", "Глубокое", "Поставы"],
        "Гомельская область": ["Гомель", "Мозырь", "Жлобин", "Светлогорск", "Речица", "Калинковичи"],
        "Гродненская область": ["Гродно", "Лида", "Слоним", "Волковыск", "Свислочь", "Щучин"],
        "Могилевская область": ["Могилев", "Бобруйск", "Кричев", "Климов", "Хотимск", "Шклов"],
    }
    with engine.begin() as conn:
        for rid, name in enumerate(region_names, start=1):
            conn.execute(
                text("INSERT INTO regions (id, name, name_en, sort_order) VALUES (:id, :name, :name, 0)"),
                {"id": rid, "name": name},
            )
        for region_name, city_names in cities_by_region.items():
            rid = conn.execute(
                text("SELECT id FROM regions WHERE name = :name"), {"name": region_name}
            ).scalar_one()
            for i, city_name in enumerate(city_names):
                conn.execute(
                    text(
                        "INSERT INTO cities (region_id, name, is_major, sort_order) "
                        "VALUES (:rid, :name, 0, :sort)"
                    ),
                    {"rid": rid, "name": city_name, "sort": i + 1},
                )


def test_seed_migration_populates_all_cities(tmp_path):
    """Full Belarus city seed runs, typos are fixed, counts match."""
    mig = _load_migration()

    engine = create_engine(f"sqlite:///{tmp_path / 'seed.db'}")
    try:
        Base.metadata.create_all(engine)
        _seed_prod_state(engine)

        conn = engine.connect()
        try:
            mig.op = _OpStub(conn)
            mig.upgrade()
            conn.commit()
        finally:
            conn.close()

        with engine.connect() as conn:
            # Typo fixes applied.
            assert conn.execute(text("SELECT COUNT(*) FROM cities WHERE name = 'Зодино'")).scalar_one() == 0
            assert conn.execute(text("SELECT COUNT(*) FROM cities WHERE name = 'Жодино'")).scalar_one() == 1
            assert conn.execute(text("SELECT COUNT(*) FROM cities WHERE name = 'Могилев'")).scalar_one() == 0
            assert conn.execute(text("SELECT COUNT(*) FROM cities WHERE name = 'Могилёв'")).scalar_one() == 1

            # Pre-existing oddity that must survive (not part of the new list).
            assert conn.execute(text("SELECT COUNT(*) FROM cities WHERE name = 'Климов'")).scalar_one() == 1

            # Region-by-region final counts.
            rows = conn.execute(
                text(
                    "SELECT r.name, COUNT(c.id) FROM regions r "
                    "LEFT JOIN cities c ON c.region_id = r.id GROUP BY r.id"
                )
            ).all()
            actual = {name: count for name, count in rows}
            assert actual == EXPECTED_CITY_COUNTS

        # The whole point of the feature: a user-added settlement without a
        # region can be stored after the migration.
        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO cities (region_id, name, is_major, sort_order) "
                    "VALUES (NULL, 'Залесье', 0, 1000)"
                )
            )
            count = conn.execute(
                text("SELECT COUNT(*) FROM cities WHERE name = 'Залесье' AND region_id IS NULL")
            ).scalar_one()
            assert count == 1
    finally:
        engine.dispose()