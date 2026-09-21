from typing import List, Optional
from datetime import date, datetime
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.sales import (
    Customer, Product, Invoice, InvoiceLine, InvoiceStatus, 
    CustomerPayment, Estimate, EstimateLine, EstimateStatus,
    SalesOrder, SalesOrderLine, SalesOrderStatus,
    CreditNote, CreditNoteLine, CreditNoteStatus,
    RecurringInvoice, RecurringFrequency
)
from app.schemas.sales import (
    CustomerCreate, CustomerUpdate, CustomerResponse, 
    CustomerLedgerEntry, CustomerStatementResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse, InvoiceLineResponse,
    CustomerPaymentCreate, CustomerPaymentResponse,
    EstimateCreate, EstimateResponse, EstimateLineResponse,
    SalesOrderCreate, SalesOrderResponse,
    CreditNoteCreate, CreditNoteResponse,
    RecurringInvoiceCreate, RecurringInvoiceResponse
)
from app.services.sales_engine import (
    quantize_amount, generate_invoice_number, generate_payment_number, 
    generate_estimate_number, is_intra_state_supply, 
    post_invoice_to_general_ledger, record_customer_payment_transaction,
    get_or_create_account
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access, 
    get_tenant_entity_ids, log_audit
)

router = APIRouter()

# =========================================================================
# 1. CUSTOMERS
# =========================================================================
@router.get("/customers", response_model=List[CustomerResponse])
def get_customers(
    entity_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Customer.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Customer.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Customer.entity_id == current_user.default_entity_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Customer.name.ilike(s)) | (Customer.company_name.ilike(s)) | 
            (Customer.email.ilike(s)) | (Customer.gstin.ilike(s))
        )

    return query.order_by(Customer.name.asc()).all()

@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    cust_in: CustomerCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(cust_in.entity_id, current_user, db)

    customer = Customer(
        entity_id=cust_in.entity_id,
        name=cust_in.name.strip(),
        company_name=cust_in.company_name.strip() if cust_in.company_name else None,
        email=cust_in.email.strip() if cust_in.email else None,
        phone=cust_in.phone.strip() if cust_in.phone else None,
        gstin=cust_in.gstin.strip().upper() if cust_in.gstin else None,
        pan=cust_in.pan.strip().upper() if cust_in.pan else None,
        billing_address=cust_in.billing_address,
        shipping_address=cust_in.shipping_address,
        city=cust_in.city,
        state=cust_in.state,
        postal_code=cust_in.postal_code,
        country=cust_in.country,
        payment_terms_days=cust_in.payment_terms_days,
        opening_balance=cust_in.opening_balance,
        current_balance=cust_in.opening_balance,
        currency=cust_in.currency
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    log_audit(
        db=db,
        action="CUSTOMER_CREATED",
        record_type="Customer",
        record_id=str(customer.id),
        user=current_user,
        entity_id=customer.entity_id,
        details=f"Created customer '{customer.name}' with balance {customer.current_balance}"
    )

    return customer

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    verify_entity_access(customer.entity_id, current_user, db)
    return customer

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    cust_in: CustomerUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    verify_entity_access(customer.entity_id, current_user, db)

    for field, val in cust_in.model_dump(exclude_unset=True).items():
        setattr(customer, field, val)

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    verify_entity_access(customer.entity_id, current_user, db)

    customer.is_active = False
    db.commit()
    return {"message": f"Customer '{customer.name}' archived successfully"}

@router.get("/customers/{customer_id}/ledger", response_model=CustomerStatementResponse)
@router.get("/customers/{customer_id}/statement", response_model=CustomerStatementResponse)
def get_customer_ledger_statement(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    verify_entity_access(customer.entity_id, current_user, db)

    # Fetch customer invoices and payments
    invoices = db.query(Invoice).filter(
        Invoice.customer_id == customer_id,
        Invoice.status != InvoiceStatus.CANCELLED.value
    ).order_by(Invoice.invoice_date.asc(), Invoice.id.asc()).all()

    payments = db.query(CustomerPayment).filter(
        CustomerPayment.customer_id == customer_id
    ).order_by(CustomerPayment.payment_date.asc(), CustomerPayment.id.asc()).all()

    # Combine into chronological ledger entries
    timeline = []
    
    # Opening balance entry if any
    op_bal = quantize_amount(Decimal(str(customer.opening_balance or 0)))
    running = op_bal
    if op_bal > 0:
        timeline.append({
            "date": customer.created_at.date(),
            "type": "OPENING_BALANCE",
            "ref": "OP-BAL",
            "desc": "Opening Balance B/F",
            "debit": op_bal,
            "credit": Decimal("0.00"),
            "sort_key": f"{customer.created_at.date()}-0"
        })

    for inv in invoices:
        tot = quantize_amount(Decimal(str(inv.total_amount)))
        timeline.append({
            "date": inv.invoice_date,
            "type": "INVOICE",
            "ref": inv.invoice_number,
            "desc": f"Sales Invoice #{inv.invoice_number} ({inv.status})",
            "debit": tot,
            "credit": Decimal("0.00"),
            "sort_key": f"{inv.invoice_date}-1-{inv.id}"
        })

    for p in payments:
        amt = quantize_amount(Decimal(str(p.amount)))
        timeline.append({
            "date": p.payment_date,
            "type": "PAYMENT",
            "ref": p.payment_number,
            "desc": f"Payment Receipt #{p.payment_number} ({p.payment_mode})",
            "debit": Decimal("0.00"),
            "credit": amt,
            "sort_key": f"{p.payment_date}-2-{p.id}"
        })

    # Sort timeline
    timeline.sort(key=lambda x: x["sort_key"])

    entries: List[CustomerLedgerEntry] = []
    tot_invoiced = Decimal("0.00")
    tot_paid = Decimal("0.00")
    running_bal = Decimal("0.00")

    for idx, item in enumerate(timeline, start=1):
        dr = item["debit"]
        cr = item["credit"]
        running_bal = running_bal + dr - cr
        if item["type"] == "INVOICE":
            tot_invoiced += dr
        elif item["type"] == "PAYMENT":
            tot_paid += cr
        elif item["type"] == "OPENING_BALANCE":
            tot_invoiced += dr

        entries.append(CustomerLedgerEntry(
            id=idx,
            date=item["date"],
            type=item["type"],
            reference=item["ref"],
            description=item["desc"],
            debit=dr,
            credit=cr,
            running_balance=running_bal
        ))

    return CustomerStatementResponse(
        customer_id=customer.id,
        customer_name=customer.name,
        company_name=customer.company_name,
        gstin=customer.gstin,
        currency=customer.currency,
        opening_balance=op_bal,
        total_invoiced=tot_invoiced,
        total_paid=tot_paid,
        current_balance=running_bal,
        statement_period="All Time",
        entries=entries
    )

# =========================================================================
# 2. PRODUCTS & SERVICES
# =========================================================================
@router.get("/products", response_model=List[ProductResponse])
def get_products(
    entity_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Product.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Product.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Product.entity_id == current_user.default_entity_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Product.name.ilike(s)) | (Product.sku.ilike(s)))

    return query.order_by(Product.name.asc()).all()

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: ProductCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(prod_in.entity_id, current_user, db)

    prod = Product(
        entity_id=prod_in.entity_id,
        name=prod_in.name.strip(),
        sku=prod_in.sku.strip() if prod_in.sku else None,
        product_type=prod_in.product_type,
        unit=prod_in.unit,
        selling_price=prod_in.selling_price,
        purchase_price=prod_in.purchase_price,
        hsn_sac_code=prod_in.hsn_sac_code.strip() if prod_in.hsn_sac_code else None,
        tax_rate=prod_in.tax_rate,
        income_account_id=prod_in.income_account_id,
        expense_account_id=prod_in.expense_account_id,
        current_stock=prod_in.current_stock,
        min_stock_alert=prod_in.min_stock_alert
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    prod_in: ProductUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    verify_entity_access(prod.entity_id, current_user, db)

    for field, val in prod_in.model_dump(exclude_unset=True).items():
        setattr(prod, field, val)

    db.commit()
    db.refresh(prod)
    return prod

# =========================================================================
# 3. SALES INVOICES
# =========================================================================
@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    entity_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).options(joinedload(Invoice.customer))
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Invoice.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Invoice.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Invoice.entity_id == current_user.default_entity_id)

    if status:
        query = query.filter(Invoice.status == status)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Invoice.invoice_number.ilike(s)) | (Invoice.notes.ilike(s)))

    invoices = query.order_by(desc(Invoice.invoice_date), desc(Invoice.id)).all()
    results = []
    for inv in invoices:
        res = InvoiceResponse.model_validate(inv, from_attributes=True)
        if inv.customer:
            res.customer_name = inv.customer.name
        results.append(res)
    return results

@router.post("/invoices", response_model=InvoiceDetailResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    inv_in: InvoiceCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(inv_in.entity_id, current_user, db)

    entity = db.query(Entity).filter(Entity.id == inv_in.entity_id).first()
    customer = db.query(Customer).filter(Customer.id == inv_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoice_no = inv_in.invoice_number or generate_invoice_number(db, inv_in.entity_id)
    due_d = inv_in.due_date or (inv_in.invoice_date + timedelta(days=customer.payment_terms_days or 30))

    # Calculate GST (Intra-state: CGST+SGST vs Inter-state: IGST)
    is_intra = is_intra_state_supply(entity, customer)

    subtot = Decimal("0.00")
    taxable_tot = Decimal("0.00")
    cgst_tot = Decimal("0.00")
    sgst_tot = Decimal("0.00")
    igst_tot = Decimal("0.00")
    lines = []

    for line_in in inv_in.lines:
        qty = quantize_amount(line_in.quantity)
        price = quantize_amount(line_in.unit_price)
        disc_pct = quantize_amount(line_in.discount_pct)
        tax_rate = quantize_amount(line_in.tax_rate)

        line_sub = quantize_amount(qty * price)
        disc_amt = quantize_amount((line_sub * disc_pct) / Decimal("100.0"))
        line_taxable = quantize_amount(line_sub - disc_amt)

        if is_intra:
            c_rate = quantize_amount(tax_rate / Decimal("2.0"))
            s_rate = quantize_amount(tax_rate / Decimal("2.0"))
            i_rate = Decimal("0.00")
            c_amt = quantize_amount((line_taxable * c_rate) / Decimal("100.0"))
            s_amt = quantize_amount((line_taxable * s_rate) / Decimal("100.0"))
            i_amt = Decimal("0.00")
        else:
            c_rate = Decimal("0.00")
            s_rate = Decimal("0.00")
            i_rate = tax_rate
            c_amt = Decimal("0.00")
            s_amt = Decimal("0.00")
            i_amt = quantize_amount((line_taxable * i_rate) / Decimal("100.0"))

        line_total = quantize_amount(line_taxable + c_amt + s_amt + i_amt)

        subtot += line_sub
        taxable_tot += line_taxable
        cgst_tot += c_amt
        sgst_tot += s_amt
        igst_tot += i_amt

        lines.append(InvoiceLine(
            product_id=line_in.product_id,
            description=line_in.description.strip(),
            hsn_sac=line_in.hsn_sac,
            quantity=qty,
            unit_price=price,
            discount_pct=disc_pct,
            taxable_amount=line_taxable,
            tax_rate=tax_rate,
            cgst_rate=c_rate,
            cgst_amount=c_amt,
            sgst_rate=s_rate,
            sgst_amount=s_amt,
            igst_rate=i_rate,
            igst_amount=i_amt,
            total_amount=line_total
        ))

    tot_tax = quantize_amount(cgst_tot + sgst_tot + igst_tot)
    grand_tot = quantize_amount(taxable_tot + tot_tax)

    invoice = Invoice(
        entity_id=inv_in.entity_id,
        customer_id=inv_in.customer_id,
        invoice_number=invoice_no,
        invoice_date=inv_in.invoice_date,
        due_date=due_d,
        status=InvoiceStatus.DRAFT.value,
        subtotal=subtot,
        discount_amount=subtot - taxable_tot,
        taxable_amount=taxable_tot,
        cgst_amount=cgst_tot,
        sgst_amount=sgst_tot,
        igst_amount=igst_tot,
        total_tax=tot_tax,
        total_amount=grand_tot,
        paid_amount=Decimal("0.00"),
        balance_amount=grand_tot,
        currency=inv_in.currency or entity.base_currency,
        notes=inv_in.notes,
        terms=inv_in.terms,
        created_by_id=current_user.id,
        lines=lines
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    log_audit(
        db=db,
        action="INVOICE_CREATED",
        record_type="Invoice",
        record_id=str(invoice.id),
        user=current_user,
        entity_id=invoice.entity_id,
        details=f"Draft Invoice #{invoice.invoice_number} created for {customer.name} ({grand_tot})"
    )

    res = InvoiceDetailResponse.model_validate(invoice, from_attributes=True)
    res.customer_name = customer.name
    return res

@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.lines)
    ).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    verify_entity_access(invoice.entity_id, current_user, db)

    res = InvoiceDetailResponse.model_validate(invoice, from_attributes=True)
    if invoice.customer:
        res.customer_name = invoice.customer.name
    return res

@router.post("/invoices/{invoice_id}/post", response_model=InvoiceDetailResponse)
def post_invoice(
    invoice_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    """
    Finalizes invoice and posts balanced double-entry transaction to General Ledger:
    Debit: Accounts Receivable (1200)
    Credit: Operating Sales Revenue (4000)
    Credit: Output GST (2100/2110/2120)
    """
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.lines)
    ).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    verify_entity_access(invoice.entity_id, current_user, db)

    post_invoice_to_general_ledger(db, invoice, current_user)

    log_audit(
        db=db,
        action="INVOICE_POSTED",
        record_type="Invoice",
        record_id=str(invoice.id),
        user=current_user,
        entity_id=invoice.entity_id,
        details=f"Invoice #{invoice.invoice_number} posted to General Ledger (Total: {invoice.total_amount})"
    )

    res = InvoiceDetailResponse.model_validate(invoice, from_attributes=True)
    res.customer_name = invoice.customer.name
    return res

# =========================================================================
# 4. CUSTOMER PAYMENTS
# =========================================================================
@router.get("/payments/customer", response_model=List[CustomerPaymentResponse])
@router.get("/payments", response_model=List[CustomerPaymentResponse])
def get_customer_payments(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CustomerPayment).options(
        joinedload(CustomerPayment.customer),
        joinedload(CustomerPayment.invoice),
        joinedload(CustomerPayment.deposit_account)
    )
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(CustomerPayment.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(CustomerPayment.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(CustomerPayment.entity_id == current_user.default_entity_id)

    if customer_id:
        query = query.filter(CustomerPayment.customer_id == customer_id)

    payments = query.order_by(desc(CustomerPayment.payment_date), desc(CustomerPayment.id)).all()
    results = []
    for p in payments:
        res = CustomerPaymentResponse.model_validate(p, from_attributes=True)
        if p.customer:
            res.customer_name = p.customer.name
        if p.invoice:
            res.invoice_number = p.invoice.invoice_number
        if p.deposit_account:
            res.deposit_account_name = f"{p.deposit_account.code} - {p.deposit_account.name}"
        results.append(res)
    return results

@router.post("/payments/customer", response_model=CustomerPaymentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/payments", response_model=CustomerPaymentResponse, status_code=status.HTTP_201_CREATED)
def record_customer_payment(
    pay_in: CustomerPaymentCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(pay_in.entity_id, current_user, db)

    customer = db.query(Customer).filter(Customer.id == pay_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    pay_no = pay_in.payment_number or generate_payment_number(db, pay_in.entity_id)

    deposit_acc_id = pay_in.deposit_account_id
    if not deposit_acc_id:
        bank_acc = get_or_create_account(
            db=db,
            entity_id=pay_in.entity_id,
            code="1100",
            name="Bank Current Account",
            acc_type=AccountType.ASSET,
            norm_bal=NormalBalance.DEBIT,
            currency=customer.currency or "INR"
        )
        deposit_acc_id = bank_acc.id

    payment = CustomerPayment(
        entity_id=pay_in.entity_id,
        customer_id=pay_in.customer_id,
        invoice_id=pay_in.invoice_id,
        payment_number=pay_no,
        payment_date=pay_in.payment_date,
        amount=quantize_amount(pay_in.amount),
        payment_mode=pay_in.payment_mode,
        deposit_account_id=deposit_acc_id,
        reference_number=pay_in.reference_number,
        notes=pay_in.notes,
        created_by_id=current_user.id
    )
    db.add(payment)
    db.flush()

    record_customer_payment_transaction(db, payment, current_user)

    log_audit(
        db=db,
        action="CUSTOMER_PAYMENT_RECORDED",
        record_type="CustomerPayment",
        record_id=str(payment.id),
        user=current_user,
        entity_id=payment.entity_id,
        details=f"Recorded payment #{payment.payment_number} ({payment.amount}) from {customer.name}"
    )

    res = CustomerPaymentResponse.model_validate(payment, from_attributes=True)
    res.customer_name = customer.name
    if payment.invoice:
        res.invoice_number = payment.invoice.invoice_number
    if payment.deposit_account:
        res.deposit_account_name = f"{payment.deposit_account.code} - {payment.deposit_account.name}"
    return res

# =========================================================================
# 5. ESTIMATES / QUOTES
# =========================================================================
@router.get("/estimates", response_model=List[EstimateResponse])
def get_estimates(
    entity_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Estimate).options(joinedload(Estimate.customer), joinedload(Estimate.lines))
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Estimate.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Estimate.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Estimate.entity_id == current_user.default_entity_id)

    estimates = query.order_by(desc(Estimate.estimate_date), desc(Estimate.id)).all()
    results = []
    for est in estimates:
        res = EstimateResponse.model_validate(est, from_attributes=True)
        if est.customer:
            res.customer_name = est.customer.name
        results.append(res)
    return results

@router.post("/estimates", response_model=EstimateResponse, status_code=status.HTTP_201_CREATED)
def create_estimate(
    est_in: EstimateCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(est_in.entity_id, current_user, db)

    customer = db.query(Customer).filter(Customer.id == est_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    est_no = est_in.estimate_number or generate_estimate_number(db, est_in.entity_id)
    exp_d = est_in.expiry_date or (est_in.estimate_date + timedelta(days=30))

    subtot = Decimal("0.00")
    lines = []
    for line_in in est_in.lines:
        qty = quantize_amount(line_in.quantity)
        price = quantize_amount(line_in.unit_price)
        disc_pct = quantize_amount(line_in.discount_pct)
        tax_rate = quantize_amount(line_in.tax_rate)

        l_sub = quantize_amount(qty * price)
        disc_amt = quantize_amount((l_sub * disc_pct) / Decimal("100.0"))
        l_taxable = quantize_amount(l_sub - disc_amt)
        tax_amt = quantize_amount((l_taxable * tax_rate) / Decimal("100.0"))
        l_tot = quantize_amount(l_taxable + tax_amt)

        subtot += l_sub
        lines.append(EstimateLine(
            product_id=line_in.product_id,
            description=line_in.description.strip(),
            hsn_sac=line_in.hsn_sac,
            quantity=qty,
            unit_price=price,
            discount_pct=disc_pct,
            taxable_amount=l_taxable,
            tax_rate=tax_rate,
            total_amount=l_tot
        ))

    tot_amount = sum(l.total_amount for l in lines)
    tot_taxable = sum(l.taxable_amount for l in lines)

    estimate = Estimate(
        entity_id=est_in.entity_id,
        customer_id=est_in.customer_id,
        estimate_number=est_no,
        estimate_date=est_in.estimate_date,
        expiry_date=exp_d,
        status=EstimateStatus.DRAFT.value,
        subtotal=subtot,
        discount_amount=subtot - tot_taxable,
        taxable_amount=tot_taxable,
        total_tax=tot_amount - tot_taxable,
        total_amount=tot_amount,
        notes=est_in.notes,
        terms=est_in.terms,
        created_by_id=current_user.id,
        lines=lines
    )
    db.add(estimate)
    db.commit()
    db.refresh(estimate)

    res = EstimateResponse.model_validate(estimate, from_attributes=True)
    res.customer_name = customer.name
    return res

@router.get("/estimates/{estimate_id}", response_model=EstimateResponse)
def get_estimate(
    estimate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    estimate = db.query(Estimate).options(
        joinedload(Estimate.customer),
        joinedload(Estimate.lines)
    ).filter(Estimate.id == estimate_id).first()
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    verify_entity_access(estimate.entity_id, current_user, db)

    res = EstimateResponse.model_validate(estimate, from_attributes=True)
    if estimate.customer:
        res.customer_name = estimate.customer.name
    return res

@router.post("/estimates/{estimate_id}/convert-to-invoice", response_model=InvoiceDetailResponse)
@router.post("/estimates/{estimate_id}/convert", response_model=InvoiceDetailResponse)
def convert_estimate_to_invoice(
    estimate_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    estimate = db.query(Estimate).options(
        joinedload(Estimate.customer),
        joinedload(Estimate.lines)
    ).filter(Estimate.id == estimate_id).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    verify_entity_access(estimate.entity_id, current_user, db)

    if estimate.status == EstimateStatus.CONVERTED.value and estimate.converted_invoice_id:
        existing_inv = db.query(Invoice).filter(Invoice.id == estimate.converted_invoice_id).first()
        if existing_inv:
            res = InvoiceDetailResponse.model_validate(existing_inv, from_attributes=True)
            res.customer_name = estimate.customer.name
            return res

    entity = db.query(Entity).filter(Entity.id == estimate.entity_id).first()
    is_intra = is_intra_state_supply(entity, estimate.customer)

    inv_lines = []
    cgst_tot = Decimal("0.00")
    sgst_tot = Decimal("0.00")
    igst_tot = Decimal("0.00")

    for el in estimate.lines:
        t_rate = quantize_amount(el.tax_rate)
        t_amt = quantize_amount(el.taxable_amount)
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

        inv_lines.append(InvoiceLine(
            product_id=el.product_id,
            description=el.description,
            hsn_sac=el.hsn_sac,
            quantity=el.quantity,
            unit_price=el.unit_price,
            discount_pct=el.discount_pct,
            taxable_amount=el.taxable_amount,
            tax_rate=t_rate,
            cgst_rate=c_r,
            cgst_amount=c_a,
            sgst_rate=s_r,
            sgst_amount=s_a,
            igst_rate=i_r,
            igst_amount=i_a,
            total_amount=el.taxable_amount + c_a + s_a + i_a
        ))

    total_tax = cgst_tot + sgst_tot + igst_tot
    grand_total = estimate.taxable_amount + total_tax

    invoice = Invoice(
        entity_id=estimate.entity_id,
        customer_id=estimate.customer_id,
        invoice_number=generate_invoice_number(db, estimate.entity_id),
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=estimate.customer.payment_terms_days or 30),
        status=InvoiceStatus.DRAFT.value,
        subtotal=estimate.subtotal,
        discount_amount=estimate.discount_amount,
        taxable_amount=estimate.taxable_amount,
        cgst_amount=cgst_tot,
        sgst_amount=sgst_tot,
        igst_amount=igst_tot,
        total_tax=total_tax,
        total_amount=grand_total,
        paid_amount=Decimal("0.00"),
        balance_amount=grand_total,
        currency=estimate.customer.currency,
        notes=f"Converted from Estimate #{estimate.estimate_number}",
        terms=estimate.terms,
        created_by_id=current_user.id,
        lines=inv_lines
    )
    db.add(invoice)
    db.flush()

    estimate.status = EstimateStatus.CONVERTED.value
    estimate.converted_invoice_id = invoice.id
    db.commit()
    db.refresh(invoice)

    res = InvoiceDetailResponse.model_validate(invoice, from_attributes=True)
    res.customer_name = estimate.customer.name
    return res

# =========================================================================
# 6. SALES ORDERS
# =========================================================================
@router.get("/orders", response_model=List[SalesOrderResponse])
def get_sales_orders(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(SalesOrder).options(joinedload(SalesOrder.customer), joinedload(SalesOrder.lines))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(SalesOrder.entity_id == entity_id)
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)

    orders = query.order_by(desc(SalesOrder.order_date), desc(SalesOrder.id)).all()
    results = []
    for so in orders:
        res = SalesOrderResponse.model_validate(so, from_attributes=True)
        if so.customer:
            res.customer_name = so.customer.name
        results.append(res)
    return results

@router.post("/orders", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED)
def create_sales_order(
    so_in: SalesOrderCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(so_in.entity_id, current_user, db)
    customer = db.query(Customer).filter(Customer.id == so_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    so_count = db.query(SalesOrder).filter(SalesOrder.entity_id == so_in.entity_id).count()
    so_number = so_in.so_number or f"SO-{date.today().year}-{so_count + 1:04d}"

    subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")
    lines = []

    for l_in in so_in.lines:
        qty = quantize_amount(l_in.quantity)
        price = quantize_amount(l_in.unit_price)
        t_rate = quantize_amount(l_in.tax_rate)
        disc = quantize_amount(l_in.discount_pct)
        base = qty * price
        disc_amt = (base * disc) / Decimal("100.00")
        taxable = quantize_amount(base - disc_amt)
        tax = quantize_amount((taxable * t_rate) / Decimal("100.00"))
        tot = taxable + tax

        subtotal += taxable
        total_tax += tax

        lines.append(SalesOrderLine(
            product_id=l_in.product_id,
            description=l_in.description,
            hsn_sac=l_in.hsn_sac,
            quantity=qty,
            unit_price=price,
            discount_pct=disc,
            taxable_amount=taxable,
            tax_rate=t_rate,
            total_amount=tot
        ))

    order = SalesOrder(
        entity_id=so_in.entity_id,
        customer_id=so_in.customer_id,
        so_number=so_number,
        order_date=so_in.order_date,
        delivery_date=so_in.delivery_date,
        status=SalesOrderStatus.CONFIRMED.value,
        subtotal=subtotal,
        discount_amount=Decimal("0.00"),
        taxable_amount=subtotal,
        total_tax=total_tax,
        total_amount=subtotal + total_tax,
        notes=so_in.notes,
        created_by_id=current_user.id,
        lines=lines
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    res = SalesOrderResponse.model_validate(order, from_attributes=True)
    res.customer_name = customer.name
    return res

# =========================================================================
# 7. CREDIT NOTES (SALES RETURNS & AR ADJUSTMENTS)
# =========================================================================
@router.get("/credit-notes", response_model=List[CreditNoteResponse])
def get_credit_notes(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CreditNote).options(joinedload(CreditNote.customer), joinedload(CreditNote.invoice))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(CreditNote.entity_id == entity_id)
    if customer_id:
        query = query.filter(CreditNote.customer_id == customer_id)

    notes = query.order_by(desc(CreditNote.credit_note_date), desc(CreditNote.id)).all()
    results = []
    for cn in notes:
        res = CreditNoteResponse.model_validate(cn, from_attributes=True)
        if cn.customer:
            res.customer_name = cn.customer.name
        results.append(res)
    return results

@router.post("/credit-notes", response_model=CreditNoteResponse, status_code=status.HTTP_201_CREATED)
def create_credit_note(
    cn_in: CreditNoteCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(cn_in.entity_id, current_user, db)
    customer = db.query(Customer).filter(Customer.id == cn_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    cn_count = db.query(CreditNote).filter(CreditNote.entity_id == cn_in.entity_id).count()
    cn_number = cn_in.credit_note_number or f"CN-{date.today().year}-{cn_count + 1:04d}"
    tot = quantize_amount(cn_in.total_amount)
    sub = quantize_amount(cn_in.subtotal)
    tax = quantize_amount(cn_in.tax_amount)

    # Automated Double-Entry Journal Posting:
    # Dr 4000 Sales Returns (or Revenue Reduction) subtotal
    # Dr 2100 GST Output Liability tax_amount (if any)
    # Cr 1200 Accounts Receivable total_amount
    from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
    ar_acc = get_or_create_account(db, cn_in.entity_id, "1200", "Accounts Receivable", AccountType.ASSET, NormalBalance.DEBIT)
    sales_acc = get_or_create_account(db, cn_in.entity_id, "4000", "Sales Revenue", AccountType.REVENUE, NormalBalance.CREDIT)

    je_count = db.query(JournalEntry).filter(JournalEntry.entity_id == cn_in.entity_id).count()
    je = JournalEntry(
        entity_id=cn_in.entity_id,
        entry_number=f"JE-CN-{je_count + 1:04d}",
        entry_date=cn_in.credit_note_date,
        description=f"Credit Note #{cn_number} return adjustment for {customer.name}",
        status=JournalStatus.POSTED.value,
        total_debit=tot,
        total_credit=tot,
        created_by_id=current_user.id
    )
    db.add(je)
    db.flush()

    # Dr Sales Return
    db.add(JournalEntryLine(
        journal_entry_id=je.id,
        account_id=sales_acc.id,
        debit=sub,
        credit=Decimal("0.00"),
        description=f"Sales reduction on CN #{cn_number}"
    ))

    # Dr Tax Output
    if tax > 0:
        gst_out_acc = get_or_create_account(db, cn_in.entity_id, "2100", "GST Output Liabilities", AccountType.LIABILITY, NormalBalance.CREDIT)
        db.add(JournalEntryLine(
            journal_entry_id=je.id,
            account_id=gst_out_acc.id,
            debit=tax,
            credit=Decimal("0.00"),
            description=f"Output GST tax credit reduction on CN #{cn_number}"
        ))

    # Cr AR Account
    db.add(JournalEntryLine(
        journal_entry_id=je.id,
        account_id=ar_acc.id,
        debit=Decimal("0.00"),
        credit=tot,
        description=f"AR balance credit on CN #{cn_number}"
    ))

    # Create Credit Note record
    cn = CreditNote(
        entity_id=cn_in.entity_id,
        customer_id=cn_in.customer_id,
        invoice_id=cn_in.invoice_id,
        credit_note_number=cn_number,
        credit_note_date=cn_in.credit_note_date,
        status=CreditNoteStatus.POSTED.value,
        reason=cn_in.reason,
        subtotal=sub,
        tax_amount=tax,
        total_amount=tot,
        journal_entry_id=je.id,
        created_by_id=current_user.id
    )
    db.add(cn)

    # Adjust customer AR balance
    customer.current_balance = quantize_amount(Decimal(str(customer.current_balance or 0)) - tot)
    db.commit()
    db.refresh(cn)

    res = CreditNoteResponse.model_validate(cn, from_attributes=True)
    res.customer_name = customer.name
    return res

# =========================================================================
# 8. RECURRING INVOICES
# =========================================================================
@router.get("/recurring", response_model=List[RecurringInvoiceResponse])
def get_recurring_invoices(
    entity_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RecurringInvoice).options(joinedload(RecurringInvoice.customer))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(RecurringInvoice.entity_id == entity_id)

    profiles = query.order_by(desc(RecurringInvoice.created_at)).all()
    results = []
    for r in profiles:
        res = RecurringInvoiceResponse.model_validate(r, from_attributes=True)
        if r.customer:
            res.customer_name = r.customer.name
        results.append(res)
    return results

@router.post("/recurring", response_model=RecurringInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_invoice(
    r_in: RecurringInvoiceCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(r_in.entity_id, current_user, db)
    customer = db.query(Customer).filter(Customer.id == r_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    rec = RecurringInvoice(
        entity_id=r_in.entity_id,
        customer_id=r_in.customer_id,
        profile_name=r_in.profile_name,
        frequency=r_in.frequency,
        start_date=r_in.start_date,
        end_date=r_in.end_date,
        next_run_date=r_in.next_run_date,
        auto_send=r_in.auto_send,
        is_active=True,
        total_amount=quantize_amount(r_in.total_amount),
        line_items_json=r_in.line_items_json,
        notes=r_in.notes
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    res = RecurringInvoiceResponse.model_validate(rec, from_attributes=True)
    res.customer_name = customer.name
    return res

