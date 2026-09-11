"""Payments property_id FK — ON DELETE CASCADE (admin hard-delete)

Revision ID: 34f6a5d9b0c1
Revises: b7e4f19a2c60
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34f6a5d9b0c1'
down_revision: Union[str, Sequence[str], None] = 'b7e4f19a2c60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Каскадное удаление платежей при удалении объявления.

    fk_payments_property_id был создан без ondelete → в PostgreSQL действует
    NO ACTION: админское удаление объявления, у которого есть строки в payments
    (оплата промо/перехода), падало с ForeignKeyViolation → 500 вместо
    успешного физического удаления. Меняем констрейнт на ON DELETE CASCADE —
    как у всех остальных зависимых таблиц (promotions, favorites, ...).
    """
    op.drop_constraint(
        'fk_payments_property_id', 'payments', type_='foreignkey'
    )
    op.create_foreign_key(
        'fk_payments_property_id',
        'payments',
        'properties',
        ['property_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Вернуть NO ACTION (поведение по умолчанию)."""
    op.drop_constraint(
        'fk_payments_property_id', 'payments', type_='foreignkey'
    )
    op.create_foreign_key(
        'fk_payments_property_id',
        'payments',
        'properties',
        ['property_id'],
        ['id'],
    )