import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, 
    Enum, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class ExpenseClaimStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    POSTED = "POSTED"
    PAID = "PAID"


class ExpensePaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CORPORATE_CARD = "CORPORATE_CARD"
    PERSONAL_REIMBURSABLE = "PERSONAL_REIMBURSABLE"


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    default_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    tax_rate_percent = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    default_account = relationship("Account")
    expenses = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    expense_number = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    expense_date = Column(Date, nullable=False, default=date.today)
    expense_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    payment_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id", ondelete="SET NULL"), nullable=True)
    
    payment_method = Column(Enum(ExpensePaymentMethod), default=ExpensePaymentMethod.BANK_TRANSFER, nullable=False)
    subtotal = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    tax_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total_amount = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(String(10), default="INR", nullable=False)
    
    merchant_name = Column(String(200), nullable=True)
    reference_number = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    receipt_url = Column(String(500), nullable=True)
    
    is_reimbursable = Column(Boolean, default=False, nullable=False)
    is_billable = Column(Boolean, default=False, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(Enum(ExpenseClaimStatus), default=ExpenseClaimStatus.DRAFT, nullable=False, index=True)
    
    # Maker-Checker approvals
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    
    # Financial linkage
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    reimbursement_journal_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    category = relationship("ExpenseCategory", back_populates="expenses")
    user = relationship("User", foreign_keys=[user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    expense_account = relationship("Account", foreign_keys=[expense_account_id])
    payment_account = relationship("Account", foreign_keys=[payment_account_id])
    bank_account = relationship("BankAccount", foreign_keys=[bank_account_id])
    customer = relationship("Customer")
    journal_entry = relationship("JournalEntry", foreign_keys=[journal_entry_id])
    reimbursement_journal = relationship("JournalEntry", foreign_keys=[reimbursement_journal_id])
