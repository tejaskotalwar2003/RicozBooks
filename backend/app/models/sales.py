import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, 
    Numeric, Text, Enum
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class ProductType(str, enum.Enum):
    GOODS = "GOODS"
    SERVICE = "SERVICE"

class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class EstimateStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CONVERTED = "CONVERTED"

class PaymentMode(str, enum.Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    CASH = "CASH"
    CARD = "CARD"

class SalesOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    INVOICED = "INVOICED"
    CANCELLED = "CANCELLED"

class RecurringFrequency(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUALLY = "ANNUALLY"

class CreditNoteStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"

# =========================================================================
# 1. CUSTOMER MASTER
# =========================================================================
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    company_name = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    gstin = Column(String(50), nullable=True, index=True)
    pan = Column(String(20), nullable=True)
    billing_address = Column(Text, nullable=True)
    shipping_address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="India")
    payment_terms_days = Column(Integer, default=30)
    opening_balance = Column(Numeric(15, 2), default=0.00)
    current_balance = Column(Numeric(15, 2), default=0.00)
    currency = Column(String(10), default="INR")
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    invoices = relationship("Invoice", back_populates="customer")

# =========================================================================
# 2. PRODUCT & SERVICE CATALOG
# =========================================================================
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    sku = Column(String(50), nullable=True, index=True)
    product_type = Column(String(20), default=ProductType.GOODS.value)
    unit = Column(String(30), default="PCS")
    selling_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    purchase_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    hsn_sac_code = Column(String(20), nullable=True)
    tax_rate = Column(Numeric(5, 2), default=18.00, nullable=False)
    
    income_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    expense_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    
    current_stock = Column(Numeric(12, 2), default=0.00)
    min_stock_alert = Column(Numeric(12, 2), default=0.00)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    income_account = relationship("Account", foreign_keys=[income_account_id])
    expense_account = relationship("Account", foreign_keys=[expense_account_id])

# =========================================================================
# 3. SALES INVOICE & LINES
# =========================================================================
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    invoice_number = Column(String(50), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(30), default=InvoiceStatus.DRAFT.value, nullable=False, index=True)
    
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_tax = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    balance_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    currency = Column(String(10), default="INR")
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    payment_token = Column(String(64), unique=True, index=True, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("CustomerPayment", back_populates="invoice")
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 2), default=1.00, nullable=False)
    unit_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_pct = Column(Numeric(5, 2), default=0.00)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=18.00, nullable=False)
    cgst_rate = Column(Numeric(5, 2), default=0.00)
    cgst_amount = Column(Numeric(15, 2), default=0.00)
    sgst_rate = Column(Numeric(5, 2), default=0.00)
    sgst_amount = Column(Numeric(15, 2), default=0.00)
    igst_rate = Column(Numeric(5, 2), default=0.00)
    igst_amount = Column(Numeric(15, 2), default=0.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")

# =========================================================================
# 4. CUSTOMER PAYMENTS (RECEIPTS)
# =========================================================================
class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    payment_number = Column(String(50), nullable=False, index=True)
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    payment_mode = Column(String(30), default=PaymentMode.BANK_TRANSFER.value)
    deposit_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")
    invoice = relationship("Invoice", back_populates="payments")
    deposit_account = relationship("Account")
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")

# =========================================================================
# 5. ESTIMATES / QUOTES
# =========================================================================
class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    estimate_number = Column(String(50), nullable=False, index=True)
    estimate_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(String(30), default=EstimateStatus.DRAFT.value, nullable=False)
    
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0.00)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_tax = Column(Numeric(15, 2), default=0.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    
    converted_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")
    lines = relationship("EstimateLine", back_populates="estimate", cascade="all, delete-orphan")
    converted_invoice = relationship("Invoice")
    created_by = relationship("User")

class EstimateLine(Base):
    __tablename__ = "estimate_lines"

    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 2), default=1.00, nullable=False)
    unit_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_pct = Column(Numeric(5, 2), default=0.00)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=18.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)

    estimate = relationship("Estimate", back_populates="lines")
    product = relationship("Product")

# =========================================================================
# 6. SALES ORDERS
# =========================================================================
class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    so_number = Column(String(50), nullable=False, index=True)
    order_date = Column(Date, nullable=False)
    delivery_date = Column(Date, nullable=True)
    status = Column(String(30), default=SalesOrderStatus.DRAFT.value, nullable=False)
    
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0.00)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_tax = Column(Numeric(15, 2), default=0.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    
    converted_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")
    lines = relationship("SalesOrderLine", back_populates="sales_order", cascade="all, delete-orphan")
    converted_invoice = relationship("Invoice")
    created_by = relationship("User")

class SalesOrderLine(Base):
    __tablename__ = "sales_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 2), default=1.00, nullable=False)
    unit_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount_pct = Column(Numeric(5, 2), default=0.00)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=18.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)

    sales_order = relationship("SalesOrder", back_populates="lines")
    product = relationship("Product")

# =========================================================================
# 7. RECURRING INVOICES
# =========================================================================
class RecurringInvoice(Base):
    __tablename__ = "recurring_invoices"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    profile_name = Column(String(100), nullable=False)
    frequency = Column(String(30), default=RecurringFrequency.MONTHLY.value, nullable=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_run_date = Column(Date, nullable=False)
    last_run_date = Column(Date, nullable=True)
    
    auto_send = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    line_items_json = Column(Text, nullable=False)  # serialized line items
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")

# =========================================================================
# 8. CREDIT NOTES (SALES RETURNS & AR REDUCTIONS)
# =========================================================================
class CreditNote(Base):
    __tablename__ = "credit_notes"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    
    credit_note_number = Column(String(50), nullable=False, unique=True, index=True)
    credit_note_date = Column(Date, nullable=False)
    status = Column(String(30), default=CreditNoteStatus.POSTED.value, nullable=False)
    
    reason = Column(String(255), nullable=False)  # Sales return, pricing error, post-sale discount
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")
    invoice = relationship("Invoice")
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")
    lines = relationship("CreditNoteLine", back_populates="credit_note", cascade="all, delete-orphan")

class CreditNoteLine(Base):
    __tablename__ = "credit_note_lines"

    id = Column(Integer, primary_key=True, index=True)
    credit_note_id = Column(Integer, ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(12, 2), default=1.00, nullable=False)
    unit_price = Column(Numeric(15, 2), default=0.00, nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=18.00)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)

    credit_note = relationship("CreditNote", back_populates="lines")
    product = relationship("Product")


