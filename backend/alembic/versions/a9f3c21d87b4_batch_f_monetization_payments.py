"""Batch F: monetization — add payment link columns (Batch F)

Revision ID: a9f3c21d87b4
Revises: c0277eccbfff
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9f3c21d87b4'
down_revision: Union[str, Sequence[str], None] = 'c0277eccbfff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add payment link columns (property/promotion/subscription/payment_link)."""
    op.add_column('payments', sa.Column('property_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('promotion_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('subscription_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('payment_link', sa.String(length=500), nullable=True))
    op.create_foreign_key('fk_payments_property_id', 'payments', 'properties', ['property_id'], ['id'])
    op.create_foreign_key('fk_payments_promotion_id', 'payments', 'promotions', ['promotion_id'], ['id'])
    op.create_foreign_key('fk_payments_subscription_id', 'payments', 'subscriptions', ['subscription_id'], ['id'])
    op.create_index('ix_payments_property_id', 'payments', ['property_id'], unique=False)
    op.create_index('ix_payments_promotion_id', 'payments', ['promotion_id'], unique=False)
    op.create_index('ix_payments_subscription_id', 'payments', ['subscription_id'], unique=False)


def downgrade() -> None:
    """Remove payment link columns."""
    op.drop_index('ix_payments_subscription_id', table_name='payments')
    op.drop_index('ix_payments_promotion_id', table_name='payments')
    op.drop_index('ix_payments_property_id', table_name='payments')
    op.drop_constraint('fk_payments_subscription_id', 'payments', type_='foreignkey')
    op.drop_constraint('fk_payments_promotion_id', 'payments', type_='foreignkey')
    op.drop_constraint('fk_payments_property_id', 'payments', type_='foreignkey')
    op.drop_column('payments', 'payment_link')
    op.drop_column('payments', 'subscription_id')
    op.drop_column('payments', 'promotion_id')
    op.drop_column('payments', 'property_id')
