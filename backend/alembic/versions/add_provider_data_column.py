"""Add provider_data column to payments table.

Revision ID: add_provider_data_column
Revises: add_category_specific_fields
Create Date: 2026-10-18 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_provider_data_column'
down_revision: Union[str, Sequence[str], None] = 'add_category_specific_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add provider_data column to payments table."""
    op.add_column('payments', sa.Column('provider_data', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove provider_data column."""
    op.drop_column('payments', 'provider_data')