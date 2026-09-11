"""Payments promotion_id FK — ON DELETE CASCADE (admin hard-delete)

Revision ID: 44f6c7e0b2d2
Revises: 34f6a5d9b0c1
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44f6c7e0b2d2'
down_revision: Union[str, Sequence[str], None] = '34f6a5d9b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Каскадное удаление платежей при удалении промо.

    fk_payments_promotion_id был создан без ondelete (a9f3c21d87b4) → NO ACTION.
    Админское удаление объявления каскадит promotions по property_id (initial
    миграция), а привязанные платежи (payments.promotion_id) блокировали это
    удаление: ForeignKeyViolation → 500 (пустой alert). Меняем на CASCADE —
    платёж за продвижение живёт, пока живёт само продвижение.
    """
    op.drop_constraint(
        'fk_payments_promotion_id', 'payments', type_='foreignkey'
    )
    op.create_foreign_key(
        'fk_payments_promotion_id',
        'payments',
        'promotions',
        ['promotion_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Вернуть NO ACTION (поведение по умолчанию)."""
    op.drop_constraint(
        'fk_payments_promotion_id', 'payments', type_='foreignkey'
    )
    op.create_foreign_key(
        'fk_payments_promotion_id',
        'payments',
        'promotions',
        ['promotion_id'],
        ['id'],
    )