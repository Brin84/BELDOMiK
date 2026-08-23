"""Property types and operations routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.property_types import OperationType, PropertyType
from app.schemas.property_types import OperationTypeResponse, PropertyTypeResponse

router = APIRouter(prefix="/property-types", tags=["Property Types"])


@router.get("", response_model=list[PropertyTypeResponse])
def get_property_types(db: Session = Depends(get_db)):
    """Get all property types."""
    return (
        db.query(PropertyType)
        .filter(PropertyType.is_active == True)
        .order_by(PropertyType.sort_order)
        .all()
    )


@router.get("/{type_id}", response_model=PropertyTypeResponse)
def get_property_type(type_id: int, db: Session = Depends(get_db)):
    """Get a specific property type."""
    property_type = db.query(PropertyType).filter(PropertyType.id == type_id).first()
    if not property_type:
        raise HTTPException(status_code=404, detail="Property type not found")
    return property_type


@router.get("/operations/list", response_model=list[OperationTypeResponse])
def get_operations(db: Session = Depends(get_db)):
    """Get all operation types."""
    return (
        db.query(OperationType)
        .filter(OperationType.is_active == True)
        .order_by(OperationType.sort_order)
        .all()
    )


@router.get("/operations/{operation_id}", response_model=OperationTypeResponse)
def get_operation(operation_id: int, db: Session = Depends(get_db)):
    """Get a specific operation type."""
    operation = db.query(OperationType).filter(OperationType.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Operation type not found")
    return operation