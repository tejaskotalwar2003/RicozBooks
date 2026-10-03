from typing import List, Optional, Union
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.sales import Product, ProductType
from app.models.inventory import (
    InventoryMovement, InventoryMovementType, StockAdjustment, StockAdjustmentType
)
from app.schemas.inventory import (
    ProductInventoryDetail, InventoryMovementResponse,
    StockAdjustmentCreate, StockAdjustmentResponse, InventoryValuationSummary
)
from app.schemas.pagination import PaginatedResponse, paginate_or_all

from app.services.inventory_engine import (
    quantize_amount, process_stock_adjustment, record_stock_movement
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access,
    get_tenant_entity_ids, log_audit
)

router = APIRouter()


@router.get("/valuation", response_model=InventoryValuationSummary)
def get_inventory_valuation(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    products = db.query(Product).filter(
        Product.entity_id == entity_id,
        Product.is_active == True
    ).order_by(Product.name.asc()).all()

    items = []
    total_val = Decimal("0.00")
    in_stock_cnt = 0
    low_stock_cnt = 0
    out_of_stock_cnt = 0

    for p in products:
        stock = Decimal(str(p.current_stock or 0))
        min_alert = Decimal(str(p.min_stock_alert or 0))
        unit_cost = quantize_amount(p.purchase_price)
        val = quantize_amount(stock * unit_cost)
        total_val += val

        if stock <= Decimal("0.00"):
            st = "OUT_OF_STOCK"
            out_of_stock_cnt += 1
        elif stock <= min_alert:
            st = "LOW_STOCK"
            low_stock_cnt += 1
        else:
            st = "IN_STOCK"
            in_stock_cnt += 1

        items.append(
            ProductInventoryDetail(
                id=p.id,
                entity_id=p.entity_id,
                name=p.name,
                sku=p.sku,
                product_type=p.product_type,
                unit=p.unit or "PCS",
                selling_price=quantize_amount(p.selling_price),
                purchase_price=unit_cost,
                hsn_sac_code=p.hsn_sac_code,
                current_stock=stock,
                min_stock_alert=min_alert,
                total_valuation=val,
                stock_status=st,
                is_active=p.is_active
            )
        )

    return InventoryValuationSummary(
        total_products_count=len(products),
        in_stock_count=in_stock_cnt,
        low_stock_count=low_stock_cnt,
        out_of_stock_count=out_of_stock_cnt,
        total_asset_valuation=quantize_amount(total_val),
        products=items
    )


@router.get("/movements", response_model=Union[PaginatedResponse[InventoryMovementResponse], List[InventoryMovementResponse]])
def list_movements(
    entity_id: int = Query(...),
    product_id: Optional[int] = Query(None),
    movement_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    q = db.query(InventoryMovement).options(joinedload(InventoryMovement.product)).filter(
        InventoryMovement.entity_id == entity_id
    )
    if product_id:
        q = q.filter(InventoryMovement.product_id == product_id)
    if movement_type:
        q = q.filter(InventoryMovement.movement_type == movement_type.upper())

    ordered_q = q.order_by(desc(InventoryMovement.movement_date), desc(InventoryMovement.id))

    def transform_movement(m):
        return InventoryMovementResponse(
            id=m.id,
            entity_id=m.entity_id,
            product_id=m.product_id,
            product_name=m.product.name if m.product else None,
            movement_type=m.movement_type,
            movement_date=m.movement_date,
            quantity=m.quantity,
            unit_cost=m.unit_cost,
            total_cost=m.total_cost,
            reference_type=m.reference_type,
            reference_id=m.reference_id,
            batch_number=m.batch_number,
            warehouse_location=m.warehouse_location,
            notes=m.notes,
            journal_entry_id=m.journal_entry_id,
            created_at=m.created_at
        )

    return paginate_or_all(ordered_q, page=page, page_size=page_size, paginate=paginate, item_transform=transform_movement)



@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(
    adj_in: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(adj_in.entity_id, current_user, db)

    adjustment = process_stock_adjustment(
        db=db,
        entity_id=adj_in.entity_id,
        product_id=adj_in.product_id,
        adjustment_type=adj_in.adjustment_type,
        quantity=adj_in.quantity,
        unit_cost=adj_in.unit_cost,
        reason=adj_in.reason,
        warehouse_location=adj_in.warehouse_location or "Main Warehouse",
        current_user=current_user
    )

    log_audit(
        db=db,
        action="CREATE",
        record_type="StockAdjustment",
        record_id=str(adjustment.id),
        user=current_user,
        entity_id=adjustment.entity_id,
        details=f"Stock adjustment #{adjustment.adjustment_number} ({adjustment.adjustment_type.value} {adjustment.quantity})"
    )

    adj_detail = db.query(StockAdjustment).options(joinedload(StockAdjustment.product)).filter(
        StockAdjustment.id == adjustment.id
    ).first()

    return StockAdjustmentResponse(
        id=adj_detail.id,
        entity_id=adj_detail.entity_id,
        adjustment_number=adj_detail.adjustment_number,
        adjustment_date=adj_detail.adjustment_date,
        product_id=adj_detail.product_id,
        product_name=adj_detail.product.name if adj_detail.product else None,
        adjustment_type=adj_detail.adjustment_type,
        quantity=adj_detail.quantity,
        unit_cost=adj_detail.unit_cost,
        total_value=adj_detail.total_value,
        reason=adj_detail.reason,
        warehouse_location=adj_detail.warehouse_location,
        journal_entry_id=adj_detail.journal_entry_id,
        created_at=adj_detail.created_at
    )


@router.get("/adjustments", response_model=Union[PaginatedResponse[StockAdjustmentResponse], List[StockAdjustmentResponse]])
def list_adjustments(
    entity_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    q = db.query(StockAdjustment).options(joinedload(StockAdjustment.product)).filter(
        StockAdjustment.entity_id == entity_id
    ).order_by(desc(StockAdjustment.adjustment_date), desc(StockAdjustment.id))

    def transform_adjustment(a):
        return StockAdjustmentResponse(
            id=a.id,
            entity_id=a.entity_id,
            adjustment_number=a.adjustment_number,
            adjustment_date=a.adjustment_date,
            product_id=a.product_id,
            product_name=a.product.name if a.product else None,
            adjustment_type=a.adjustment_type,
            quantity=a.quantity,
            unit_cost=a.unit_cost,
            total_value=a.total_value,
            reason=a.reason,
            warehouse_location=a.warehouse_location,
            journal_entry_id=a.journal_entry_id,
            created_at=a.created_at
        )

    return paginate_or_all(q, page=page, page_size=page_size, paginate=paginate, item_transform=transform_adjustment)


