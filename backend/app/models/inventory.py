import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, 
    Enum, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class InventoryMovementType(str, enum.Enum):
    PURCHASE_RECEIPT = "PURCHASE_RECEIPT"
    SALES_DISPATCH = "SALES_DISPATCH"
    ADJUSTMENT_INCREASE = "ADJUSTMENT_INCREASE"
    ADJUSTMENT_DECREASE = "ADJUSTMENT_DECREASE"
    INITIAL_STOCK = "INITIAL_STOCK"
    RETURN_INWARD = "RETURN_INWARD"
    RETURN_OUTWARD = "RETURN_OUTWARD"


class StockAdjustmentType(str, enum.Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(Enum(InventoryMovementType), nullable=False, index=True)
    movement_date = Column(Date, nullable=False, default=date.today, index=True)
    
    quantity = Column(Numeric(12, 2), nullable=False) # strictly positive; movement_type determines sign
    unit_cost = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total_cost = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    
    reference_type = Column(String(50), nullable=True) # BILL, INVOICE, ADJUSTMENT, INITIAL
    reference_id = Column(String(100), nullable=True)  # BILL-2026-0001, etc.
    batch_number = Column(String(100), nullable=True)
    warehouse_location = Column(String(100), nullable=True, default="Main Warehouse")
    notes = Column(Text, nullable=True)
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    product = relationship("Product")
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    adjustment_number = Column(String(50), nullable=False, index=True)
    adjustment_date = Column(Date, nullable=False, default=date.today)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    adjustment_type = Column(Enum(StockAdjustmentType), nullable=False)
    
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_cost = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total_value = Column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    
    reason = Column(String(255), nullable=False) # e.g. Physical Count Variance, Damaged Goods, Shrinkage
    warehouse_location = Column(String(100), nullable=True, default="Main Warehouse")
    
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    product = relationship("Product")
    journal_entry = relationship("JournalEntry")
    created_by = relationship("User")

