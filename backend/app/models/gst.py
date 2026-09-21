import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, 
    Enum, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class GSTReturnType(str, enum.Enum):
    GSTR_1 = "GSTR_1"
    GSTR_3B = "GSTR_3B"
    GSTR_9 = "GSTR_9"


class GSTReturnStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    READY_FOR_FILING = "READY_FOR_FILING"
    FILED = "FILED"


class GSTReturnFiling(Base):
    __tablename__ = "gst_return_filings"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    return_type = Column(Enum(GSTReturnType), nullable=False)
    return_period = Column(String(20), nullable=False, index=True) # e.g. "092026" (MMYYYY)
    status = Column(Enum(GSTReturnStatus), default=GSTReturnStatus.DRAFT, nullable=False)
    
    # Financial aggregate snapshot
    total_taxable_value = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    igst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    cess_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_tax_liability = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    # Input Tax Credit offset
    itc_claimed_igst = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    itc_claimed_cgst = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    itc_claimed_sgst = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_itc_claimed = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    # Cash payment
    net_tax_paid_cash = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    arn_number = Column(String(100), nullable=True) # Acknowledgement Reference Number from GST Portal
    filing_date = Column(DateTime, nullable=True)
    
    # Settlement linkage
    settlement_journal_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    filed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    settlement_journal = relationship("JournalEntry")
    filed_by = relationship("User")

