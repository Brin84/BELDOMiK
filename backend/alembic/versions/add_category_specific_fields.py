"""Add category-specific fields: land_area, garage_type, commercial_purpose, etc.

Revision ID: add_category_specific_fields
Revises: 1f3c8a5e7b2d
Create Date: 2026-10-15 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_category_specific_fields'
down_revision: Union[str, Sequence[str], None] = '1f3c8a5e7b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add category-specific property fields for houses, land, garages, commercial."""
    # Дом / участок
    op.add_column('properties', sa.Column('land_area', sa.Float(), nullable=True))       # сотки
    op.add_column('properties', sa.Column('house_area', sa.Float(), nullable=True))      # м²
    op.add_column('properties', sa.Column('house_type', sa.String(100), nullable=True)) # тип дома

    # Участок
    op.add_column('properties', sa.Column('cadastral_number', sa.String(100), nullable=True))  # кадастровый номер
    op.add_column('properties', sa.Column('land_category', sa.String(100), nullable=True))     # категория земли

    # Гараж / машиноместо
    op.add_column('properties', sa.Column('garage_type', sa.String(100), nullable=True))   # тип гаража
    op.add_column('properties', sa.Column('garage_area', sa.Float(), nullable=True))       # площадь м²
    op.add_column('properties', sa.Column('is_heated', sa.Boolean(), nullable=False, server_default=sa.false()))

    # Коммерческая недвижимость
    op.add_column('properties', sa.Column('commercial_purpose', sa.String(100), nullable=True))  # назначение
    op.add_column('properties', sa.Column('utility_area', sa.Float(), nullable=True))              # подсобные м²
    op.add_column('properties', sa.Column('has_warehouse', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('properties', sa.Column('has_office', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Drop category-specific columns."""
    op.drop_column('properties', 'has_office')
    op.drop_column('properties', 'has_warehouse')
    op.drop_column('properties', 'utility_area')
    op.drop_column('properties', 'commercial_purpose')
    op.drop_column('properties', 'is_heated')
    op.drop_column('properties', 'garage_area')
    op.drop_column('properties', 'garage_type')
    op.drop_column('properties', 'land_category')
    op.drop_column('properties', 'cadastral_number')
    op.drop_column('properties', 'house_type')
    op.drop_column('properties', 'house_area')
    op.drop_column('properties', 'land_area')
