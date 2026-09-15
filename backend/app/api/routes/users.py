"""User social routes — seller profile card, follow/unfollow, reviews list."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, get_optional_user
from app.models.user import User
from app.schemas.social import ReviewListResponse, UserSummaryRead
from app.services import social_service

router = APIRouter(prefix="/users", tags=["Users"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.get("/{user_id}", response_model=UserSummaryRead)
def get_user_summary(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Карточка продавца: имя, аватар, рейтинг, подписчики (стата не о себе)."""
    owner = _get_user_or_404(db, user_id)
    viewer_id = current_user.id if current_user else None
    return UserSummaryRead.model_validate(
        social_service.user_summary(db, owner, viewer_id)
    )


@router.get("/{user_id}/reviews", response_model=ReviewListResponse)
def list_user_reviews(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Отзывы о продавце + сводка для карточки."""
    owner = _get_user_or_404(db, user_id)
    viewer_id = current_user.id if current_user else None
    summary = social_service.user_summary(db, owner, viewer_id)
    reviews = social_service.list_reviews(db, user_id)
    items = []
    for r in reviews:
        author = r.author
        items.append(
            {
                "id": r.id,
                "target_user_id": r.target_user_id,
                "rating": r.rating,
                "text": r.text,
                "created_at": r.created_at,
                "author": {
                    "id": author.id,
                    "name": (author.first_name or author.last_name)
                    or f"Пользователь {author.id}",
                    "avatar_url": None
                    if author.profile is None
                    else author.profile.avatar_url,
                },
            }
        )
    return {
        "items": items,
        "total": summary["reviews_count"],
        "summary": summary,
    }


@router.post("/{user_id}/follow", response_model=UserSummaryRead)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner = _get_user_or_404(db, user_id)
    try:
        social_service.follow_user(db, current_user, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    return UserSummaryRead.model_validate(
        social_service.user_summary(db, owner, current_user.id)
    )


@router.delete("/{user_id}/follow", status_code=204)
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_user_or_404(db, user_id)
    social_service.unfollow_user(db, current_user, user_id)