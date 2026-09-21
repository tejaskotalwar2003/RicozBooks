from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.models.banking import (
    BankAccountType, BankTxType, BankTxStatus, ReconciliationStatus
)

# =========================================================================
# 1. BANK ACCOUNT SCHEMAS
# =========================================================================
class BankAccountBase(BaseModel):
    bank_name: str = Field(..., min_length=2, max_length=100)
    account_name: str = Field(..., min_length=2, max_length=150)
    account_number: str = Field(..., min_length=4, max_length=50)
    account_type: BankAccountType = BankAccountType.CHECKING
    ifsc_code: Optional[str] = None
    swift_bic: Optional[str] = None
    branch_name: Optional[str] = None
    currency: str = "INR"
    gl_account_id: int
    opening_balance: Decimal = Decimal("0.00")

class BankAccountCreate(BankAccountBase):
    entity_id: int

class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[BankAccountType] = None
    ifsc_code: Optional[str] = None
    swift_bic: Optional[str] = None
    branch_name: Optional[str] = None
    is_active: Optional[bool] = None

class BankAccountResponse(BankAccountBase):
    id: int
    entity_id: int
    current_balance: Decimal
    is_active: bool
    gl_account_code: Optional[str] = None
    gl_account_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# 2. BANK TRANSACTION SCHEMAS
# =========================================================================
class BankTransactionBase(BaseModel):
    bank_account_id: int
    transaction_type: BankTxType
    transaction_date: date
    amount: Decimal = Field(..., gt=0)
    is_credit: bool # True = Deposit / Credit, False = Withdrawal / Debit
    reference_number: Optional[str] = None
    counterparty: Optional[str] = None
    description: Optional[str] = None

class BankTransactionCreate(BankTransactionBase):
    pass

class BankTransactionResponse(BankTransactionBase):
    id: int
    running_balance: Optional[Decimal] = None
    status: BankTxStatus
    reconciled_at: Optional[datetime] = None
    reconciliation_id: Optional[int] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# 3. INTERNAL BANK TRANSFER SCHEMAS
# =========================================================================
class BankTransferCreate(BaseModel):
    entity_id: int
    from_bank_account_id: int
    to_bank_account_id: int
    transfer_date: date
    amount: Decimal = Field(..., gt=0)
    fee_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class BankTransferResponse(BaseModel):
    id: int
    entity_id: int
    transfer_number: str
    from_bank_account_id: int
    to_bank_account_id: int
    transfer_date: date
    amount: Decimal
    fee_amount: Decimal
    currency: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# 4. BANK RECONCILIATION SCHEMAS
# =========================================================================
class BankStatementLineBase(BaseModel):
    transaction_date: date
    description: str
    reference: Optional[str] = None
    amount: Decimal
    is_credit: bool
    balance_after: Optional[Decimal] = None

class BankStatementLineResponse(BankStatementLineBase):
    id: int
    reconciliation_id: int
    is_matched: bool
    matched_transaction_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BankReconciliationCreate(BaseModel):
    bank_account_id: int
    statement_date: date
    statement_balance: Decimal
    notes: Optional[str] = None

class BankReconciliationMatchRequest(BaseModel):
    statement_line_id: int
    transaction_id: int

class BankReconciliationResponse(BaseModel):
    id: int
    bank_account_id: int
    statement_date: date
    statement_balance: Decimal
    book_balance: Decimal
    reconciled_balance: Decimal
    difference: Decimal
    status: ReconciliationStatus
    notes: Optional[str] = None
    reconciled_by_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    statement_lines: List[BankStatementLineResponse] = []

    model_config = ConfigDict(from_attributes=True)

class BankingSummaryResponse(BaseModel):
    total_liquid_cash: Decimal
    active_bank_accounts_count: int
    unreconciled_transactions_count: int
    accounts_summary: List[dict]
