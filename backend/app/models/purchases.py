from datetime import datetime, date
from decimal import Decimal
import enum
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship

from app.database.session import Base

class BillStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    RECEIVED = "RECEIVED"
    POSTED = "POSTED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    BILLED = "BILLED"
    CANCELLED = "CANCELLED"

class VendorPaymentMode(str, enum.Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    UPI = "UPI"
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    OTHER = "OTHER"

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(200), nullable=False, index=True)
    company_name = Column(String(200), nullable=True)
    email = Column(String(100), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    
    gstin = Column(String(20), nullable=True, index=True)
    pan = Column(String(20), nullable=True, index=True)
    
    billing_address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="India", nullable=False)
    
    payment_terms_days = Column(Integer, default=30, nullable=False)
    opening_balance = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    current_balance = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)  # Net AP due
    currency = Column(String(3), default="INR", nullable=False)
    
    bank_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    bills = relationship("Bill", back_populates="vendor", cascade="all, delete-orphan")
    payments = relationship("VendorPayment", back_populates="vendor", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor", cascade="all, delete-orphan")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    po_number = Column(String(50), nullable=False, unique=True, index=True)
    order_date = Column(Date, default=date.today, nullable=False)
    delivery_date = Column(Date, nullable=True)
    status = Column(String(50), default=POStatus.DRAFT.value, nullable=False)
    
    subtotal = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_tax = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    converted_bill_id = Column(Integer, nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vendor = relationship("Vendor", back_populates="purchase_orders")
    lines = relationship("PurchaseOrderLine", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    description = Column(String(255), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(15, 2), default=Decimal("1.00"), nullable=False)
    unit = Column(String(20), default="PCS", nullable=False)
    unit_price = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    discount_pct = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    total_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="lines")
    product = relationship("Product")

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    bill_number = Column(String(50), nullable=False, unique=True, index=True)
    vendor_invoice_ref = Column(String(100), nullable=True)  # Vendor's actual invoice #
    bill_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    supply_state = Column(String(100), nullable=True)
    
    status = Column(String(50), default=BillStatus.DRAFT.value, nullable=False)
    
    subtotal = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    discount_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    cgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    igst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_tax = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    total_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    paid_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    balance_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    currency = Column(String(3), default="INR", nullable=False)
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    vendor = relationship("Vendor", back_populates="bills")
    lines = relationship("BillLine", back_populates="bill", cascade="all, delete-orphan")
    journal_entry = relationship("JournalEntry")
    payments = relationship("VendorPayment", back_populates="bill")

class BillLine(Base):
    __tablename__ = "bill_lines"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    expense_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    
    description = Column(String(255), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(15, 2), default=Decimal("1.00"), nullable=False)
    unit = Column(String(20), default="PCS", nullable=False)
    unit_price = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    discount_pct = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    
    taxable_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    
    cgst_rate = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    sgst_rate = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    igst_rate = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    igst_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    total_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)

    bill = relationship("Bill", back_populates="lines")
    product = relationship("Product")
    expense_account = relationship("Account")

class VendorPayment(Base):
    __tablename__ = "vendor_payments"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="SET NULL"), nullable=True, index=True)
    
    payment_number = Column(String(50), nullable=False, unique=True, index=True)
    payment_date = Column(Date, default=date.today, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    payment_mode = Column(String(50), default=VendorPaymentMode.BANK_TRANSFER.value, nullable=False)
    
    disbursement_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    reference_number = Column(String(100), nullable=True)  # Cheque # / UTR
    notes = Column(Text, nullable=True)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    vendor = relationship("Vendor", back_populates="payments")
    bill = relationship("Bill", back_populates="payments")
    disbursement_account = relationship("Account")
    journal_entry = relationship("JournalEntry")

class DebitNote(Base):
    __tablename__ = "debit_notes"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="SET NULL"), nullable=True, index=True)
    
    note_number = Column(String(50), nullable=False, unique=True, index=True)
    note_date = Column(Date, default=date.today, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    reason = Column(String(255), nullable=False)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vendor = relationship("Vendor")
    bill = relationship("Bill")
    journal_entry = relationship("JournalEntry")

