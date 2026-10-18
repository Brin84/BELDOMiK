"""add promotion brackets and base prices tables

Revision ID: add_promotion_brackets_base_prices
Revises: add_provider_data_column
Create Date: 2026-10-19 00:17:57.698321

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_promo_brackets_prices'
down_revision: Union[str, Sequence[str], None] = 'add_provider_data_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Promotion price brackets
    op.create_table(
        'promotion_price_brackets',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('min_price_byn', sa.Integer(), nullable=False),
        sa.Column('max_price_byn', sa.Integer(), nullable=True),
        sa.Column('multiplier', sa.Float(), nullable=False),
        sa.Column('label', sa.String(50), nullable=False),
        sa.Column('sort_order', sa.Integer(), default=0, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # Promotion base prices
    op.create_table(
        'promotion_base_prices',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('promotion_type', sa.String(9), nullable=False, unique=True, index=True),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('base_price_byn', sa.Float(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('badge_color', sa.String(20), nullable=False),
        sa.Column('features', sa.Text(), nullable=False),  # JSON array
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    from datetime import datetime
    now = datetime.utcnow()

    # Insert default brackets
    op.bulk_insert(
        sa.table(
            'promotion_price_brackets',
            sa.column('min_price_byn', sa.Integer),
            sa.column('max_price_byn', sa.Integer),
            sa.column('multiplier', sa.Float),
            sa.column('label', sa.String),
            sa.column('sort_order', sa.Integer),
            sa.column('is_active', sa.Boolean),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
        ),
        [
            {'min_price_byn': 0, 'max_price_byn': 100, 'multiplier': 1.0, 'label': 'Базовый', 'sort_order': 0, 'is_active': True, 'created_at': now, 'updated_at': now},
            {'min_price_byn': 101, 'max_price_byn': 1000, 'multiplier': 2.0, 'label': 'Низкий', 'sort_order': 1, 'is_active': True, 'created_at': now, 'updated_at': now},
            {'min_price_byn': 1001, 'max_price_byn': 10000, 'multiplier': 3.5, 'label': 'Средний', 'sort_order': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
            {'min_price_byn': 10001, 'max_price_byn': 50000, 'multiplier': 5.5, 'label': 'Высокий', 'sort_order': 3, 'is_active': True, 'created_at': now, 'updated_at': now},
            {'min_price_byn': 50001, 'max_price_byn': None, 'multiplier': 7.5, 'label': 'Премиум', 'sort_order': 4, 'is_active': True, 'created_at': now, 'updated_at': now},
        ]
    )

    # Insert default base prices
    op.bulk_insert(
        sa.table(
            'promotion_base_prices',
            sa.column('promotion_type', sa.String),
            sa.column('label', sa.String),
            sa.column('base_price_byn', sa.Float),
            sa.column('duration_days', sa.Integer),
            sa.column('priority', sa.Integer),
            sa.column('badge_color', sa.String),
            sa.column('features', sa.Text),
            sa.column('is_active', sa.Boolean),
            sa.column('created_at', sa.DateTime),
            sa.column('updated_at', sa.DateTime),
        ),
        [
            {
                'promotion_type': 'top',
                'label': 'Топ',
                'base_price_byn': 1.2,
                'duration_days': 7,
                'priority': 100,
                'badge_color': '#ff9500',
                'features': '["Показ вверху выдачи на 7 дней", "Повышенная заметность"]',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'promotion_type': 'vip',
                'label': 'VIP',
                'base_price_byn': 2.5,
                'duration_days': 7,
                'priority': 200,
                'badge_color': '#af52de',
                'features': '["Максимальная заметность на 7 дней", "Особая VIP-метка"]',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'promotion_type': 'bump_up',
                'label': 'Поднять',
                'base_price_byn': 0.3,
                'duration_days': 1,
                'priority': 50,
                'badge_color': '#34c759',
                'features': '["Поднятие в выдаче на 1 день"]',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'promotion_type': 'highlight',
                'label': 'Выделить',
                'base_price_byn': 0.5,
                'duration_days': 3,
                'priority': 70,
                'badge_color': '#007aff',
                'features': '["Подсветка объявления на 3 дня"]',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
            {
                'promotion_type': 'pin',
                'label': 'Закрепить',
                'base_price_byn': 3.0,
                'duration_days': 7,
                'priority': 300,
                'badge_color': '#ff2d55',
                'features': '["Закрепление объявления на 7 дней"]',
                'is_active': True,
                'created_at': now,
                'updated_at': now,
            },
        ]
    )


def downgrade() -> None:
    op.drop_table('promotion_base_prices')
    op.drop_table('promotion_price_brackets')