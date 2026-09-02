"""Mortgage calculator schemas."""
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class MortgageCalculationCreate(BaseSchema):
    """Input parameters for a mortgage calculation."""

    property_price: float = Field(..., gt=0, description="Стоимость недвижимости, BYN")
    down_payment_percent: float = Field(20.0, ge=0, le=100, description="Первоначальный взнос, %")
    annual_rate: float = Field(..., gt=0, description="Годовая процентная ставка, %")
    loan_term_months: int = Field(..., gt=0, le=600, description="Срок кредита, месяцы")


class MortgageCalculationRead(BaseSchema):
    """Saved mortgage calculation (output)."""

    id: int
    user_id: int
    property_price: float
    down_payment_percent: float
    annual_rate: float
    loan_term_months: int
    monthly_payment: float
    total_payment: float
    overpayment: float
    created_at: datetime
