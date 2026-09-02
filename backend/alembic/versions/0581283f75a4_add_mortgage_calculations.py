"""Add mortgage_calculations table (Batch C: ипотечный калькулятор)

Revision ID: 0581283f75a4
Revises: 92fd70c8125b
Create Date: 2026-09-02 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0581283f75a4'
down_revision: Union[str, Sequence[str], None] = '92fd70c8125b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create mortgage_calculations table for storing calculation history."""
    op.create_table(
        'mortgage_calculations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('property_price', sa.Float(), nullable=False),
        sa.Column('down_payment_percent', sa.Float(), nullable=False, server_default=sa.text('20.0')),
        sa.Column('annual_rate', sa.Float(), nullable=False),
        sa.Column('loan_term_months', sa.Integer(), nullable=False),
        sa.Column('monthly_payment', sa.Float(), nullable=False),
        sa.Column('total_payment', sa.Float(), nullable=False),
        sa.Column('overpayment', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mortgage_calculations_user_id', 'mortgage_calculations', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop mortgage_calculations table."""
    op.drop_index('ix_mortgage_calculations_user_id', table_name='mortgage_calculations')
    op.drop_table('mortgage_calculations')
