"""Fix Minsk metro: real line composition + Zelenoluzhskaya line

Revision ID: 5e8a2c7d4f1b
Revises: 3a9c4d7f2e8b
Create Date: 2026-09-12 00:00:00.000000

Seed scripts previously wrote a distorted/duplicated station list:
"Mashproekt", station names glued to wrong lines (Uruche vs Avtozavodskaya),
and "Kupalovskaya" twice on line 1. This migration brings the reference
data up to the real Minsk metro (as of 2026):

- Moskovskaya line  (red)   15 stations;
- Avtozavodskaya line (blue) 14 stations;
- Zelenoluzhskaya line (green) — open branch 4 stations (Vokzalnaya ...
  Kovalskaya Sloboda; transfer to line 1 via Ploshchad Lenina is pedestrian).

Duplicates are merged (references to the survivor), phantom stations and
names on wrong lines are unlinked from properties (metro_station_id = NULL)
and removed.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.engine import Connection

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5e8a2c7d4f1b'
down_revision: str | Sequence[str] | None = '3a9c4d7f2e8b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Canonical lines: (name, color, stations in travel order).
METRO: list[tuple[str, str, list[str]]] = [
    (
        "Московская линия",
        "#FF0000",
        [
            "Малиновка", "Петровщина", "Михалово", "Грушевка",
            "Институт культуры", "Площадь Ленина", "Октябрьская",
            "Площадь Победы", "Площадь Якуба Коласа", "Академия наук",
            "Парк Челюскинцев", "Московская", "Восток",
            "Борисовский тракт", "Уручье",
        ],
    ),
    (
        "Автозаводская линия",
        "#0000FF",
        [
            "Каменная Горка", "Кунцевщина", "Спортивная",
            "Пушкинская", "Молодёжная", "Фрунзенская", "Немига",
            "Купаловская", "Первомайская", "Пролетарская",
            "Тракторный завод", "Партизанская", "Автозаводская",
            "Могилёвская",
        ],
    ),
    (
        "Зеленолужская линия",
        "#00A651",
        [
            "Вокзальная", "Площадь Франтишка Богушевича",
            "Юбилейная площадь", "Ковальская Слобода",
        ],
    ),
]


def _ensure_line(conn: Connection, city_id: int, name: str, color: str) -> int:
    """Return line id for (city_id, name), creating or updating the row."""
    row = conn.execute(
        sa.text("SELECT id FROM metro_lines WHERE city_id = :city_id AND name = :name"),
        {"city_id": city_id, "name": name},
    ).fetchone()
    if row:
        conn.execute(
            sa.text("UPDATE metro_lines SET color = :color WHERE id = :id"),
            {"color": color, "id": row[0]},
        )
        return row[0]
    conn.execute(
        sa.text(
            "INSERT INTO metro_lines (city_id, name, color) "
            "VALUES (:city_id, :name, :color)"
        ),
        {"city_id": city_id, "name": name, "color": color},
    )
    row = conn.execute(
        sa.text("SELECT id FROM metro_lines WHERE city_id = :city_id AND name = :name"),
        {"city_id": city_id, "name": name},
    ).fetchone()
    return row[0]


def _unlink_properties(conn: Connection, station_id: int) -> None:
    """Drop property references before deleting a station (FK safety)."""
    conn.execute(
        sa.text(
            "UPDATE properties SET metro_station_id = NULL "
            "WHERE metro_station_id = :id"
        ),
        {"id": station_id},
    )


def _reconcile_line(conn: Connection, line_id: int, stations: list[str]) -> None:
    """Match canonical stations to existing rows:
    - existing name -> keep min(id), fix sort_order, delete duplicate rows;
    - missing name -> insert.
    Non-canonical names on this line are left for _remove_leftovers.
    """
    rows = conn.execute(
        sa.text("SELECT id, name FROM metro_stations WHERE line_id = :line_id"),
        {"line_id": line_id},
    ).fetchall()
    by_name: dict[str, list[int]] = {}
    for sid, sname in rows:
        by_name.setdefault(sname, []).append(sid)

    for order, name in enumerate(stations, start=1):
        ids = by_name.pop(name, [])
        if ids:
            keep = min(ids)
            conn.execute(
                sa.text("UPDATE metro_stations SET sort_order = :order WHERE id = :id"),
                {"order": order, "id": keep},
            )
            for dup in ids:
                if dup == keep:
                    continue
                _unlink_properties(conn, dup)
                conn.execute(
                    sa.text("DELETE FROM metro_stations WHERE id = :id"), {"id": dup}
                )
        else:
            conn.execute(
                sa.text(
                    "INSERT INTO metro_stations (line_id, name, sort_order) "
                    "VALUES (:line_id, :name, :order)"
                ),
                {"line_id": line_id, "name": name, "order": order},
            )


def upgrade() -> None:
    """Rewire Minsk metro to the real line/station composition."""
    conn = op.get_bind()

    city = conn.execute(sa.text("SELECT id FROM cities WHERE name = 'Минск'")).fetchone()
    if city is None:
        return
    city_id = city[0]

    canonical: set[tuple[int, str]] = set()
    for name, color, stations in METRO:
        line_id = _ensure_line(conn, city_id, name, color)
        _reconcile_line(conn, line_id, stations)
        canonical.update((line_id, s) for s in stations)

    # Remove any remaining station of the city that is not in canonical data
    # (phantom names, same names on wrong lines, old spelling w/o ё).
    leftovers = conn.execute(
        sa.text(
            """
            SELECT ms.id, ms.line_id, ms.name
            FROM metro_stations AS ms
            JOIN metro_lines AS ml ON ml.id = ms.line_id
            WHERE ml.city_id = :city_id
            """
        ),
        {"city_id": city_id},
    ).fetchall()
    for sid, line_id, sname in leftovers:
        if (line_id, sname) in canonical:
            continue
        _unlink_properties(conn, sid)
        conn.execute(
            sa.text("DELETE FROM metro_stations WHERE id = :id"), {"id": sid}
        )


def downgrade() -> None:
    """Data migration: intentionally not reversed (old data was garbage)."""
    pass