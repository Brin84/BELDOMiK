"""Add moderation_reason column to properties (автомодерация)

Revision ID: 7a3f02c81b4e
Revises: 4d8e2f1a3b9c
Create Date: 2026-09-09 12:00:00.000000

Причина отклонения объявления автомодерацией сохраняется прямо в строке
properties и возвращается API как moderation_reason. Старые строки остаются
NULL — причина есть только у отклонённых автомодерацией объявлений.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a3f02c81b4e'
down_revision: Union[str, Sequence[str], None] = '4d8e2f1a3b9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add moderation_reason. Existing rows default to NULL."""
    op.add_column(
        'properties',
        sa.Column('moderation_reason', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Drop the column. Safe: только откат релиза автомодерации."""
    op.drop_column('properties', 'moderation_reason')