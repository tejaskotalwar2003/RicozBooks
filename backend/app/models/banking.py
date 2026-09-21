import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, 
    Enum, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class BankAccountType(str, enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    MONEY_MARKET = "MONEY_MARKET"
    OVERDRAFT = "OVERDRAFT"


class BankTxType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    BANK_FEE = "BANK_FEE"
    INTEREST = "INTEREST"
    EXPENSE_PAYMENT = "EXPENSE_PAYMENT"
    CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT"
    VENDOR_PAYMENT = "VENDOR_PAYMENT"


class BankTxStatus(str, enum.Enum):
    UNRECONCILED = "UNRECONCILED"
    RECONCILED = "RECONCILED"
    EXCLUDED = "EXCLUDED"


class ReconciliationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name = Column(String(100), nullable=False)
    account_name = Column(String(150), nullable=False)
    account_number = Column(String(50), nullable=False)
    account_type = Column(Enum(BankAccountType), default=BankAccountType.CHECKING, nullable=False)
    
    ifsc_code = Column(String(30), nullable=True) # or Routing Number
    swift_bic = Column(String(30), nullable=True)
    branch_name = Column(String(100), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    
    gl_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    opening_balance = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    current_balance = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    gl_account = relationship("Account")
    transactions = relationship("BankTransaction", back_populates="bank_account", order_by="desc(BankTransaction.transaction_date)")
    reconciliations = relationship("BankReconciliation", back_populates="bank_account")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(Enum(BankTxType), nullable=False)
    transaction_date = Column(Date, nullable=False, default=date.today, index=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    is_credit = Column(Boolean, nullable=False) # True = deposit / inflow, False = withdrawal / outflow
    running_balance = Column(Numeric(15, 2), nullable=True)
    
    reference_number = Column(String(100), nullable=True) # Cheque #, UTR, NEFT ref
    counterparty = Column(String(200), nullable=True) # Payee or Payer
    description = Column(String(255), nullable=True)
    
    status = Column(Enum(BankTxStatus), default=BankTxStatus.UNRECONCILED, nullable=False, index=True)
    reconciled_at = Column(DateTime, nullable=True)
    reconciliation_id = Column(Integer, ForeignKey("bank_reconciliations.id", ondelete="SET NULL"), nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bank_account = relationship("BankAccount", back_populates="transactions")
    reconciliation = relationship("BankReconciliation", back_populates="transactions")
    journal_entry = relationship("JournalEntry")


class BankTransfer(Base):
    __tablename__ = "bank_transfers"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    transfer_number = Column(String(50), nullable=False, index=True)
    
    from_bank_account_id = Column(Integer, ForeignKey("bank_accounts.id", ondelete="RESTRICT"), nullable=False)
    to_bank_account_id = Column(Integer, ForeignKey("bank_accounts.id", ondelete="RESTRICT"), nullable=False)
    
    transfer_date = Column(Date, nullable=False, default=date.today)
    amount = Column(Numeric(15, 2), nullable=False)
    fee_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    from_bank_account = relationship("BankAccount", foreign_keys=[from_bank_account_id])
    to_bank_account = relationship("BankAccount", foreign_keys=[to_bank_account_id])
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")


class BankReconciliation(Base):
    __tablename__ = "bank_reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    statement_date = Column(Date, nullable=False, index=True)
    
    statement_balance = Column(Numeric(15, 2), nullable=False) # Ending balance on bank statement
    book_balance = Column(Numeric(15, 2), nullable=False)      # Balance in RicozBooks GL
    reconciled_balance = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    difference = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    status = Column(Enum(ReconciliationStatus), default=ReconciliationStatus.DRAFT, nullable=False)
    notes = Column(Text, nullable=True)
    
    reconciled_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    bank_account = relationship("BankAccount", back_populates="reconciliations")
    transactions = relationship("BankTransaction", back_populates="reconciliation")
    statement_lines = relationship("BankStatementLine", back_populates="reconciliation", cascade="all, delete-orphan")
    reconciled_by = relationship("User")


class BankStatementLine(Base):
    __tablename__ = "bank_statement_lines"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_id = Column(Integer, ForeignKey("bank_reconciliations.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_date = Column(Date, nullable=False)
    description = Column(String(255), nullable=False)
    reference = Column(String(100), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    is_credit = Column(Boolean, nullable=False) # Inflow vs Outflow
    balance_after = Column(Numeric(15, 2), nullable=True)
    
    is_matched = Column(Boolean, default=False, nullable=False)
    matched_transaction_id = Column(Integer, ForeignKey("bank_transactions.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    reconciliation = relationship("BankReconciliation", back_populates="statement_lines")
    matched_transaction = relationship("BankTransaction")
