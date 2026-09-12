"""Add balcony_count and loggia_count (количество балконов/лоджий) to properties

Revision ID: 3a9c4d7f2e8b
Revises: 45f9c8e2d0a1
Create Date: 2026-09-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a9c4d7f2e8b'
down_revision: Union[str, Sequence[str], None] = '45f9c8e2d0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Количество балконов и лоджий — опциональные параметры подачи.

    Колонки nullable, чтобы существующие объявления и повторные подачи старых
    черновиков не требовали значения (по умолчанию «не указано»). Признак
    «есть балкон» (properties.balcony) остаётся отдельным и синхронизируется
    с balcony_count на фронте (count > 0 ⇒ balcony=true), не меняя фильтры.
    """
    op.add_column(
        'properties',
        sa.Column('balcony_count', sa.Integer(), nullable=True),
    )
    op.add_column(
        'properties',
        sa.Column('loggia_count', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('properties', 'loggia_count')
    op.drop_column('properties', 'balcony_count')