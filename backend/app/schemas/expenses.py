from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.models.expenses import ExpenseClaimStatus, ExpensePaymentMethod

# =========================================================================
# 1. EXPENSE CATEGORY SCHEMAS
# =========================================================================
class ExpenseCategoryBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    default_account_id: Optional[int] = None
    tax_rate_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    entity_id: int

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_account_id: Optional[int] = None
    tax_rate_percent: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    entity_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# 2. EXPENSE / EXPENSE CLAIM SCHEMAS
# =========================================================================
class ExpenseBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    category_id: Optional[int] = None
    expense_date: date
    expense_account_id: int
    payment_account_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    payment_method: ExpensePaymentMethod = ExpensePaymentMethod.BANK_TRANSFER
    subtotal: Decimal = Field(..., ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    currency: str = "INR"
    merchant_name: Optional[str] = None
    reference_number: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    is_reimbursable: bool = False
    is_billable: bool = False
    customer_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    entity_id: int

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: Optional[date] = None
    expense_account_id: Optional[int] = None
    payment_account_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    payment_method: Optional[ExpensePaymentMethod] = None
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    merchant_name: Optional[str] = None
    reference_number: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    is_reimbursable: Optional[bool] = None
    is_billable: Optional[bool] = None
    customer_id: Optional[int] = None

class ExpenseApprovalAction(BaseModel):
    action: str = Field(..., description="'APPROVE' or 'REJECT'")
    rejection_reason: Optional[str] = None

class ExpenseReimburseAction(BaseModel):
    payment_account_id: int
    bank_account_id: Optional[int] = None
    reference_number: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: int
    entity_id: int
    expense_number: str
    user_id: Optional[int] = None
    total_amount: Decimal
    status: ExpenseClaimStatus
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    journal_entry_id: Optional[int] = None
    reimbursement_journal_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested info
    category_name: Optional[str] = None
    expense_account_name: Optional[str] = None
    payment_account_name: Optional[str] = None
    submitter_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExpenseSummaryResponse(BaseModel):
    total_expenses_month: Decimal
    pending_approvals_count: int
    reimbursable_claims_total: Decimal
    posted_expenses_total: Decimal
    category_breakdown: List[dict]
