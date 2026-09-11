"""User settings — Kufar-standard profile/app preferences

Revision ID: 45f9c8e2d0a1
Revises: 44f6c7e0b2d2
Create Date: 2026-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45f9c8e2d0a1'
down_revision: Union[str, Sequence[str], None] = '44f6c7e0b2d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Настройки профиля и приложения по стандарту Kufar.

    Одна строка на пользователя (unique user_id). Значения по умолчанию
    соответствуют текущему поведению: уведомления включены, регион не задан,
    тема светлая, язык русский. Строка создаётся lazy при первом сохранении
    настроек — пользователи без строки ведут себя как раньше.
    """
    op.create_table(
        'user_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('default_city_id', sa.Integer(), sa.ForeignKey('cities.id'), nullable=True, index=True),
        sa.Column('notify_price_drop', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('notify_saved_searches', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('theme', sa.String(length=10), nullable=False, server_default='light'),
        sa.Column('language', sa.String(length=5), nullable=False, server_default='ru'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_user_settings_user_id'),
    )


def downgrade() -> None:
    """Откатить таблицу настроек."""
    op.drop_table('user_settings')