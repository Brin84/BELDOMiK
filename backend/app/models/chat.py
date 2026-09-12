"""Chat models — переписка покупателя с продавцом по объявлению (Kufar-style).

Диалог живёт внутри MiniApp, а не в Telegram: одна тройка
(объявление, покупатель, продавец) = одна переписка, поэтому покупатель
видит отдельный чат по каждому объявлению, а продавец — отдельный чат
с каждым клиентом.

«Удаление» чата — мягкое и раздельное: у каждой стороны своя метка
deleted_at, так что чат исчезает только у того, кто его удалил.
История сообщений при этом не пропадает: переписка возвращается, если
по ней придёт или уйдёт новое сообщение (метки снимаются при отправке).
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class Conversation(Base):
    """Диалог покупателя с владельцем объявления."""

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "property_id",
            "buyer_id",
            "seller_id",
            name="uq_conversations_property_buyer_seller",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(
        Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Денормализованный «хвост» диалога: список чатов рисуется без join'а к
    # сообщениям (последнее сообщение + время последнего сообщения).
    last_message_text = Column(String(500), nullable=True)
    last_message_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Раздельное мягкое удаление: чат скрыт у того, кто его удалил.
    buyer_deleted_at = Column(DateTime, nullable=True)
    seller_deleted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.id",
    )


class ChatMessage(Base):
    """Сообщение внутри диалога."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text = Column(Text, nullable=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
