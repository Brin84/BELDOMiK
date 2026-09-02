"""Mortgage calculator routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.mortgage import MortgageCalculationCreate, MortgageCalculationRead
from app.services.mortgage_service import MortgageService

router = APIRouter(prefix="/mortgage", tags=["Mortgage"])


@router.post("/calculate", response_model=MortgageCalculationRead)
def save_calculation(
    data: MortgageCalculationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute and save a mortgage calculation to user history."""
    return MortgageService.save(data, current_user.id, db)


@router.get("/history", response_model=list[MortgageCalculationRead])
def get_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get saved mortgage calculation history for the current user."""
    return MortgageService.list_for_user(current_user.id, db, limit)
