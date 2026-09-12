"""Add conversations and chat_messages (in-app buyer↔seller chats)

Revision ID: 9b2e5f8c1a37
Revises: 5e8a2c7d4f1b
Create Date: 2026-09-12 00:00:00.000000

Переписка покупателя с продавцом по объявлению (Kufar-модель):
conversations уникален по (property_id, buyer_id, seller_id), «удаление»
чата мягкое и раздельное для сторон (buyer_deleted_at / seller_deleted_at),
сообщения хранятся до явного удаления пользователем.

Новые таблицы — существующие данные не затрагиваются.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9b2e5f8c1a37'
down_revision: str | Sequence[str] | None = '5e8a2c7d4f1b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create conversations and chat_messages tables."""
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('buyer_id', sa.Integer(), nullable=False),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('last_message_text', sa.String(length=500), nullable=True),
        sa.Column('last_message_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('buyer_deleted_at', sa.DateTime(), nullable=True),
        sa.Column('seller_deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'property_id',
            'buyer_id',
            'seller_id',
            name='uq_conversations_property_buyer_seller',
        ),
    )
    op.create_index('ix_conversations_property_id', 'conversations', ['property_id'], unique=False)
    op.create_index('ix_conversations_buyer_id', 'conversations', ['buyer_id'], unique=False)
    op.create_index('ix_conversations_seller_id', 'conversations', ['seller_id'], unique=False)
    op.create_index(
        'ix_conversations_last_message_at', 'conversations', ['last_message_at'], unique=False
    )

    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_messages_conversation_id', 'chat_messages', ['conversation_id'], unique=False)
    op.create_index('ix_chat_messages_sender_id', 'chat_messages', ['sender_id'], unique=False)
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop chat_messages and conversations tables."""
    op.drop_index('ix_chat_messages_created_at', table_name='chat_messages')
    op.drop_index('ix_chat_messages_sender_id', table_name='chat_messages')
    op.drop_index('ix_chat_messages_conversation_id', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('ix_conversations_last_message_at', table_name='conversations')
    op.drop_index('ix_conversations_seller_id', table_name='conversations')
    op.drop_index('ix_conversations_buyer_id', table_name='conversations')
    op.drop_index('ix_conversations_property_id', table_name='conversations')
    op.drop_table('conversations')
