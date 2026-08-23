"""Property type and operation type schemas."""
from app.schemas.common import BaseSchema


class PropertyTypeBase(BaseSchema):
    category: str
    name: str
    name_en: str | None = None
    name_plural: str | None = None
    icon: str | None = None
    sort_order: int = 0
    is_active: bool = True


class PropertyTypeCreate(PropertyTypeBase):
    pass


class PropertyTypeRead(PropertyTypeBase):
    id: int


class OperationTypeBase(BaseSchema):
    name: str
    name_en: str | None = None
    name_plural: str | None = None
    sort_order: int = 0
    is_active: bool = True


class OperationTypeCreate(OperationTypeBase):
    pass


class OperationTypeRead(OperationTypeBase):
    id: int


# Aliases for backward compatibility with routes
PropertyTypeResponse = PropertyTypeRead
OperationTypeResponse = OperationTypeRead