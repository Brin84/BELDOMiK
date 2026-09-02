"""Mortgage calculator models."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class MortgageCalculation(Base):
    """Saved mortgage calculation (history for authenticated users)."""

    __tablename__ = "mortgage_calculations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Input parameters
    property_price = Column(Float, nullable=False)
    down_payment_percent = Column(Float, nullable=False, default=20.0)
    annual_rate = Column(Float, nullable=False)
    loan_term_months = Column(Integer, nullable=False)

    # Computed results (cached for display)
    monthly_payment = Column(Float, nullable=False)
    total_payment = Column(Float, nullable=False)
    overpayment = Column(Float, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="mortgage_calculations")
