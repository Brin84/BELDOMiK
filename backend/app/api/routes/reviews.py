"""Reviews routes — leave/update and delete a review about a seller."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.social import ReviewCreate, ReviewRead
from app.services import social_service

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewRead, status_code=201)
def create_review(
    request: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Оставить/обновить отзыв о продавце (1 отзыв на пару, upsert)."""
    target = db.query(User).filter(User.id == request.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    try:
        review = social_service.upsert_review(
            db,
            current_user,
            target.id,
            request.rating,
            request.text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    return _review_read(db, review)


@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ok = social_service.delete_review(db, review_id, current_user)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from None
    if not ok:
        raise HTTPException(status_code=404, detail="Отзыв не найден")


def _review_read(db: Session, review: object) -> dict:
    """Сериализация Review + мини-карточка автора."""
    author = review.author
    return {
        "id": review.id,
        "target_user_id": review.target_user_id,
        "rating": review.rating,
        "text": review.text,
        "created_at": review.created_at,
        "author": {
            "id": author.id,
            "name": (author.first_name or author.last_name)
            or f"Пользователь {author.id}",
            "avatar_url": None
            if author.profile is None
            else author.profile.avatar_url,
        },
    }