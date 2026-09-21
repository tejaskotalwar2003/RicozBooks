from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.company import Entity
from app.models.user import User
from app.models.sales import Product, ProductType
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.inventory import (
    InventoryMovement, InventoryMovementType, StockAdjustment, StockAdjustmentType
)
from app.services.accounting_engine import validate_period_open


def quantize_amount(val: Optional[Decimal]) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def generate_adjustment_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_adj = db.query(StockAdjustment).filter(
        StockAdjustment.entity_id == entity_id,
        StockAdjustment.adjustment_number.like(f"ADJ-{current_year}-%")
    ).order_by(desc(StockAdjustment.id)).first()

    if last_adj:
        match = re.search(r'ADJ-\d{4}-(\d+)', last_adj.adjustment_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"ADJ-{current_year}-{seq:04d}"


def ensure_inventory_accounts(db: Session, entity_id: int):
    """Ensures Inventory Asset (1300), COGS (5050), and Inventory Shrinkage/Loss (5800) exist."""
    asset_acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == "1300"
    ).first()
    if not asset_acc:
        asset_acc = Account(
            entity_id=entity_id,
            code="1300",
            name="Inventory Asset (Stock on Hand)",
            account_type=AccountType.ASSET,
            normal_balance=NormalBalance.DEBIT,
            currency="INR",
            description="Valuation of inventory stock on hand",
            is_active=True
        )
        db.add(asset_acc)

    shrinkage_acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == "5800"
    ).first()
    if not shrinkage_acc:
        shrinkage_acc = Account(
            entity_id=entity_id,
            code="5800",
            name="Inventory Shrinkage & Loss",
            account_type=AccountType.EXPENSE,
            normal_balance=NormalBalance.DEBIT,
            currency="INR",
            description="Losses due to damaged, expired, or unaccounted inventory",
            is_active=True
        )
        db.add(shrinkage_acc)

    gain_acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == "5850"
    ).first()
    if not gain_acc:
        gain_acc = Account(
            entity_id=entity_id,
            code="5850",
            name="Inventory Count Adjustments (Gain)",
            account_type=AccountType.REVENUE,
            normal_balance=NormalBalance.CREDIT,
            currency="INR",
            description="Adjustments for positive physical stock count variance",
            is_active=True
        )
        db.add(gain_acc)

    db.commit()
    db.refresh(asset_acc)
    db.refresh(shrinkage_acc)
    db.refresh(gain_acc)
    return asset_acc, shrinkage_acc, gain_acc


def record_stock_movement(
    db: Session,
    entity_id: int,
    product_id: int,
    movement_type: InventoryMovementType,
    quantity: Decimal,
    unit_cost: Decimal,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    user_id: Optional[int] = None,
    warehouse_location: str = "Main Warehouse",
    notes: Optional[str] = None,
    journal_entry_id: Optional[int] = None
) -> InventoryMovement:
    """Updates product stock and records an immutable inventory ledger movement."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.entity_id == entity_id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Product not found"
        )

    qty = Decimal(str(quantity))
    cost = quantize_amount(unit_cost)
    total_cost = quantize_amount(qty * cost)

    # Inflow vs Outflow
    if movement_type in [
        InventoryMovementType.PURCHASE_RECEIPT,
        InventoryMovementType.ADJUSTMENT_INCREASE,
        InventoryMovementType.INITIAL_STOCK,
        InventoryMovementType.RETURN_INWARD
    ]:
        product.current_stock = Decimal(str(product.current_stock or 0)) + qty
    else:
        product.current_stock = Decimal(str(product.current_stock or 0)) - qty

    movement = InventoryMovement(
        entity_id=entity_id,
        product_id=product.id,
        movement_type=movement_type,
        movement_date=date.today(),
        quantity=qty,
        unit_cost=cost,
        total_cost=total_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        warehouse_location=warehouse_location,
        notes=notes,
        journal_entry_id=journal_entry_id,
        created_by_id=user_id
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    db.refresh(product)
    return movement


def process_stock_adjustment(
    db: Session,
    entity_id: int,
    product_id: int,
    adjustment_type: StockAdjustmentType,
    quantity: Decimal,
    unit_cost: Decimal,
    reason: str,
    warehouse_location: str,
    current_user: User
) -> StockAdjustment:
    """
    Executes a manual inventory adjustment with balanced double-entry accounting:
    - INCREASE: Dr Inventory Asset (1300) / Cr Inventory Gain (5850)
    - DECREASE: Dr Inventory Shrinkage (5800) / Cr Inventory Asset (1300)
    """
    validate_period_open(db, entity_id, date.today())

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.entity_id == entity_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    qty = Decimal(str(quantity))
    cost = quantize_amount(unit_cost) if unit_cost > Decimal("0.00") else quantize_amount(product.purchase_price)
    total_val = quantize_amount(qty * cost)

    if qty <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be strictly positive")

    asset_acc, shrinkage_acc, gain_acc = ensure_inventory_accounts(db, entity_id)
    adj_num = generate_adjustment_number(db, entity_id)

    # 1. Balanced Journal Entry
    journal_lines = []
    if adjustment_type == StockAdjustmentType.INCREASE:
        journal_lines.append(
            JournalEntryLine(
                line_number=1,
                account_id=asset_acc.id,
                debit=total_val,
                credit=Decimal("0.00"),
                description=f"Stock Increase: {product.name} ({qty} {product.unit})"
            )
        )
        journal_lines.append(
            JournalEntryLine(
                line_number=2,
                account_id=gain_acc.id,
                debit=Decimal("0.00"),
                credit=total_val,
                description=f"Stock Adjustment Gain #{adj_num} - {reason}"
            )
        )
    else:
        journal_lines.append(
            JournalEntryLine(
                line_number=1,
                account_id=shrinkage_acc.id,
                debit=total_val,
                credit=Decimal("0.00"),
                description=f"Stock Loss/Write-off #{adj_num}: {reason}"
            )
        )
        journal_lines.append(
            JournalEntryLine(
                line_number=2,
                account_id=asset_acc.id,
                debit=Decimal("0.00"),
                credit=total_val,
                description=f"Stock Reduction: {product.name} ({qty} {product.unit})"
            )
        )

    je = JournalEntry(
        entity_id=entity_id,
        entry_number=f"JE-{adj_num}",
        entry_date=date.today(),
        description=f"Inventory Adjustment #{adj_num}: {product.name} ({adjustment_type.value})",
        reference=adj_num,
        currency="INR",
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=total_val,
        total_credit=total_val,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    for l in journal_lines:
        l.journal_entry_id = je.id
        db.add(l)

    # 2. Stock Adjustment Record
    adj = StockAdjustment(
        entity_id=entity_id,
        adjustment_number=adj_num,
        adjustment_date=date.today(),
        product_id=product.id,
        adjustment_type=adjustment_type,
        quantity=qty,
        unit_cost=cost,
        total_value=total_val,
        reason=reason,
        warehouse_location=warehouse_location,
        journal_entry_id=je.id,
        created_by_id=current_user.id
    )
    db.add(adj)

    # 3. Record Inventory Movement & Update Stock
    mov_type = (
        InventoryMovementType.ADJUSTMENT_INCREASE 
        if adjustment_type == StockAdjustmentType.INCREASE 
        else InventoryMovementType.ADJUSTMENT_DECREASE
    )
    if adjustment_type == StockAdjustmentType.INCREASE:
        product.current_stock = Decimal(str(product.current_stock or 0)) + qty
    else:
        product.current_stock = Decimal(str(product.current_stock or 0)) - qty

    mov = InventoryMovement(
        entity_id=entity_id,
        product_id=product.id,
        movement_type=mov_type,
        movement_date=date.today(),
        quantity=qty,
        unit_cost=cost,
        total_cost=total_val,
        reference_type="ADJUSTMENT",
        reference_id=adj_num,
        warehouse_location=warehouse_location,
        notes=reason,
        journal_entry_id=je.id,
        created_by_id=current_user.id
    )
    db.add(mov)

    db.commit()
    db.refresh(adj)
    db.refresh(product)
    return adj

