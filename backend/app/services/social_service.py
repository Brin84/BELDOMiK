"""Social service — seller review/rating metrics and follower subscriptions.

Baraholka-модель: рейтинг продавца = среднее по отзывам, «дело» — объявление
со статусом SOLD/RENTED, подписки — таблица user_follows.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.property import Property, PropertyStatus
from app.models.social import Review, UserFollow
from app.models.user import User, UserProfile


SOLD_STATUSES = (PropertyStatus.SOLD, PropertyStatus.RENTED)


def _avatar(db: Session, owner: User) -> str | None:
    """Avatar из профиля пользователя (lazy-load внутри сессии)."""
    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == owner.id).first()
    )
    return profile.avatar_url if profile else None


def user_summary(
    db: Session,
    owner: User,
    viewer_id: int | None = None,
) -> dict:
    """Сводка продавца: имя, аватар, рейтинг, отзывы/сделки/подписчики."""
    rating, reviews_count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.target_user_id == owner.id
        )
    ).one()
    deals_count = db.execute(
        select(func.count(Property.id)).where(
            Property.owner_id == owner.id,
            Property.status.in_(SOLD_STATUSES),
        )
    ).scalar_one()
    followers_count = db.execute(
        select(func.count(UserFollow.id)).where(
            UserFollow.followed_id == owner.id
        )
    ).scalar_one()
    is_following = False
    if viewer_id and viewer_id != owner.id:
        is_following = (
            db.execute(
                select(UserFollow.id).where(
                    UserFollow.follower_id == viewer_id,
                    UserFollow.followed_id == owner.id,
                )
            ).first()
            is not None
        )
    return {
        "id": owner.id,
        "name": (owner.first_name or owner.last_name) or owner.username or f"Пользователь {owner.id}",
        "username": owner.username,
        "avatar_url": _avatar(db, owner),
        "created_at": owner.created_at,
        "rating": round(float(rating) if rating is not None else 0.0, 1),
        "reviews_count": int(reviews_count or 0),
        "deals_count": int(deals_count or 0),
        "followers_count": int(followers_count or 0),
        "is_following": is_following,
        "is_self": viewer_id == owner.id,
    }


def follow_user(db: Session, follower: User, followed_id: int) -> bool:
    """Подписаться на продавца. Idempotent: повтор = ничего не меняет."""
    if followed_id == follower.id:
        raise ValueError("Нельзя подписаться на самого себя")
    exists = (
        db.query(UserFollow)
        .filter(
            UserFollow.follower_id == follower.id,
            UserFollow.followed_id == followed_id,
        )
        .first()
    )
    if exists:
        return False
    db.add(UserFollow(follower_id=follower.id, followed_id=followed_id))
    db.commit()
    return True


def unfollow_user(db: Session, follower: User, followed_id: int) -> bool:
    """Отписаться. Idempotent: повтор = ничего не меняет."""
    deleted = (
        db.query(UserFollow)
        .filter(
            UserFollow.follower_id == follower.id,
            UserFollow.followed_id == followed_id,
        )
        .delete()
    )
    db.commit()
    return deleted > 0


def upsert_review(
    db: Session,
    author: User,
    target_user_id: int,
    rating: float,
    text: str | None,
) -> Review:
    """Создать/обновить отзыв: 1 отзыв на пару (автор, продавец)."""
    if target_user_id == author.id:
        raise ValueError("Нельзя оставить отзыв о себе")
    existing = (
        db.query(Review)
        .filter(
            Review.author_id == author.id,
            Review.target_user_id == target_user_id,
        )
        .first()
    )
    if existing:
        existing.rating = rating
        existing.text = text
    else:
        existing = Review(
            author_id=author.id,
            target_user_id=target_user_id,
            rating=rating,
            text=text,
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def delete_review(db: Session, review_id: int, user: User) -> bool:
    """Удалить отзыв (только автор или админ)."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return False
    if review.author_id != user.id and user.role not in ("admin", "moderator"):
        raise PermissionError("Удалять отзыв может только его автор")
    db.delete(review)
    db.commit()
    return True


def list_reviews(db: Session, target_user_id: int) -> list[Review]:
    """Отзывы о продавце (новые сверху)."""
    return (
        db.query(Review)
        .filter(Review.target_user_id == target_user_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .all()
    )