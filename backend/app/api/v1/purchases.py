from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.purchases import (
    Vendor, PurchaseOrder, PurchaseOrderLine, POStatus,
    Bill, BillLine, BillStatus, VendorPayment, DebitNote
)
from app.schemas.purchases import (
    VendorCreate, VendorUpdate, VendorResponse,
    VendorLedgerEntry, VendorStatementResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderDetailResponse,
    BillCreate, BillUpdate, BillResponse, BillDetailResponse,
    VendorPaymentCreate, VendorPaymentResponse,
    DebitNoteCreate, DebitNoteResponse
)
from app.services.purchase_engine import (
    quantize_amount, generate_po_number, generate_bill_number,
    generate_vendor_payment_number, generate_debit_note_number,
    is_intra_state_purchase, post_bill_to_general_ledger,
    record_vendor_payment_transaction, get_or_create_account
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access,
    get_tenant_entity_ids, log_audit
)

router = APIRouter()

# =========================================================================
# 1. VENDORS
# =========================================================================
@router.get("/vendors", response_model=List[VendorResponse])
def get_vendors(
    entity_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Vendor)
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Vendor.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Vendor.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Vendor.entity_id == current_user.default_entity_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Vendor.name.ilike(s)) | (Vendor.company_name.ilike(s)) |
            (Vendor.email.ilike(s)) | (Vendor.gstin.ilike(s))
        )

    return query.order_by(Vendor.name.asc()).all()

@router.post("/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    ven_in: VendorCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(ven_in.entity_id, current_user, db)

    vendor = Vendor(
        entity_id=ven_in.entity_id,
        name=ven_in.name.strip(),
        company_name=ven_in.company_name.strip() if ven_in.company_name else None,
        email=ven_in.email.strip() if ven_in.email else None,
        phone=ven_in.phone.strip() if ven_in.phone else None,
        gstin=ven_in.gstin.strip().upper() if ven_in.gstin else None,
        pan=ven_in.pan.strip().upper() if ven_in.pan else None,
        billing_address=ven_in.billing_address,
        city=ven_in.city,
        state=ven_in.state,
        postal_code=ven_in.postal_code,
        country=ven_in.country,
        payment_terms_days=ven_in.payment_terms_days,
        opening_balance=ven_in.opening_balance,
        current_balance=ven_in.opening_balance,
        currency=ven_in.currency,
        bank_name=ven_in.bank_name,
        bank_account_number=ven_in.bank_account_number,
        bank_ifsc=ven_in.bank_ifsc
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    log_audit(
        db=db,
        action="VENDOR_CREATED",
        record_type="Vendor",
        record_id=str(vendor.id),
        user=current_user,
        entity_id=vendor.entity_id,
        details=f"Created vendor {vendor.name} (GSTIN: {vendor.gstin or 'None'})"
    )
    return vendor

@router.get("/vendors/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    verify_entity_access(vendor.entity_id, current_user, db)
    return vendor

@router.put("/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    ven_in: VendorUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    verify_entity_access(vendor.entity_id, current_user, db)

    for field, val in ven_in.model_dump(exclude_unset=True).items():
        setattr(vendor, field, val)

    db.commit()
    db.refresh(vendor)
    return vendor

@router.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    verify_entity_access(vendor.entity_id, current_user, db)

    vendor.is_active = False
    db.commit()
    return {"message": f"Vendor '{vendor.name}' archived successfully"}

@router.get("/vendors/{vendor_id}/statement", response_model=VendorStatementResponse)
@router.get("/vendors/{vendor_id}/ledger", response_model=VendorStatementResponse)
def get_vendor_ledger_statement(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    verify_entity_access(vendor.entity_id, current_user, db)

    bills = db.query(Bill).filter(
        Bill.vendor_id == vendor_id,
        Bill.status != BillStatus.CANCELLED.value
    ).order_by(Bill.bill_date.asc(), Bill.id.asc()).all()

    payments = db.query(VendorPayment).filter(
        VendorPayment.vendor_id == vendor_id
    ).order_by(VendorPayment.payment_date.asc(), VendorPayment.id.asc()).all()

    timeline = []
    op_bal = quantize_amount(Decimal(str(vendor.opening_balance or 0)))
    if op_bal > 0:
        timeline.append({
            "date": vendor.created_at.date(),
            "type": "OPENING_BALANCE",
            "ref": "OP-BAL",
            "desc": "Opening Balance B/F",
            "debit": Decimal("0.00"),
            "credit": op_bal,
            "sort_key": f"{vendor.created_at.date()}-0"
        })

    for b in bills:
        tot = quantize_amount(Decimal(str(b.total_amount)))
        timeline.append({
            "date": b.bill_date,
            "type": "BILL",
            "ref": b.bill_number,
            "desc": f"Vendor Bill #{b.bill_number} (Ref: {b.vendor_invoice_ref or 'Direct'})",
            "debit": Decimal("0.00"),
            "credit": tot,
            "sort_key": f"{b.bill_date}-1-{b.id}"
        })

    for p in payments:
        amt = quantize_amount(Decimal(str(p.amount)))
        timeline.append({
            "date": p.payment_date,
            "type": "PAYMENT",
            "ref": p.payment_number,
            "desc": f"Disbursement #{p.payment_number} ({p.payment_mode})",
            "debit": amt,
            "credit": Decimal("0.00"),
            "sort_key": f"{p.payment_date}-2-{p.id}"
        })

    timeline.sort(key=lambda x: x["sort_key"])

    entries: List[VendorLedgerEntry] = []
    tot_billed = Decimal("0.00")
    tot_paid = Decimal("0.00")
    running_bal = Decimal("0.00")

    for idx, item in enumerate(timeline, start=1):
        dr = item["debit"]
        cr = item["credit"]
        running_bal = running_bal + cr - dr
        if item["type"] == "BILL":
            tot_billed += cr
        elif item["type"] == "PAYMENT":
            tot_paid += dr
        elif item["type"] == "OPENING_BALANCE":
            tot_billed += cr

        entries.append(VendorLedgerEntry(
            id=idx,
            date=item["date"],
            type=item["type"],
            reference=item["ref"],
            description=item["desc"],
            debit=dr,
            credit=cr,
            running_balance=running_bal
        ))

    return VendorStatementResponse(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        company_name=vendor.company_name,
        gstin=vendor.gstin,
        currency=vendor.currency,
        opening_balance=quantize_amount(Decimal(str(vendor.opening_balance or 0))),
        total_billed=tot_billed,
        total_paid=tot_paid,
        current_balance=quantize_amount(Decimal(str(vendor.current_balance or 0))),
        statement_period="All Time",
        entries=entries
    )

# =========================================================================
# 2. PURCHASE ORDERS
# =========================================================================
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    entity_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.vendor))
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(PurchaseOrder.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(PurchaseOrder.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(PurchaseOrder.entity_id == current_user.default_entity_id)

    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)

    pos = query.order_by(desc(PurchaseOrder.order_date), desc(PurchaseOrder.id)).all()
    results = []
    for po in pos:
        res = PurchaseOrderResponse.model_validate(po, from_attributes=True)
        if po.vendor:
            res.vendor_name = po.vendor.name
        results.append(res)
    return results

@router.post("/purchase-orders", response_model=PurchaseOrderDetailResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(po_in.entity_id, current_user, db)

    vendor = db.query(Vendor).filter(Vendor.id == po_in.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    po_number = po_in.po_number or generate_po_number(db, po_in.entity_id)

    subtot = Decimal("0.00")
    lines = []
    for l_in in po_in.lines:
        qty = quantize_amount(l_in.quantity)
        price = quantize_amount(l_in.unit_price)
        disc_pct = quantize_amount(l_in.discount_pct)
        tax_rate = quantize_amount(l_in.tax_rate)

        l_sub = quantize_amount(qty * price)
        disc_amt = quantize_amount((l_sub * disc_pct) / Decimal("100.0"))
        l_taxable = quantize_amount(l_sub - disc_amt)
        tax_amt = quantize_amount((l_taxable * tax_rate) / Decimal("100.0"))
        l_tot = quantize_amount(l_taxable + tax_amt)

        subtot += l_sub
        lines.append(PurchaseOrderLine(
            product_id=l_in.product_id,
            description=l_in.description.strip(),
            hsn_sac=l_in.hsn_sac,
            quantity=qty,
            unit=l_in.unit,
            unit_price=price,
            discount_pct=disc_pct,
            taxable_amount=l_taxable,
            tax_rate=tax_rate,
            total_amount=l_tot
        ))

    tot_amount = sum(l.total_amount for l in lines)
    tot_taxable = sum(l.taxable_amount for l in lines)

    po = PurchaseOrder(
        entity_id=po_in.entity_id,
        vendor_id=po_in.vendor_id,
        po_number=po_number,
        order_date=po_in.order_date,
        delivery_date=po_in.delivery_date,
        status=POStatus.DRAFT.value,
        subtotal=subtot,
        taxable_amount=tot_taxable,
        total_tax=tot_amount - tot_taxable,
        total_amount=tot_amount,
        notes=po_in.notes,
        terms=po_in.terms,
        created_by_id=current_user.id,
        lines=lines
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    res = PurchaseOrderDetailResponse.model_validate(po, from_attributes=True)
    res.vendor_name = vendor.name
    return res

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailResponse)
def get_purchase_order_detail(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.lines)
    ).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    verify_entity_access(po.entity_id, current_user, db)

    res = PurchaseOrderDetailResponse.model_validate(po, from_attributes=True)
    if po.vendor:
        res.vendor_name = po.vendor.name
    return res

@router.post("/purchase-orders/{po_id}/convert-to-bill", response_model=BillDetailResponse)
@router.post("/purchase-orders/{po_id}/convert", response_model=BillDetailResponse)
def convert_po_to_bill(
    po_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.lines)
    ).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    verify_entity_access(po.entity_id, current_user, db)

    entity = db.query(Entity).filter(Entity.id == po.entity_id).first()
    is_intra = is_intra_state_purchase(entity, po.vendor)

    bill_lines = []
    cgst_tot = Decimal("0.00")
    sgst_tot = Decimal("0.00")
    igst_tot = Decimal("0.00")

    for pl in po.lines:
        t_rate = quantize_amount(pl.tax_rate)
        t_amt = quantize_amount(pl.taxable_amount)
        if is_intra:
            c_r = quantize_amount(t_rate / Decimal("2.0"))
            s_r = quantize_amount(t_rate / Decimal("2.0"))
            i_r = Decimal("0.00")
            c_a = quantize_amount((t_amt * c_r) / Decimal("100.0"))
            s_a = quantize_amount((t_amt * s_r) / Decimal("100.0"))
            i_a = Decimal("0.00")
        else:
            c_r = Decimal("0.00")
            s_r = Decimal("0.00")
            i_r = t_rate
            c_a = Decimal("0.00")
            s_a = Decimal("0.00")
            i_a = quantize_amount((t_amt * i_r) / Decimal("100.0"))

        cgst_tot += c_a
        sgst_tot += s_a
        igst_tot += i_a

        bill_lines.append(BillLine(
            product_id=pl.product_id,
            description=pl.description,
            hsn_sac=pl.hsn_sac,
            quantity=pl.quantity,
            unit=pl.unit,
            unit_price=pl.unit_price,
            discount_pct=pl.discount_pct,
            taxable_amount=pl.taxable_amount,
            tax_rate=t_rate,
            cgst_rate=c_r,
            cgst_amount=c_a,
            sgst_rate=s_r,
            sgst_amount=s_a,
            igst_rate=i_r,
            igst_amount=i_a,
            total_amount=pl.taxable_amount + c_a + s_a + i_a
        ))

    total_tax = cgst_tot + sgst_tot + igst_tot
    grand_total = po.taxable_amount + total_tax

    bill = Bill(
        entity_id=po.entity_id,
        vendor_id=po.vendor_id,
        bill_number=generate_bill_number(db, po.entity_id),
        vendor_invoice_ref=f"PO Ref #{po.po_number}",
        bill_date=date.today(),
        due_date=date.today() + timedelta(days=po.vendor.payment_terms_days or 30),
        status=BillStatus.DRAFT.value,
        subtotal=po.subtotal,
        discount_amount=po.subtotal - po.taxable_amount,
        taxable_amount=po.taxable_amount,
        cgst_amount=cgst_tot,
        sgst_amount=sgst_tot,
        igst_amount=igst_tot,
        total_tax=total_tax,
        total_amount=grand_total,
        paid_amount=Decimal("0.00"),
        balance_amount=grand_total,
        currency=po.vendor.currency,
        notes=f"Converted from PO #{po.po_number}",
        terms=po.terms,
        created_by_id=current_user.id,
        lines=bill_lines
    )
    db.add(bill)
    db.flush()

    po.status = POStatus.BILLED.value
    po.converted_bill_id = bill.id
    db.commit()
    db.refresh(bill)

    res = BillDetailResponse.model_validate(bill, from_attributes=True)
    res.vendor_name = po.vendor.name
    return res

# =========================================================================
# 3. VENDOR BILLS
# =========================================================================
@router.get("/bills", response_model=List[BillResponse])
def get_bills(
    entity_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Bill).options(joinedload(Bill.vendor))
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Bill.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Bill.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Bill.entity_id == current_user.default_entity_id)

    if vendor_id:
        query = query.filter(Bill.vendor_id == vendor_id)

    if status and status.upper() != "ALL":
        query = query.filter(Bill.status == status.upper())

    bills = query.order_by(desc(Bill.bill_date), desc(Bill.id)).all()
    results = []
    for b in bills:
        res = BillResponse.model_validate(b, from_attributes=True)
        if b.vendor:
            res.vendor_name = b.vendor.name
        results.append(res)
    return results

@router.post("/bills", response_model=BillDetailResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: BillCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(bill_in.entity_id, current_user, db)

    vendor = db.query(Vendor).filter(Vendor.id == bill_in.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    entity = db.query(Entity).filter(Entity.id == bill_in.entity_id).first()
    is_intra = is_intra_state_purchase(entity, vendor)

    bill_num = bill_in.bill_number or generate_bill_number(db, bill_in.entity_id)

    subtot = Decimal("0.00")
    disc_tot = Decimal("0.00")
    taxable_tot = Decimal("0.00")
    cgst_tot = Decimal("0.00")
    sgst_tot = Decimal("0.00")
    igst_tot = Decimal("0.00")

    bill_lines = []
    for line_in in bill_in.lines:
        qty = quantize_amount(line_in.quantity)
        price = quantize_amount(line_in.unit_price)
        disc_pct = quantize_amount(line_in.discount_pct)
        tax_rate = quantize_amount(line_in.tax_rate)

        l_sub = quantize_amount(qty * price)
        disc_amt = quantize_amount((l_sub * disc_pct) / Decimal("100.0"))
        l_taxable = quantize_amount(l_sub - disc_amt)

        if is_intra:
            c_r = quantize_amount(tax_rate / Decimal("2.0"))
            s_r = quantize_amount(tax_rate / Decimal("2.0"))
            i_r = Decimal("0.00")
            c_a = quantize_amount((l_taxable * c_r) / Decimal("100.0"))
            s_a = quantize_amount((l_taxable * s_r) / Decimal("100.0"))
            i_a = Decimal("0.00")
        else:
            c_r = Decimal("0.00")
            s_r = Decimal("0.00")
            i_r = tax_rate
            c_a = Decimal("0.00")
            s_a = Decimal("0.00")
            i_a = quantize_amount((l_taxable * i_r) / Decimal("100.0"))

        l_tot = quantize_amount(l_taxable + c_a + s_a + i_a)

        subtot += l_sub
        disc_tot += disc_amt
        taxable_tot += l_taxable
        cgst_tot += c_a
        sgst_tot += s_a
        igst_tot += i_a

        bill_lines.append(BillLine(
            product_id=line_in.product_id,
            expense_account_id=line_in.expense_account_id,
            description=line_in.description.strip(),
            hsn_sac=line_in.hsn_sac,
            quantity=qty,
            unit=line_in.unit,
            unit_price=price,
            discount_pct=disc_pct,
            taxable_amount=l_taxable,
            tax_rate=tax_rate,
            cgst_rate=c_r,
            cgst_amount=c_a,
            sgst_rate=s_r,
            sgst_amount=s_a,
            igst_rate=i_r,
            igst_amount=i_a,
            total_amount=l_tot
        ))

    total_tax = cgst_tot + sgst_tot + igst_tot
    grand_total = taxable_tot + total_tax

    bill = Bill(
        entity_id=bill_in.entity_id,
        vendor_id=bill_in.vendor_id,
        bill_number=bill_num,
        vendor_invoice_ref=bill_in.vendor_invoice_ref,
        bill_date=bill_in.bill_date,
        due_date=bill_in.due_date,
        supply_state=bill_in.supply_state or vendor.state,
        status=BillStatus.DRAFT.value,
        subtotal=subtot,
        discount_amount=disc_tot,
        taxable_amount=taxable_tot,
        cgst_amount=cgst_tot,
        sgst_amount=sgst_tot,
        igst_amount=igst_tot,
        total_tax=total_tax,
        total_amount=grand_total,
        paid_amount=Decimal("0.00"),
        balance_amount=grand_total,
        currency=vendor.currency,
        notes=bill_in.notes,
        terms=bill_in.terms,
        created_by_id=current_user.id,
        lines=bill_lines
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    log_audit(
        db=db,
        action="BILL_CREATED",
        record_type="Bill",
        record_id=str(bill.id),
        user=current_user,
        entity_id=bill.entity_id,
        details=f"Created bill #{bill.bill_number} for {vendor.name} ({bill.total_amount})"
    )

    res = BillDetailResponse.model_validate(bill, from_attributes=True)
    res.vendor_name = vendor.name
    return res

@router.get("/bills/{bill_id}", response_model=BillDetailResponse)
def get_bill_detail(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bill = db.query(Bill).options(
        joinedload(Bill.vendor),
        joinedload(Bill.lines)
    ).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    verify_entity_access(bill.entity_id, current_user, db)

    res = BillDetailResponse.model_validate(bill, from_attributes=True)
    if bill.vendor:
        res.vendor_name = bill.vendor.name
    return res

@router.post("/bills/{bill_id}/post", response_model=BillDetailResponse)
def post_bill_to_ledger(
    bill_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    bill = db.query(Bill).options(
        joinedload(Bill.vendor),
        joinedload(Bill.lines)
    ).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    verify_entity_access(bill.entity_id, current_user, db)

    post_bill_to_general_ledger(db, bill, current_user)

    log_audit(
        db=db,
        action="BILL_POSTED_TO_GL",
        record_type="Bill",
        record_id=str(bill.id),
        user=current_user,
        entity_id=bill.entity_id,
        details=f"Posted bill #{bill.bill_number} to General Ledger. Journal Entry ID: {bill.journal_entry_id}"
    )

    res = BillDetailResponse.model_validate(bill, from_attributes=True)
    res.vendor_name = bill.vendor.name
    return res

# =========================================================================
# 4. VENDOR PAYMENTS
# =========================================================================
@router.get("/payments/vendor", response_model=List[VendorPaymentResponse])
@router.get("/vendor-payments", response_model=List[VendorPaymentResponse])
def get_vendor_payments(
    entity_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(VendorPayment).options(
        joinedload(VendorPayment.vendor),
        joinedload(VendorPayment.bill),
        joinedload(VendorPayment.disbursement_account)
    )
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(VendorPayment.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(VendorPayment.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(VendorPayment.entity_id == current_user.default_entity_id)

    if vendor_id:
        query = query.filter(VendorPayment.vendor_id == vendor_id)

    payments = query.order_by(desc(VendorPayment.payment_date), desc(VendorPayment.id)).all()
    results = []
    for p in payments:
        res = VendorPaymentResponse.model_validate(p, from_attributes=True)
        if p.vendor:
            res.vendor_name = p.vendor.name
        if p.bill:
            res.bill_number = p.bill.bill_number
        if p.disbursement_account:
            res.disbursement_account_name = f"{p.disbursement_account.code} - {p.disbursement_account.name}"
        results.append(res)
    return results

@router.post("/payments/vendor", response_model=VendorPaymentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/vendor-payments", response_model=VendorPaymentResponse, status_code=status.HTTP_201_CREATED)
def record_vendor_payment(
    pay_in: VendorPaymentCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(pay_in.entity_id, current_user, db)

    vendor = db.query(Vendor).filter(Vendor.id == pay_in.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    pay_no = pay_in.payment_number or generate_vendor_payment_number(db, pay_in.entity_id)

    disbursement_acc_id = pay_in.disbursement_account_id
    if not disbursement_acc_id:
        bank_acc = get_or_create_account(
            db=db,
            entity_id=pay_in.entity_id,
            code="1100",
            name="Bank Current Account",
            acc_type=AccountType.ASSET,
            norm_bal=NormalBalance.DEBIT,
            currency=vendor.currency or "INR"
        )
        disbursement_acc_id = bank_acc.id

    payment = VendorPayment(
        entity_id=pay_in.entity_id,
        vendor_id=pay_in.vendor_id,
        bill_id=pay_in.bill_id,
        payment_number=pay_no,
        payment_date=pay_in.payment_date,
        amount=quantize_amount(pay_in.amount),
        payment_mode=pay_in.payment_mode,
        disbursement_account_id=disbursement_acc_id,
        reference_number=pay_in.reference_number,
        notes=pay_in.notes,
        created_by_id=current_user.id
    )
    db.add(payment)
    db.flush()

    record_vendor_payment_transaction(db, payment, current_user)

    log_audit(
        db=db,
        action="VENDOR_PAYMENT_RECORDED",
        record_type="VendorPayment",
        record_id=str(payment.id),
        user=current_user,
        entity_id=payment.entity_id,
        details=f"Recorded disbursement #{payment.payment_number} ({payment.amount}) to {vendor.name}"
    )

    res = VendorPaymentResponse.model_validate(payment, from_attributes=True)
    res.vendor_name = vendor.name
    if payment.bill:
        res.bill_number = payment.bill.bill_number
    if payment.disbursement_account:
        res.disbursement_account_name = f"{payment.disbursement_account.code} - {payment.disbursement_account.name}"
    return res

# =========================================================================
# 5. DEBIT NOTES
# =========================================================================
@router.get("/debit-notes", response_model=List[DebitNoteResponse])
def get_debit_notes(
    entity_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DebitNote).options(joinedload(DebitNote.vendor), joinedload(DebitNote.bill))
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(DebitNote.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(DebitNote.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(DebitNote.entity_id == current_user.default_entity_id)

    if vendor_id:
        query = query.filter(DebitNote.vendor_id == vendor_id)

    notes = query.order_by(desc(DebitNote.note_date), desc(DebitNote.id)).all()
    results = []
    for n in notes:
        res = DebitNoteResponse.model_validate(n, from_attributes=True)
        if n.vendor:
            res.vendor_name = n.vendor.name
        if n.bill:
            res.bill_number = n.bill.bill_number
        results.append(res)
    return results

@router.post("/debit-notes", response_model=DebitNoteResponse, status_code=status.HTTP_201_CREATED)
def create_debit_note(
    dn_in: DebitNoteCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(dn_in.entity_id, current_user, db)

    vendor = db.query(Vendor).filter(Vendor.id == dn_in.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    dn_no = dn_in.note_number or generate_debit_note_number(db, dn_in.entity_id)
    amount = quantize_amount(dn_in.amount)

    note = DebitNote(
        entity_id=dn_in.entity_id,
        vendor_id=dn_in.vendor_id,
        bill_id=dn_in.bill_id,
        note_number=dn_no,
        note_date=dn_in.note_date,
        amount=amount,
        reason=dn_in.reason,
        created_by_id=current_user.id
    )
    db.add(note)
    
    # Adjust vendor AP balance
    vendor.current_balance = quantize_amount(Decimal(str(vendor.current_balance or 0)) - amount)
    db.commit()
    db.refresh(note)

    res = DebitNoteResponse.model_validate(note, from_attributes=True)
    res.vendor_name = vendor.name
    return res

