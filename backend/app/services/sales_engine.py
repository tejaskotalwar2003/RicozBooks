import re
import uuid
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.sales import (
    Customer, Product, ProductType, Invoice, InvoiceLine, InvoiceStatus, 
    CustomerPayment, Estimate, EstimateLine, EstimateStatus
)
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.inventory import InventoryMovement, InventoryMovementType
from app.models.user import User
from app.services.accounting_engine import validate_period_open
from app.services.account_defaults import ensure_cogs_account
from app.services.inventory_engine import ensure_inventory_accounts

def quantize_amount(val: Decimal) -> Decimal:
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_invoice_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_inv = db.query(Invoice).filter(
        Invoice.entity_id == entity_id,
        Invoice.invoice_number.like(f"INV-{current_year}-%")
    ).order_by(desc(Invoice.id)).first()

    if last_inv:
        match = re.search(r'INV-\d{4}-(\d+)', last_inv.invoice_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"INV-{current_year}-{seq:04d}"

def generate_payment_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_pay = db.query(CustomerPayment).filter(
        CustomerPayment.entity_id == entity_id,
        CustomerPayment.payment_number.like(f"RCP-{current_year}-%")
    ).order_by(desc(CustomerPayment.id)).first()

    if last_pay:
        match = re.search(r'RCP-\d{4}-(\d+)', last_pay.payment_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"RCP-{current_year}-{seq:04d}"

def generate_estimate_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_est = db.query(Estimate).filter(
        Estimate.entity_id == entity_id,
        Estimate.estimate_number.like(f"EST-{current_year}-%")
    ).order_by(desc(Estimate.id)).first()

    if last_est:
        match = re.search(r'EST-\d{4}-(\d+)', last_est.estimate_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"EST-{current_year}-{seq:04d}"

def is_intra_state_supply(entity: Entity, customer: Customer) -> bool:
    """Intra-state if both are in the same Indian state. Otherwise inter-state (IGST)."""
    ent_state = (entity.state or "").strip().lower()
    cust_state = (customer.state or "").strip().lower()
    if not ent_state or not cust_state:
        return True  # Default to intra-state if unspecified
    return ent_state == cust_state

def get_or_create_account(
    db: Session, 
    entity_id: int, 
    code: str, 
    name: str, 
    acc_type: AccountType, 
    norm_bal: NormalBalance, 
    currency: str = "INR"
) -> Account:
    acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == code
    ).first()
    if not acc:
        acc = Account(
            entity_id=entity_id,
            code=code,
            name=name,
            account_type=acc_type,
            normal_balance=norm_bal,
            currency=currency,
            is_active=True
        )
        db.add(acc)
        db.flush()
    return acc

def post_invoice_to_general_ledger(
    db: Session,
    invoice: Invoice,
    current_user: User
) -> JournalEntry:
    """
    Finalizes an Invoice and posts the balanced double-entry transaction to General Ledger:
    1. Sales / Accounts Receivable:
       Debit: Accounts Receivable (1200) for Total Amount
       Credit: Operating Sales Revenue (4000 or Product configured Sales Account) for Taxable Amount
       Credit: CGST Output (2100) for CGST Amount (if intra-state)
       Credit: SGST Output (2110) for SGST Amount (if intra-state)
       Credit: IGST Output (2120) for IGST Amount (if inter-state)
    2. Inventory & Cost of Goods Sold (for inventory-tracked products):
       Debit: Cost of Goods Sold (5700 or Product configured COGS Account)
       Credit: Merchandise Inventory (1300 or Product configured Inventory Asset Account)
       Movement: Records InventoryMovement (SALES_DISPATCH) and updates Product current_stock.
    """
    # 1. Idempotency Check
    if invoice.journal_entry_id is not None or invoice.status in [InvoiceStatus.PAID.value, "POSTED", InvoiceStatus.SENT.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already posted to the General Ledger."
        )

    # 2. Period Lock Check
    validate_period_open(db, invoice.entity_id, invoice.invoice_date)

    # 3. Retrieve standard default accounts
    ar_acc = get_or_create_account(db, invoice.entity_id, "1200", "Accounts Receivable (AR)", AccountType.ASSET, NormalBalance.DEBIT, invoice.currency)
    default_rev_acc = get_or_create_account(db, invoice.entity_id, "4000", "Operating Sales Revenue", AccountType.REVENUE, NormalBalance.CREDIT, invoice.currency)

    # 4. Validate all lines, items, entity isolation, and stock availability
    product_map = {}
    tracked_required_qty = {}

    for line in invoice.lines:
        if line.product_id:
            if line.product_id not in product_map:
                prod = db.query(Product).filter(
                    Product.id == line.product_id,
                    Product.entity_id == invoice.entity_id
                ).with_for_update().first()
                if not prod:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Selected item #{line.product_id} not found for this company/entity."
                    )
                if not prod.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Item '{prod.name}' is inactive and cannot be posted."
                    )
                product_map[line.product_id] = prod
            else:
                prod = product_map[line.product_id]

            # Check if inventory tracking is enabled for this product
            is_tracked = bool(prod.track_inventory) and (prod.product_type in [ProductType.GOODS.value, ProductType.PRODUCT.value, "GOODS", "PRODUCT"])
            if is_tracked:
                line_qty = Decimal(str(line.quantity or 0))
                if line_qty <= Decimal("0.00"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Quantity for '{prod.name}' must be strictly positive."
                    )
                tracked_required_qty[prod.id] = tracked_required_qty.get(prod.id, Decimal("0.00")) + line_qty

    # Negative stock verification
    for prod_id, req_qty in tracked_required_qty.items():
        prod = product_map[prod_id]
        avail = Decimal(str(prod.current_stock or 0))
        if avail < req_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{prod.name}' (SKU: {prod.sku or 'N/A'}). Available: {avail}, Required: {req_qty}."
            )

    # 5. Build Balanced Journal Lines
    lines = []
    line_no = 1
    total_invoice_amt = quantize_amount(Decimal(str(invoice.total_amount)))
    total_deb = Decimal("0.00")
    total_cred = Decimal("0.00")

    # Line 1: Debit Accounts Receivable (Customer)
    lines.append(JournalEntryLine(
        line_number=line_no,
        account_id=ar_acc.id,
        description=f"Receivable from {invoice.customer.name} - Inv #{invoice.invoice_number}",
        debit=total_invoice_amt,
        credit=Decimal("0.00"),
        base_debit=total_invoice_amt,
        base_credit=Decimal("0.00")
    ))
    line_no += 1
    total_deb += total_invoice_amt

    # Sales Revenue Lines (per line or mapped account)
    rev_start_idx = len(lines)
    for line in invoice.lines:
        line_taxable = quantize_amount(Decimal(str(line.taxable_amount)))
        if line_taxable > Decimal("0.00"):
            rev_acc = default_rev_acc
            if line.product_id and line.product_id in product_map:
                p = product_map[line.product_id]
                if p.income_account_id:
                    custom_rev = db.query(Account).filter(
                        Account.id == p.income_account_id,
                        Account.entity_id == invoice.entity_id
                    ).first()
                    if custom_rev and custom_rev.is_active:
                        rev_acc = custom_rev

            lines.append(JournalEntryLine(
                line_number=line_no,
                account_id=rev_acc.id,
                description=f"Sales Revenue ({line.description}) - Inv #{invoice.invoice_number}",
                debit=Decimal("0.00"),
                credit=line_taxable,
                base_debit=Decimal("0.00"),
                base_credit=line_taxable
            ))
            line_no += 1
            total_cred += line_taxable

    # Output GST Lines
    cgst_amt = quantize_amount(Decimal(str(invoice.cgst_amount)))
    if cgst_amt > 0:
        cgst_acc = get_or_create_account(db, invoice.entity_id, "2100", "Statutory Tax / CGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=cgst_acc.id,
            description=f"Output CGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=cgst_amt,
            base_debit=Decimal("0.00"),
            base_credit=cgst_amt
        ))
        line_no += 1
        total_cred += cgst_amt

    sgst_amt = quantize_amount(Decimal(str(invoice.sgst_amount)))
    if sgst_amt > 0:
        sgst_acc = get_or_create_account(db, invoice.entity_id, "2110", "Statutory Tax / SGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=sgst_acc.id,
            description=f"Output SGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=sgst_amt,
            base_debit=Decimal("0.00"),
            base_credit=sgst_amt
        ))
        line_no += 1
        total_cred += sgst_amt

    igst_amt = quantize_amount(Decimal(str(invoice.igst_amount)))
    if igst_amt > 0:
        igst_acc = get_or_create_account(db, invoice.entity_id, "2120", "Statutory Tax / IGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=igst_acc.id,
            description=f"Output IGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=igst_amt,
            base_debit=Decimal("0.00"),
            base_credit=igst_amt
        ))
        line_no += 1
        total_cred += igst_amt

    # Rounding difference check on revenue/tax side
    sales_diff = total_invoice_amt - total_cred
    if sales_diff != Decimal("0.00") and abs(sales_diff) <= Decimal("0.05") and len(lines) > rev_start_idx:
        lines[rev_start_idx].credit += sales_diff
        lines[rev_start_idx].base_credit += sales_diff
        total_cred += sales_diff

    # 6. COGS Calculation & Inventory Movement Planning
    movements_to_record = []
    default_cogs_acc = None
    default_inv_asset_acc = None

    for line in invoice.lines:
        if line.product_id and line.product_id in product_map:
            prod = product_map[line.product_id]
            is_tracked = bool(prod.track_inventory) and (prod.product_type in [ProductType.GOODS.value, ProductType.PRODUCT.value, "GOODS", "PRODUCT"])
            if is_tracked:
                qty = Decimal(str(line.quantity))
                # Determine unit valuation cost: purchase_price if > 0 else opening_stock_rate
                if prod.purchase_price and Decimal(str(prod.purchase_price)) > Decimal("0.00"):
                    unit_cost = quantize_amount(Decimal(str(prod.purchase_price)))
                elif prod.opening_stock_rate and Decimal(str(prod.opening_stock_rate)) > Decimal("0.00"):
                    unit_cost = quantize_amount(Decimal(str(prod.opening_stock_rate)))
                else:
                    unit_cost = Decimal("0.00")

                line_cogs = quantize_amount(qty * unit_cost)

                # Determine COGS Account
                if prod.expense_account_id:
                    cogs_acc = db.query(Account).filter(
                        Account.id == prod.expense_account_id,
                        Account.entity_id == invoice.entity_id
                    ).first()
                    if not cogs_acc or not cogs_acc.is_active:
                        if default_cogs_acc is None:
                            default_cogs_acc = ensure_cogs_account(db, invoice.entity_id, invoice.currency)
                        cogs_acc = default_cogs_acc
                else:
                    if default_cogs_acc is None:
                        default_cogs_acc = ensure_cogs_account(db, invoice.entity_id, invoice.currency)
                    cogs_acc = default_cogs_acc

                # Determine Inventory Asset Account
                if prod.inventory_account_id:
                    inv_acc = db.query(Account).filter(
                        Account.id == prod.inventory_account_id,
                        Account.entity_id == invoice.entity_id
                    ).first()
                    if not inv_acc or not inv_acc.is_active:
                        if default_inv_asset_acc is None:
                            default_inv_asset_acc = ensure_inventory_accounts(db, invoice.entity_id)[0]
                        inv_acc = default_inv_asset_acc
                else:
                    if default_inv_asset_acc is None:
                        default_inv_asset_acc = ensure_inventory_accounts(db, invoice.entity_id)[0]
                    inv_acc = default_inv_asset_acc

                # Only add COGS GL lines if valuation amount > 0
                if line_cogs > Decimal("0.00"):
                    # Debit: Cost of Goods Sold (COGS)
                    lines.append(JournalEntryLine(
                        line_number=line_no,
                        account_id=cogs_acc.id,
                        description=f"COGS: {prod.name} ({qty} {prod.unit or 'PCS'} @ {unit_cost}) - Inv #{invoice.invoice_number}",
                        debit=line_cogs,
                        credit=Decimal("0.00"),
                        base_debit=line_cogs,
                        base_credit=Decimal("0.00")
                    ))
                    line_no += 1
                    total_deb += line_cogs

                    # Credit: Merchandise Inventory Asset
                    lines.append(JournalEntryLine(
                        line_number=line_no,
                        account_id=inv_acc.id,
                        description=f"Inventory Reduction: {prod.name} ({qty} {prod.unit or 'PCS'}) - Inv #{invoice.invoice_number}",
                        debit=Decimal("0.00"),
                        credit=line_cogs,
                        base_debit=Decimal("0.00"),
                        base_credit=line_cogs
                    ))
                    line_no += 1
                    total_cred += line_cogs

                movements_to_record.append((prod, qty, unit_cost, line_cogs))

    # Verify double-entry equality
    if total_deb != total_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double-entry imbalance: Total Debit ({total_deb}) != Total Credit ({total_cred})"
        )

    # 7. Create Journal Entry
    je_entry_num = f"JE-{invoice.invoice_number}"
    if db.query(JournalEntry).filter(JournalEntry.entry_number == je_entry_num).first():
        je_entry_num = f"JE-{invoice.invoice_number}-{uuid.uuid4().hex[:6].upper()}"

    je = JournalEntry(
        entity_id=invoice.entity_id,
        entry_number=je_entry_num,
        entry_date=invoice.invoice_date,
        description=f"Sales Invoice #{invoice.invoice_number} - {invoice.customer.name}",
        reference=invoice.invoice_number,
        currency=invoice.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=total_deb,
        total_credit=total_cred,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    for line_obj in lines:
        line_obj.journal_entry_id = je.id
        db.add(line_obj)

    # 8. Decrease stock and record immutable Inventory Movements
    for prod, qty, unit_cost, line_cogs in movements_to_record:
        prod.current_stock = Decimal(str(prod.current_stock or 0)) - qty
        mov = InventoryMovement(
            entity_id=invoice.entity_id,
            product_id=prod.id,
            movement_type=InventoryMovementType.SALES_DISPATCH,
            movement_date=invoice.invoice_date,
            quantity=qty,
            unit_cost=unit_cost,
            total_cost=line_cogs,
            reference_type="INVOICE",
            reference_id=invoice.invoice_number,
            warehouse_location=prod.warehouse_location or "Main Warehouse",
            notes=f"Sales Dispatch for Invoice #{invoice.invoice_number} ({qty} {prod.unit or 'PCS'})",
            journal_entry_id=je.id,
            created_by_id=current_user.id
        )
        db.add(mov)

    # 9. Update Invoice and Customer Balance
    invoice.journal_entry_id = je.id
    invoice.status = InvoiceStatus.SENT.value if invoice.paid_amount == 0 else (InvoiceStatus.PAID.value if invoice.balance_amount == 0 else InvoiceStatus.PARTIALLY_PAID.value)

    customer = invoice.customer
    customer.current_balance = quantize_amount(Decimal(str(customer.current_balance or 0)) + total_invoice_amt)

    db.commit()
    db.refresh(invoice)
    db.refresh(customer)
    return je

def record_customer_payment_transaction(
    db: Session,
    payment_in: CustomerPayment,
    current_user: Optional[User] = None
) -> CustomerPayment:
    """
    Records customer payment received, decrements invoice balance, updates customer ledger,
    and creates balanced General Ledger transaction:
    Debit: Bank Account (1100) or Cash (1000) for payment amount
    Credit: Accounts Receivable (1200) for payment amount
    """
    pay_amt = quantize_amount(Decimal(str(payment_in.amount)))
    if pay_amt <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero."
        )

    # Validate deposit account
    deposit_acc = db.query(Account).filter(Account.id == payment_in.deposit_account_id).first()
    if not deposit_acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit bank/cash account not found."
        )

    # Period Lock Check
    validate_period_open(db, payment_in.entity_id, payment_in.payment_date)

    ar_acc = get_or_create_account(db, payment_in.entity_id, "1200", "Accounts Receivable (AR)", AccountType.ASSET, NormalBalance.DEBIT, deposit_acc.currency)

    creator_id = current_user.id if current_user else None
    if not creator_id and payment_in.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == payment_in.invoice_id).first()
        if inv and inv.created_by_id:
            creator_id = inv.created_by_id
    if not creator_id:
        admin_u = db.query(User).filter(User.is_active == True).first()
        if admin_u:
            creator_id = admin_u.id

    # Balanced Double-Entry lines
    pay_entry_num = f"JE-{payment_in.payment_number}"
    if db.query(JournalEntry).filter(JournalEntry.entry_number == pay_entry_num).first():
        pay_entry_num = f"JE-{payment_in.payment_number}-{uuid.uuid4().hex[:6].upper()}"

    je = JournalEntry(
        entity_id=payment_in.entity_id,
        entry_number=pay_entry_num,
        entry_date=payment_in.payment_date,
        description=f"Customer Payment #{payment_in.payment_number} from {payment_in.customer.name}",
        reference=payment_in.reference_number or payment_in.payment_number,
        currency=deposit_acc.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=pay_amt,
        total_credit=pay_amt,
        created_by_id=creator_id,
        posted_by_id=creator_id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    # Line 1: Debit Bank/Cash
    l1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=deposit_acc.id,
        description=f"Deposit from {payment_in.customer.name} - Ref: {payment_in.reference_number or payment_in.payment_number}",
        debit=pay_amt,
        credit=Decimal("0.00"),
        base_debit=pay_amt,
        base_credit=Decimal("0.00")
    )
    # Line 2: Credit Accounts Receivable
    l2 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=ar_acc.id,
        description=f"Settlement of AR - {payment_in.customer.name}",
        debit=Decimal("0.00"),
        credit=pay_amt,
        base_debit=Decimal("0.00"),
        base_credit=pay_amt
    )
    db.add(l1)
    db.add(l2)

    payment_in.journal_entry_id = je.id

    # If linked to specific invoice, update invoice paid & balance amount
    if payment_in.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == payment_in.invoice_id).first()
        if inv:
            inv.paid_amount = quantize_amount(Decimal(str(inv.paid_amount or 0)) + pay_amt)
            inv.balance_amount = max(Decimal("0.00"), quantize_amount(Decimal(str(inv.total_amount)) - inv.paid_amount))
            if inv.balance_amount == Decimal("0.00"):
                inv.status = InvoiceStatus.PAID.value
            else:
                inv.status = InvoiceStatus.PARTIALLY_PAID.value

    # Update Customer Balance
    customer = payment_in.customer
    customer.current_balance = max(Decimal("0.00"), quantize_amount(Decimal(str(customer.current_balance or 0)) - pay_amt))

    db.commit()
    db.refresh(payment_in)
    db.refresh(customer)
    return payment_in

