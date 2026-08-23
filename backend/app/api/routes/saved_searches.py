"""Saved searches routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.property import SavedSearchCreate, SavedSearchResponse, SavedSearchUpdate
from app.services.saved_search_service import SavedSearchService

router = APIRouter(prefix="/saved-searches", tags=["Saved Searches"])


@router.post("", response_model=SavedSearchResponse, status_code=201)
def create_saved_search(
    data: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a saved search."""
    search = SavedSearchService.create_search(
        db,
        current_user.id,
        data.name,
        data.filters_json,
        data.notify_frequency,
    )
    return SavedSearchResponse.model_validate(search)


@router.get("", response_model=list[SavedSearchResponse])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's saved searches."""
    searches = SavedSearchService.get_user_searches(db, current_user.id)
    return [SavedSearchResponse.model_validate(s) for s in searches]


@router.put("/{search_id}", response_model=SavedSearchResponse)
def update_saved_search(
    search_id: int,
    data: SavedSearchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a saved search."""
    search = SavedSearchService.update_search(
        db,
        search_id,
        current_user.id,
        data.name,
        data.filters_json,
        data.notify_frequency,
        data.is_active,
    )
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return SavedSearchResponse.model_validate(search)


@router.delete("/{search_id}")
def delete_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search."""
    success = SavedSearchService.delete_search(db, search_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"message": "Saved search deleted"}


@router.post("/{search_id}/toggle")
def toggle_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle notifications for a saved search."""
    search = SavedSearchService.toggle_notifications(db, search_id, current_user.id)
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return SavedSearchResponse.model_validate(search)