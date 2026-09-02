"""Mortgage calculator service."""
from sqlalchemy.orm import Session

from app.models.mortgage import MortgageCalculation
from app.schemas.mortgage import MortgageCalculationCreate


class MortgageService:
    """Handles mortgage calculation persistence."""

    @staticmethod
    def save(data: MortgageCalculationCreate, user_id: int, db: Session) -> MortgageCalculation:
        """Compute results and save a mortgage calculation to history."""
        down_payment_amount = data.property_price * (data.down_payment_percent / 100)
        principal = data.property_price - down_payment_amount
        monthly_rate = data.annual_rate / 100 / 12

        if monthly_rate == 0:
            monthly_payment = principal / data.loan_term_months
        else:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** data.loan_term_months) / (
                (1 + monthly_rate) ** data.loan_term_months - 1
            )

        total_payment = monthly_payment * data.loan_term_months
        overpayment = total_payment - principal

        calc = MortgageCalculation(
            user_id=user_id,
            property_price=data.property_price,
            down_payment_percent=data.down_payment_percent,
            annual_rate=data.annual_rate,
            loan_term_months=data.loan_term_months,
            monthly_payment=round(monthly_payment, 2),
            total_payment=round(total_payment, 2),
            overpayment=round(overpayment, 2),
        )
        db.add(calc)
        db.commit()
        db.refresh(calc)
        return calc

    @staticmethod
    def list_for_user(user_id: int, db: Session, limit: int = 20) -> list[MortgageCalculation]:
        """Return recent calculations for a user."""
        return (
            db.query(MortgageCalculation)
            .filter(MortgageCalculation.user_id == user_id)
            .order_by(MortgageCalculation.created_at.desc())
            .limit(limit)
            .all()
        )
