"""Add contact fields + is_negotiable to properties (Kufar-модель подачи)

Revision ID: b7e4f19a2c60
Revises: 7a3f02c81b4e
Create Date: 2026-09-11 12:00:00.000000

В объявлении как в Kufar: имя контактного лица, телефон и флаг «показывать
номер». Плюс флаг «Договорная цена» (price_byn=0 при is_negotiable=True).
Существующие строки: контакты NULL, show_phone=True, is_negotiable=False.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e4f19a2c60'
down_revision: Union[str, Sequence[str], None] = '7a3f02c81b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add contact fields. Existing rows: contacts NULL, show_phone=True, is_negotiable=False."""
    op.add_column('properties', sa.Column('contact_name', sa.String(length=200), nullable=True))
    op.add_column('properties', sa.Column('contact_phone', sa.String(length=50), nullable=True))
    op.add_column(
        'properties',
        sa.Column('show_phone', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        'properties',
        sa.Column('is_negotiable', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Drop the columns. Safe: только откат релиза Kufar-подачи."""
    op.drop_column('properties', 'is_negotiable')
    op.drop_column('properties', 'show_phone')
    op.drop_column('properties', 'contact_phone')
    op.drop_column('properties', 'contact_name')