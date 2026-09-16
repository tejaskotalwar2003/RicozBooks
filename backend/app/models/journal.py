import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.database.session import Base

class JournalStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    POSTED = "POSTED"
    REVERSED = "REVERSED"

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    entry_number = Column(String(100), unique=True, nullable=False, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    entry_date = Column(Date, default=date.today, nullable=False, index=True)
    reference = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    exchange_rate = Column(Numeric(18, 6), default=1.0, nullable=False)
    
    status = Column(Enum(JournalStatus), default=JournalStatus.DRAFT, nullable=False, index=True)
    
    total_debit = Column(Numeric(18, 2), default=0.0, nullable=False)
    total_credit = Column(Numeric(18, 2), default=0.0, nullable=False)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    posted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    posted_at = Column(DateTime, nullable=True)
    
    reversal_of_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    entity = relationship("Entity", back_populates="journal_entries")
    created_by = relationship("User", foreign_keys=[created_by_id])
    posted_by = relationship("User", foreign_keys=[posted_by_id])
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan", order_by="JournalEntryLine.line_number")
    approvals = relationship("Approval", back_populates="journal_entry", cascade="all, delete-orphan")

class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    line_number = Column(Integer, nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    
    description = Column(String(255), nullable=True)
    debit = Column(Numeric(18, 2), default=0.0, nullable=False)
    credit = Column(Numeric(18, 2), default=0.0, nullable=False)
    
    base_debit = Column(Numeric(18, 2), default=0.0, nullable=False)
    base_credit = Column(Numeric(18, 2), default=0.0, nullable=False)
    
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="lines")

class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # SUBMITTED, APPROVED, REJECTED
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    journal_entry = relationship("JournalEntry", back_populates="approvals")
    reviewer = relationship("User")

