"""Add reviews and user_follows (seller card: rating + subscribe)

Revision ID: 1f3c8a5e7b2d
Revises: 9b2e5f8c1a37
Create Date: 2026-09-15 00:00:00.000000

Барахолка-модель карточки продавца: рейтинг из отзывов (reviews), подписка
на продавца (user_follows). Один отзыв на пару (автор, продавец) — повторная
оценка обновляет существующую. Новые таблицы — существующие данные не
затрагиваются.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '1f3c8a5e7b2d'
down_revision: str | Sequence[str] | None = '9b2e5f8c1a37'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create reviews and user_follows tables."""
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('target_user_id', 'author_id', name='uq_review_target_author'),
    )
    op.create_index('ix_reviews_target_user_id', 'reviews', ['target_user_id'], unique=False)
    op.create_index('ix_reviews_author_id', 'reviews', ['author_id'], unique=False)

    op.create_table(
        'user_follows',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('followed_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['followed_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'followed_id', name='uq_follow_pair'),
    )
    op.create_index('ix_user_follows_follower_id', 'user_follows', ['follower_id'], unique=False)
    op.create_index('ix_user_follows_followed_id', 'user_follows', ['followed_id'], unique=False)


def downgrade() -> None:
    """Drop user_follows and reviews tables."""
    op.drop_index('ix_user_follows_followed_id', table_name='user_follows')
    op.drop_index('ix_user_follows_follower_id', table_name='user_follows')
    op.drop_table('user_follows')
    op.drop_index('ix_reviews_author_id', table_name='reviews')
    op.drop_index('ix_reviews_target_user_id', table_name='reviews')
    op.drop_table('reviews')