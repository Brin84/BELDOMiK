"""Social models — seller reviews/ratings and follower subscriptions.

Baraholka-модель карточки продавца: рейтинг складывается из отзывов,
«Подписаться» — подписка на продавца. Обе сущности живут отдельными
таблицами от users, чтобы не плодить колонки в базовом профиле.
"""
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Review(Base):
    """Отзыв о продавце: оценка 1–5 + текст + автор.

    Один отзыв на пару (автор, продавец): повторная оценка обновляет
    существующую, как в классических маркетплейсах.
    """
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    target_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rating = Column(Float, nullable=False)  # 1.0 – 5.0
    text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    target = relationship("User", foreign_keys=[target_user_id])

    __table_args__ = (
        UniqueConstraint("target_user_id", "author_id", name="uq_review_target_author"),
    )


class UserFollow(Base):
    """Подписка пользователя на продавца."""
    __tablename__ = "user_follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    followed_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id])
    followed = relationship("User", foreign_keys=[followed_id])

    __table_args__ = (
        UniqueConstraint("follower_id", "followed_id", name="uq_follow_pair"),
    )