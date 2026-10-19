"""Widen moderation_actions.action column to fit all enum values.

Revision ID: widen_moderation_action_column
Revises:
Create Date: 2026-10-19
"""
from alembic import op
import sqlalchemy as sa

revision = "widen_moderation_action_column"
down_revision = "add_promotion_brackets_base_prices"  # set correct parent after checking alembic history if needed
branch_labels = None
depends_on = None


def upgrade() -> None:
    # action column was VARCHAR(7) — ModerationActionType.ARCHIVE="archive" fits (7),
    # but PropertyStatus values ("published"=9, "pending_moderation"=16) don't.
    # Widening to VARCHAR(20) to accommodate all enum values safely.
    op.alter_column(
        "moderation_actions",
        "action",
        existing_type=sa.String(length=7),
        type_=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "moderation_actions",
        "action",
        existing_type=sa.String(length=20),
        type_=sa.String(length=7),
        existing_nullable=False,
    )
