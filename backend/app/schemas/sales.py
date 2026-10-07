from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field

# =========================================================================
# 1. CUSTOMER SCHEMAS
# =========================================================================
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "India"
    payment_terms_days: int = 30
    opening_balance: Decimal = Decimal("0.00")
    currency: str = "INR"

class CustomerCreate(CustomerBase):
    entity_id: int

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    payment_terms_days: Optional[int] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(CustomerBase):
    id: int
    entity_id: int
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerLedgerEntry(BaseModel):
    id: int
    date: date
    type: str  # "INVOICE", "PAYMENT", "OPENING_BALANCE", "CREDIT_NOTE"
    reference: str
    description: str
    debit: Decimal   # Invoices increase receivable (Debit)
    credit: Decimal  # Payments decrease receivable (Credit)
    running_balance: Decimal

class CustomerStatementResponse(BaseModel):
    customer_id: int
    customer_name: str
    company_name: Optional[str]
    gstin: Optional[str]
    currency: str
    opening_balance: Decimal
    total_invoiced: Decimal
    total_paid: Decimal
    current_balance: Decimal
    statement_period: str
    entries: List[CustomerLedgerEntry]

# =========================================================================
# 2. PRODUCT / ITEM SCHEMAS
# =========================================================================
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = None
    product_type: str = "PRODUCT"
    category: Optional[str] = None
    unit: str = "PCS"
    description: Optional[str] = None
    selling_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    purchase_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    hsn_sac_code: Optional[str] = None
    tax_rate: Decimal = Field(default=Decimal("18.00"), ge=0)
    income_account_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    sales_account_id: Optional[int] = None
    purchase_account_id: Optional[int] = None
    inventory_account_id: Optional[int] = None
    track_inventory: bool = True
    opening_stock: Decimal = Field(default=Decimal("0.00"), ge=0)
    opening_stock_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    reorder_level: Decimal = Field(default=Decimal("0.00"), ge=0)
    min_stock_alert: Decimal = Field(default=Decimal("0.00"), ge=0)
    warehouse_location: Optional[str] = "Main Warehouse"
    current_stock: Decimal = Decimal("0.00")

class ProductCreate(ProductBase):
    entity_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    product_type: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    selling_price: Optional[Decimal] = Field(default=None, ge=0)
    purchase_price: Optional[Decimal] = Field(default=None, ge=0)
    hsn_sac_code: Optional[str] = None
    tax_rate: Optional[Decimal] = Field(default=None, ge=0)
    income_account_id: Optional[int] = None
    expense_account_id: Optional[int] = None
    sales_account_id: Optional[int] = None
    purchase_account_id: Optional[int] = None
    inventory_account_id: Optional[int] = None
    track_inventory: Optional[bool] = None
    opening_stock: Optional[Decimal] = Field(default=None, ge=0)
    opening_stock_rate: Optional[Decimal] = Field(default=None, ge=0)
    reorder_level: Optional[Decimal] = Field(default=None, ge=0)
    min_stock_alert: Optional[Decimal] = Field(default=None, ge=0)
    warehouse_location: Optional[str] = None
    current_stock: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProductStatusUpdate(BaseModel):
    is_active: bool

class ProductResponse(ProductBase):
    id: int
    entity_id: int
    is_active: bool
    income_account_name: Optional[str] = None
    expense_account_name: Optional[str] = None
    inventory_account_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ItemSummaryResponse(BaseModel):
    total_items: int
    inventory_tracked: int
    active_items: int
    inactive_items: int
    low_stock_items: int
    products_count: int
    services_count: int

# =========================================================================
# 3. INVOICE SCHEMAS
# =========================================================================
class InvoiceLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal = Decimal("0.00")
    discount_pct: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("18.00")

class InvoiceLineResponse(InvoiceLineCreate):
    id: int
    invoice_id: int
    taxable_amount: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    entity_id: int
    customer_id: int
    invoice_number: Optional[str] = None  # Auto-generated if omitted
    invoice_date: date
    due_date: Optional[date] = None       # Calculated from terms if omitted
    currency: Optional[str] = "INR"
    notes: Optional[str] = None
    terms: Optional[str] = None
    lines: List[InvoiceLineCreate] = Field(..., min_length=1)

class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    lines: Optional[List[InvoiceLineCreate]] = None

class InvoiceResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: date
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
    payment_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InvoiceDetailResponse(InvoiceResponse):
    lines: List[InvoiceLineResponse] = []

class PublicInvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    payment_token: str
    invoice_date: date
    due_date: date
    status: str
    subtotal: Decimal
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    currency: str
    notes: Optional[str] = None
    terms: Optional[str] = None
    
    # Entity details
    entity_name: str
    entity_legal_name: Optional[str] = None
    entity_gstin: Optional[str] = None
    entity_address: Optional[str] = None
    entity_upi_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    payment_gateway_active: bool = True
    
    # Customer details
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    
    lines: List[InvoiceLineResponse] = []

    class Config:
        from_attributes = True

class PublicInvoicePaymentRequest(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_mode: str = "UPI"  # UPI, CARD, NETBANKING
    reference_number: Optional[str] = None
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_signature: Optional[str] = None
    payer_name: Optional[str] = None
    payer_email: Optional[str] = None

class PublicInvoicePaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: int
    invoice_number: str
    amount_paid: Decimal
    remaining_balance: Decimal
    status: str
    transaction_reference: Optional[str] = None

# =========================================================================
# 4. CUSTOMER PAYMENT SCHEMAS
# =========================================================================
class CustomerPaymentCreate(BaseModel):
    entity_id: int
    customer_id: int
    invoice_id: Optional[int] = None
    payment_number: Optional[str] = None  # Auto-generated if omitted
    payment_date: date
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    payment_mode: str = "BANK_TRANSFER"
    deposit_account_id: int  # Must be a Bank (1100) or Cash (1000) account
    deposit_account_id: Optional[int] = None  # Defaults to Bank account (1100) if omitted
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class CustomerPaymentResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    payment_number: str
    payment_date: date
    amount: Decimal
    payment_mode: str
    deposit_account_id: int
    deposit_account_name: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =========================================================================
# 5. ESTIMATE / QUOTE SCHEMAS
# =========================================================================
class EstimateLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal = Decimal("0.00")
    discount_pct: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("18.00")

class EstimateLineResponse(EstimateLineCreate):
    id: int
    estimate_id: int
    taxable_amount: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class EstimateCreate(BaseModel):
    entity_id: int
    customer_id: int
    estimate_number: Optional[str] = None
    estimate_date: date
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    lines: List[EstimateLineCreate] = Field(..., min_length=1)

class EstimateResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    estimate_number: str
    estimate_date: date
    expiry_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    converted_invoice_id: Optional[int] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    lines: List[EstimateLineResponse] = []

    class Config:
        from_attributes = True

# =========================================================================
# 6. SALES ORDER SCHEMAS
# =========================================================================
class SalesOrderLineCreate(BaseModel):
    product_id: Optional[int] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal = Decimal("0.00")
    discount_pct: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("18.00")

class SalesOrderLineResponse(SalesOrderLineCreate):
    id: int
    sales_order_id: int
    taxable_amount: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True

class SalesOrderCreate(BaseModel):
    entity_id: int
    customer_id: int
    so_number: Optional[str] = None
    order_date: date
    delivery_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[SalesOrderLineCreate] = Field(..., min_length=1)

class SalesOrderResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    so_number: str
    order_date: date
    delivery_date: Optional[date] = None
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    converted_invoice_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    lines: List[SalesOrderLineResponse] = []

    class Config:
        from_attributes = True

# =========================================================================
# 7. CREDIT NOTE SCHEMAS
# =========================================================================
class CreditNoteCreate(BaseModel):
    entity_id: int
    customer_id: int
    invoice_id: Optional[int] = None
    credit_note_number: Optional[str] = None
    credit_note_date: date
    reason: str
    subtotal: Decimal
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal

class CreditNoteResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    invoice_id: Optional[int] = None
    credit_note_number: str
    credit_note_date: date
    status: str
    reason: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    journal_entry_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =========================================================================
# 8. RECURRING INVOICE SCHEMAS
# =========================================================================
class RecurringInvoiceCreate(BaseModel):
    entity_id: int
    customer_id: int
    profile_name: str
    frequency: str = "MONTHLY"
    start_date: date
    end_date: Optional[date] = None
    next_run_date: date
    auto_send: bool = True
    total_amount: Decimal
    line_items_json: str
    notes: Optional[str] = None

class RecurringInvoiceResponse(BaseModel):
    id: int
    entity_id: int
    customer_id: int
    customer_name: Optional[str] = None
    profile_name: str
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    next_run_date: date
    last_run_date: Optional[date] = None
    auto_send: bool
    is_active: bool
    total_amount: Decimal
    line_items_json: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


