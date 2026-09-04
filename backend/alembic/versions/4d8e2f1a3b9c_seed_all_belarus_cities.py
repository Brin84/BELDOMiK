"""Seed all Belarusian cities & towns; make City.region_id nullable

Revision ID: 4d8e2f1a3b9c
Revises: a9f3c21d87b4
Create Date: 2026-09-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d8e2f1a3b9c'
down_revision: Union[str, Sequence[str], None] = 'a9f3c21d87b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (region_name_in_db, [(city_name, is_major), ...])
# is_major — крупные города (>50k жителей), показываются первыми в сортировке.
CITIES: list[tuple[str, list[tuple[str, bool]]]] = [
    ("Минск", [
        ("Минск", True),
    ]),
    ("Минская область", [
        # Города
        ("Березино", False), ("Борисов", True), ("Вилейка", False),
        ("Воложин", False), ("Дзержинск", False), ("Жодино", True),
        ("Заславль", False), ("Клецк", False), ("Копыль", False),
        ("Крупки", False), ("Логойск", False), ("Любань", False),
        ("Марьина Горка", False), ("Молодечно", True), ("Мядель", False),
        ("Несвиж", False), ("Слуцк", True), ("Смолевичи", False),
        ("Солигорск", True), ("Старые Дороги", False), ("Столбцы", False),
        ("Узда", False), ("Фаниполь", False), ("Червень", False),
        # Посёлки городского типа
        ("Бобр", False), ("Городея", False), ("Зелёный Бор", False),
        ("Ивенец", False), ("Кривичи", False), ("Мачулищи", False),
        ("Нарочь", False), ("Плещеницы", False), ("Правдинский", False),
        ("Радошковичи", False), ("Руденск", False), ("Смиловичи", False),
        ("Старобин", False), ("Уречье", False), ("Холопеничи", False),
    ]),
    ("Брестская область", [
        # Города
        ("Барановичи", True), ("Белоозёрск", False), ("Берёза", False),
        ("Брест", True), ("Высокое", False), ("Ганцевичи", False),
        ("Давид-Городок", False), ("Дрогичин", False), ("Жабинка", False),
        ("Иваново", False), ("Ивацевичи", False), ("Каменец", False),
        ("Кобрин", True), ("Коссово", False), ("Лунинец", False),
        ("Ляховичи", False), ("Малорита", False), ("Микашевичи", False),
        ("Пинск", True), ("Пружаны", False), ("Столин", False),
        # Посёлки городского типа
        ("Городище", False), ("Домачево", False), ("Логишин", False),
        ("Речица", False), ("Ружаны", False), ("Телеханы", False),
        ("Шерешево", False),
    ]),
    ("Витебская область", [
        # Города
        ("Барань", False), ("Браслав", False), ("Верхнедвинск", False),
        ("Витебск", True), ("Глубокое", False), ("Городок", False),
        ("Дисна", False), ("Докшицы", False), ("Дубровно", False),
        ("Лепель", False), ("Миоры", False), ("Новолукомль", False),
        ("Новополоцк", True), ("Орша", True), ("Полоцк", True),
        ("Поставы", False), ("Сенно", False), ("Толочин", False),
        ("Чашники", False),
        # Посёлки городского типа
        ("Бегомль", False), ("Богушевск", False), ("Ветрино", False),
        ("Езерище", False), ("Лиозно", False), ("Оболь", False),
        ("Освея", False), ("Подсвилье", False), ("Россоны", False),
        ("Сураж", False), ("Ушачи", False), ("Шумилино", False),
        ("Яновичи", False),
    ]),
    ("Гомельская область", [
        # Города
        ("Буда-Кошелёво", False), ("Василевичи", False), ("Ветка", False),
        ("Гомель", True), ("Добруш", False), ("Ельск", False),
        ("Житковичи", False), ("Жлобин", True), ("Калинковичи", False),
        ("Мозырь", True), ("Наровля", False), ("Петриков", False),
        ("Речица", True), ("Рогачёв", False), ("Светлогорск", True),
        ("Туров", False), ("Хойники", False), ("Чечерск", False),
        # Посёлки городского типа
        ("Брагин", False), ("Комарин", False), ("Корма", False),
        ("Лоев", False), ("Октябрьский", False), ("Паричи", False),
        ("Стрешин", False), ("Тереховка", False), ("Уваровичи", False),
    ]),
    ("Гродненская область", [
        # Города
        ("Берёзовка", False), ("Волковыск", False), ("Гродно", True),
        ("Дятлово", False), ("Ивье", False), ("Лида", True),
        ("Мосты", False), ("Новогрудок", False), ("Островец", False),
        ("Ошмяны", False), ("Свислочь", False), ("Скидель", False),
        ("Слоним", False), ("Сморгонь", False), ("Щучин", False),
        # Посёлки городского типа
        ("Вороново", False), ("Желудок", False), ("Зельва", False),
        ("Кореличи", False), ("Красносельский", False), ("Любча", False),
        ("Мир", False), ("Новоельня", False), ("Поречье", False),
        ("Радунь", False), ("Россь", False), ("Юратишки", False),
    ]),
    ("Могилевская область", [
        # Города
        ("Белыничи", False), ("Бобруйск", True), ("Быхов", False),
        ("Горки", False), ("Кировск", False), ("Климовичи", False),
        ("Кличев", False), ("Костюковичи", False), ("Кричев", False),
        ("Круглое", False), ("Могилёв", True), ("Мстиславль", False),
        ("Осиповичи", False), ("Славгород", False), ("Чаусы", False),
        ("Чериков", False), ("Шклов", False),
        # Посёлки городского типа
        ("Глуск", False), ("Дрибин", False), ("Краснополье", False),
        ("Свислочь", False), ("Хотимск", False),
    ]),
]


def _region_id(conn, region_name: str) -> int | None:
    """Resolve region id by exact DB name."""
    row = conn.execute(
        sa.text("SELECT id FROM regions WHERE name = :name"),
        {"name": region_name},
    ).fetchone()
    return row[0] if row else None


def _seed_city(conn, region_name: str, name: str, is_major: bool) -> None:
    """Insert a city/town if a same-named one in the same region does not exist."""
    rid = _region_id(conn, region_name)
    if rid is None:
        # Unknown/unseeded region — skip silently. Data drift is safer than a crash.
        return
    existing = conn.execute(
        sa.text("SELECT 1 FROM cities WHERE lower(name) = lower(:name) AND region_id = :rid"),
        {"name": name, "rid": rid},
    ).fetchone()
    if existing:
        return
    conn.execute(
        sa.text("""
            INSERT INTO cities (region_id, name, is_major, sort_order)
            VALUES (:rid, :name, :major, 0)
        """),
        {"rid": rid, "name": name, "major": is_major},
    )


def upgrade() -> None:
    """Seed full city/town list; allow user-created settlements without a region."""
    conn = op.get_bind()

    # 1. Allow user-created settlements (villages) without a region.
    op.alter_column('cities', 'region_id', existing_type=sa.Integer(), nullable=True)

    # 2. Fix obvious typos in manually entered seed data.
    conn.execute(sa.text("UPDATE cities SET name = 'Жодино' WHERE name = 'Зодино'"))
    conn.execute(sa.text("UPDATE cities SET name = 'Могилёв' WHERE name = 'Могилев'"))

    # 3. Seed all cities and towns.
    for region_name, cities in CITIES:
        for name, is_major in cities:
            _seed_city(conn, region_name, name, is_major)


def downgrade() -> None:
    """Drop user-added settlements and leave reg-required constraint back.

    Downgrade intentionally does not delete seeded cities (idempotent re-upgrade),
    but restores the NOT NULL constraint (existing rows keep their region).
    """
    conn = op.get_bind()
    # Remove settlements that users added manually (no region).
    conn.execute(sa.text("DELETE FROM cities WHERE region_id IS NULL"))
    op.alter_column('cities', 'region_id', existing_type=sa.Integer(), nullable=False)