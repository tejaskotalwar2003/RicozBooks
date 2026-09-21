from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field

# =========================================================================
# 1. VENDOR SCHEMAS
# =========================================================================
class VendorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "India"
    payment_terms_days: int = 30
    opening_balance: Decimal = Decimal("0.00")
    currency: str = "INR"
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None

class VendorCreate(VendorBase):
    entity_id: int

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    payment_terms_days: Optional[int] = None
    currency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    is_active: Optional[bool] = None

class VendorResponse(VendorBase):
    id: int
    entity_id: int
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VendorLedgerEntry(BaseModel):
    id: int
    date: date
    type: str  # "BILL", "PAYMENT", "OPENING_BALANCE", "DEBIT_NOTE"
    reference: str
    description: str
    debit: Decimal   # Payments & Debit Notes reduce payable (Debit)
    credit: Decimal  # Bills increase payable (Credit)
    running_balance: Decimal

class VendorStatementResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    currency: str
    opening_balance: Decimal
    total_billed: Decimal
    total_paid: Decimal
    current_balance: Decimal
    statement_period: str
    entries: List[VendorLedgerEntry]

# =========================================================================
# 2. PURCHASE ORDER SCHEMAS
# =========================================================================
class PurchaseOrderLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Field(..., gt=Decimal("0.00"))
    unit: str = "PCS"
    unit_price: Decimal = Field(..., ge=Decimal("0.00"))
    discount_pct: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("18.00")

class PurchaseOrderLineResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    discount_pct: Decimal
    taxable_amount: Decimal
    tax_rate: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    entity_id: int
    vendor_id: int
    po_number: Optional[str] = None
    order_date: date
    delivery_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    lines: List[PurchaseOrderLineCreate]

class PurchaseOrderResponse(BaseModel):
    id: int
    entity_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    po_number: str
    order_date: date
    delivery_date: Optional[date] = None
    status: str
    subtotal: Decimal
    taxable_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    converted_bill_id: Optional[int] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseOrderDetailResponse(PurchaseOrderResponse):
    lines: List[PurchaseOrderLineResponse] = []

# =========================================================================
# 3. VENDOR BILL SCHEMAS
# =========================================================================
class BillLineCreate(BaseModel):
    product_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Field(..., gt=Decimal("0.00"))
    unit: str = "PCS"
    unit_price: Decimal = Field(..., ge=Decimal("0.00"))
    discount_pct: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("18.00")

class BillLineResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    discount_pct: Decimal
    taxable_amount: Decimal
    tax_rate: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class BillCreate(BaseModel):
    entity_id: int
    vendor_id: int
    bill_number: Optional[str] = None
    vendor_invoice_ref: Optional[str] = None
    bill_date: date
    due_date: date
    supply_state: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    lines: List[BillLineCreate]

class BillUpdate(BaseModel):
    vendor_invoice_ref: Optional[str] = None
    bill_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None

class BillResponse(BaseModel):
    id: int
    entity_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    bill_number: str
    vendor_invoice_ref: Optional[str] = None
    bill_date: date
    due_date: date
    supply_state: Optional[str] = None
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    currency: str
    journal_entry_id: Optional[int] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BillDetailResponse(BillResponse):
    lines: List[BillLineResponse] = []

# =========================================================================
# 4. VENDOR PAYMENT SCHEMAS
# =========================================================================
class VendorPaymentCreate(BaseModel):
    entity_id: int
    vendor_id: int
    bill_id: Optional[int] = None
    payment_number: Optional[str] = None
    payment_date: date
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_mode: str = "BANK_TRANSFER"
    disbursement_account_id: Optional[int] = None  # Defaults to Bank account (1100) if omitted
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class VendorPaymentResponse(BaseModel):
    id: int
    entity_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    bill_id: Optional[int] = None
    bill_number: Optional[str] = None
    payment_number: str
    payment_date: date
    amount: Decimal
    payment_mode: str
    disbursement_account_id: int
    disbursement_account_name: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =========================================================================
# 5. DEBIT NOTE SCHEMAS
# =========================================================================
class DebitNoteCreate(BaseModel):
    entity_id: int
    vendor_id: int
    bill_id: Optional[int] = None
    note_number: Optional[str] = None
    note_date: date
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    reason: str

class DebitNoteResponse(BaseModel):
    id: int
    entity_id: int
    vendor_id: int
    vendor_name: Optional[str] = None
    bill_id: Optional[int] = None
    note_number: str
    note_date: date
    amount: Decimal
    reason: str
    journal_entry_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

