from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.models.inventory import InventoryMovementType, StockAdjustmentType

class ProductInventoryDetail(BaseModel):
    id: int
    entity_id: int
    name: str
    sku: Optional[str] = None
    product_type: str
    unit: str
    selling_price: Decimal
    purchase_price: Decimal
    hsn_sac_code: Optional[str] = None
    current_stock: Decimal
    min_stock_alert: Decimal
    total_valuation: Decimal
    stock_status: str # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class InventoryMovementResponse(BaseModel):
    id: int
    entity_id: int
    product_id: int
    product_name: Optional[str] = None
    movement_type: InventoryMovementType
    movement_date: date
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    batch_number: Optional[str] = None
    warehouse_location: Optional[str] = None
    notes: Optional[str] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StockAdjustmentCreate(BaseModel):
    entity_id: int
    product_id: int
    adjustment_type: StockAdjustmentType
    quantity: Decimal = Field(..., gt=0)
    unit_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    reason: str = Field(..., min_length=3, max_length=255)
    warehouse_location: Optional[str] = "Main Warehouse"

class StockAdjustmentResponse(BaseModel):
    id: int
    entity_id: int
    adjustment_number: str
    adjustment_date: date
    product_id: int
    product_name: Optional[str] = None
    adjustment_type: StockAdjustmentType
    quantity: Decimal
    unit_cost: Decimal
    total_value: Decimal
    reason: str
    warehouse_location: Optional[str] = None
    journal_entry_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InventoryValuationSummary(BaseModel):
    total_products_count: int
    in_stock_count: int
    low_stock_count: int
    out_of_stock_count: int
    total_asset_valuation: Decimal
    products: List[ProductInventoryDetail]

