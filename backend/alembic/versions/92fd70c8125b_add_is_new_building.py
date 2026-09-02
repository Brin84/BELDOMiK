"""Add is_new_building column to properties (Batch B: новостройки)

Revision ID: 92fd70c8125b
Revises: 3842636985ac
Create Date: 2026-09-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92fd70c8125b'
down_revision: Union[str, Sequence[str], None] = '3842636985ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_new_building flag. Existing rows default to False (вторичное жильё)."""
    op.add_column(
        'properties',
        sa.Column('is_new_building', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Drop the column. Safe: only used to roll back the Batch B release."""
    op.drop_column('properties', 'is_new_building')