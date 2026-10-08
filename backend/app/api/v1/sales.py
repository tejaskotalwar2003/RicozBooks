import uuid
from typing import List, Optional, Union
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.sales import (
    Customer, Product, ProductType, Invoice, InvoiceLine, InvoiceStatus, 
    CustomerPayment, Estimate, EstimateLine, EstimateStatus,
    SalesOrder, SalesOrderLine, SalesOrderStatus,
    CreditNote, CreditNoteLine, CreditNoteStatus,
    RecurringInvoice, RecurringFrequency
)
from app.schemas.sales import (
    CustomerCreate, CustomerUpdate, CustomerResponse, 
    CustomerLedgerEntry, CustomerStatementResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductStatusUpdate, ItemSummaryResponse,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceDetailResponse, InvoiceLineResponse,
    CustomerPaymentCreate, CustomerPaymentResponse,
    EstimateCreate, EstimateResponse, EstimateLineResponse,
    SalesOrderCreate, SalesOrderResponse,
    CreditNoteCreate, CreditNoteResponse,
    RecurringInvoiceCreate, RecurringInvoiceResponse,
    PublicInvoiceResponse, PublicInvoicePaymentRequest, PublicInvoicePaymentResponse
)
from app.schemas.pagination import PaginatedResponse, paginate_or_all

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
from app.services.account_defaults import is_valid_cogs_account

router = APIRouter()

# =========================================================================
# 1. CUSTOMERS
# =========================================================================
@router.get("/customers", response_model=Union[PaginatedResponse[CustomerResponse], List[CustomerResponse]])
def get_customers(
    entity_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
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

    return paginate_or_all(query.order_by(Customer.name.asc()), page=page, page_size=page_size, paginate=paginate)


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
# 2. PRODUCTS & SERVICES (ITEMS MASTER)
# =========================================================================
def serialize_product(prod: Product) -> ProductResponse:
    resp = ProductResponse(
        id=prod.id,
        entity_id=prod.entity_id,
        name=prod.name,
        sku=prod.sku,
        product_type=prod.product_type or "PRODUCT",
        category=prod.category,
        unit=prod.unit or "PCS",
        description=prod.description,
        selling_price=quantize_amount(prod.selling_price),
        purchase_price=quantize_amount(prod.purchase_price),
        hsn_sac_code=prod.hsn_sac_code,
        tax_rate=quantize_amount(prod.tax_rate),
        income_account_id=prod.income_account_id,
        expense_account_id=prod.expense_account_id,
        sales_account_id=prod.income_account_id,
        purchase_account_id=prod.expense_account_id,
        inventory_account_id=prod.inventory_account_id,
        track_inventory=bool(prod.track_inventory) if (prod.product_type or "").upper() != "SERVICE" else False,
        opening_stock=quantize_amount(prod.opening_stock or Decimal("0.00")),
        opening_stock_rate=quantize_amount(prod.opening_stock_rate or Decimal("0.00")),
        reorder_level=quantize_amount(prod.reorder_level if prod.reorder_level is not None else (prod.min_stock_alert or Decimal("0.00"))),
        min_stock_alert=quantize_amount(prod.min_stock_alert or prod.reorder_level or Decimal("0.00")),
        warehouse_location=prod.warehouse_location or "Main Warehouse",
        current_stock=quantize_amount(prod.current_stock or Decimal("0.00")),
        is_active=prod.is_active,
        income_account_name=prod.income_account.name if prod.income_account else None,
        expense_account_name=prod.expense_account.name if prod.expense_account else None,
        inventory_account_name=prod.inventory_account.name if prod.inventory_account else None,
        created_at=prod.created_at,
        updated_at=prod.updated_at
    )
    return resp

@router.get("/products/summary", response_model=ItemSummaryResponse)
@router.get("/items/summary", response_model=ItemSummaryResponse)
def get_items_summary(
    entity_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        target_id = entity_id
    elif current_user.default_entity_id:
        target_id = current_user.default_entity_id
    else:
        tenant_ids = get_tenant_entity_ids(current_user, db)
        target_id = tenant_ids[0] if tenant_ids else None

    if not target_id:
        raise HTTPException(status_code=400, detail="Entity ID is required to calculate item summary")

    base = db.query(Product).filter(Product.entity_id == target_id)
    total_items = base.count()
    active_items = base.filter(Product.is_active == True).count()
    inactive_items = base.filter(Product.is_active == False).count()
    products_count = base.filter(Product.product_type.in_(["PRODUCT", "GOODS"])).count()
    services_count = base.filter(Product.product_type == "SERVICE").count()
    
    inventory_tracked = base.filter(
        Product.track_inventory == True,
        Product.product_type != "SERVICE"
    ).count()

    low_stock_items = base.filter(
        Product.is_active == True,
        Product.track_inventory == True,
        Product.product_type != "SERVICE",
        Product.current_stock <= func.coalesce(Product.reorder_level, Product.min_stock_alert, 0)
    ).count()

    return ItemSummaryResponse(
        total_items=total_items,
        inventory_tracked=inventory_tracked,
        active_items=active_items,
        inactive_items=inactive_items,
        low_stock_items=low_stock_items,
        products_count=products_count,
        services_count=services_count
    )

@router.get("/products/categories", response_model=List[str])
@router.get("/items/categories", response_model=List[str])
def get_item_categories(
    entity_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        target_id = entity_id
    elif current_user.default_entity_id:
        target_id = current_user.default_entity_id
    else:
        tenant_ids = get_tenant_entity_ids(current_user, db)
        target_id = tenant_ids[0] if tenant_ids else None

    if not target_id:
        return []

    cats = db.query(Product.category).filter(
        Product.entity_id == target_id,
        Product.category.isnot(None),
        Product.category != ""
    ).distinct().all()

    return sorted(list(set(c[0] for c in cats if c[0] and c[0].strip())))

@router.get("/products", response_model=Union[PaginatedResponse[ProductResponse], List[ProductResponse]])
@router.get("/items", response_model=Union[PaginatedResponse[ProductResponse], List[ProductResponse]])
def get_products(
    entity_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    name_search: Optional[str] = Query(None),
    sku_search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product).options(
        joinedload(Product.income_account),
        joinedload(Product.expense_account),
        joinedload(Product.inventory_account)
    )
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)

    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Product.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Product.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Product.entity_id == current_user.default_entity_id)

    # General Search (name or sku)
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(or_(Product.name.ilike(s), Product.sku.ilike(s)))

    # Specific Name Search
    if name_search and name_search.strip():
        query = query.filter(Product.name.ilike(f"%{name_search.strip()}%"))

    # Specific SKU Search
    if sku_search and sku_search.strip():
        query = query.filter(Product.sku.ilike(f"%{sku_search.strip()}%"))

    # Type Filter
    if type and type.strip().upper() != "ALL":
        t_upper = type.strip().upper()
        if t_upper in ["PRODUCT", "GOODS"]:
            query = query.filter(Product.product_type.in_(["PRODUCT", "GOODS"]))
        elif t_upper == "SERVICE":
            query = query.filter(Product.product_type == "SERVICE")

    # Status Filter
    if status and status.strip().upper() != "ALL":
        st_upper = status.strip().upper()
        if st_upper == "ACTIVE":
            query = query.filter(Product.is_active == True)
        elif st_upper == "INACTIVE":
            query = query.filter(Product.is_active == False)

    # Category Filter
    if category and category.strip().upper() != "ALL":
        query = query.filter(Product.category.ilike(category.strip()))

    return paginate_or_all(
        query.order_by(Product.name.asc()), 
        page=page, 
        page_size=page_size, 
        paginate=paginate,
        item_transform=serialize_product
    )

@router.get("/products/{product_id}", response_model=ProductResponse)
@router.get("/items/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).options(
        joinedload(Product.income_account),
        joinedload(Product.expense_account),
        joinedload(Product.inventory_account)
    ).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Item not found")
    verify_entity_access(prod.entity_id, current_user, db)
    return serialize_product(prod)


def validate_product_account_mappings(
    db: Session,
    entity_id: int,
    product_type: str,
    sales_account_id: Optional[int] = None,
    purchase_account_id: Optional[int] = None,
    inventory_account_id: Optional[int] = None,
    track_inventory: bool = False
):
    """
    Strictly validates chart of accounts mappings for products and services:
    - Sales Account must be an active REVENUE account belonging to the company/entity.
    - Inventory Account must be an active ASSET account belonging to the company/entity.
    - Purchase / COGS Account must be an active EXPENSE account belonging to the company/entity.
      For products (goods / merchandise), it must be an approved COGS or direct cost account.
    """
    if sales_account_id is not None:
        sales_acc = db.query(Account).filter(
            Account.id == sales_account_id,
            Account.entity_id == entity_id
        ).first()
        if not sales_acc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales Account #{sales_account_id} not found for this company/entity."
            )
        if sales_acc.account_type != AccountType.REVENUE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales Account must be a REVENUE account. '{sales_acc.code} - {sales_acc.name}' is an {sales_acc.account_type.value} account."
            )
        if not sales_acc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales Account '{sales_acc.code} - {sales_acc.name}' is inactive."
            )

    if inventory_account_id is not None:
        inv_acc = db.query(Account).filter(
            Account.id == inventory_account_id,
            Account.entity_id == entity_id
        ).first()
        if not inv_acc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory Account #{inventory_account_id} not found for this company/entity."
            )
        if inv_acc.account_type != AccountType.ASSET:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory Account must be an ASSET account. '{inv_acc.code} - {inv_acc.name}' is an {inv_acc.account_type.value} account."
            )
        if not inv_acc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory Account '{inv_acc.code} - {inv_acc.name}' is inactive."
            )

    if purchase_account_id is not None:
        pur_acc = db.query(Account).filter(
            Account.id == purchase_account_id,
            Account.entity_id == entity_id
        ).first()
        if not pur_acc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Purchase / COGS Account #{purchase_account_id} not found for this company/entity."
            )
        if pur_acc.account_type != AccountType.EXPENSE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Purchase Account must be an active EXPENSE account. '{pur_acc.code} - {pur_acc.name}' is an {pur_acc.account_type.value} account."
            )
        if not pur_acc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Purchase / COGS Account '{pur_acc.code} - {pur_acc.name}' is inactive."
            )
        if (product_type or "").upper() in ["PRODUCT", "GOODS"]:
            if not is_valid_cogs_account(pur_acc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Purchase Account for products must be a valid Cost of Goods Sold (COGS) "
                        f"or direct cost account (e.g. 5700). '{pur_acc.code} - {pur_acc.name}' "
                        f"is an operating expense and cannot be mapped as product COGS."
                    )
                )


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/items", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: ProductCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(prod_in.entity_id, current_user, db)

    # Validation: Item Name
    if not prod_in.name or not prod_in.name.strip():
        raise HTTPException(status_code=400, detail="Item Name is required.")

    # Validation: SKU Uniqueness per company
    sku_val = prod_in.sku.strip() if prod_in.sku and prod_in.sku.strip() else None
    if sku_val:
        existing_sku = db.query(Product).filter(
            Product.entity_id == prod_in.entity_id,
            func.lower(Product.sku) == func.lower(sku_val)
        ).first()
        if existing_sku:
            raise HTTPException(status_code=400, detail=f"SKU '{sku_val}' already exists for this entity.")

    # Product vs Service Rules
    raw_type = (prod_in.product_type or "PRODUCT").strip().upper()
    is_service = raw_type == "SERVICE"

    if is_service:
        p_type = "SERVICE"
        track_inv = False
        op_stock = Decimal("0.00")
        op_rate = Decimal("0.00")
        reorder_lvl = Decimal("0.00")
        inv_acc_id = None
        warehouse = None
        curr_stock = Decimal("0.00")
    else:
        p_type = "PRODUCT" if raw_type in ["PRODUCT", "GOODS"] else raw_type
        track_inv = bool(prod_in.track_inventory)
        op_stock = Decimal(str(prod_in.opening_stock or 0)) if track_inv else Decimal("0.00")
        op_rate = Decimal(str(prod_in.opening_stock_rate or 0)) if track_inv else Decimal("0.00")
        reorder_lvl = Decimal(str(prod_in.reorder_level or prod_in.min_stock_alert or 0)) if track_inv else Decimal("0.00")
        inv_acc_id = prod_in.inventory_account_id if track_inv else None
        warehouse = prod_in.warehouse_location or "Main Warehouse" if track_inv else None
        # In Phase 1, initializing product stock to opening stock without creating General Ledger journals
        curr_stock = op_stock if track_inv else Decimal("0.00")

    inc_acc_id = prod_in.sales_account_id or prod_in.income_account_id
    exp_acc_id = prod_in.purchase_account_id or prod_in.expense_account_id

    # Strict Chart of Accounts validation
    validate_product_account_mappings(
        db=db,
        entity_id=prod_in.entity_id,
        product_type=p_type,
        sales_account_id=inc_acc_id,
        purchase_account_id=exp_acc_id,
        inventory_account_id=inv_acc_id,
        track_inventory=track_inv
    )

    prod = Product(
        entity_id=prod_in.entity_id,
        name=prod_in.name.strip(),
        sku=sku_val,
        product_type=p_type,
        category=prod_in.category.strip() if prod_in.category and prod_in.category.strip() else None,
        unit=(prod_in.unit or "PCS").strip().upper(),
        description=prod_in.description.strip() if prod_in.description and prod_in.description.strip() else None,
        selling_price=Decimal(str(prod_in.selling_price or 0)),
        purchase_price=Decimal(str(prod_in.purchase_price or 0)),
        hsn_sac_code=prod_in.hsn_sac_code.strip() if prod_in.hsn_sac_code and prod_in.hsn_sac_code.strip() else None,
        tax_rate=Decimal(str(prod_in.tax_rate if prod_in.tax_rate is not None else 18.00)),
        income_account_id=inc_acc_id,
        expense_account_id=exp_acc_id,
        inventory_account_id=inv_acc_id,
        track_inventory=track_inv,
        opening_stock=op_stock,
        opening_stock_rate=op_rate,
        reorder_level=reorder_lvl,
        min_stock_alert=reorder_lvl,
        warehouse_location=warehouse,
        current_stock=curr_stock,
        is_active=True
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    log_audit(
        db=db,
        action="CREATE",
        record_type="Product",
        record_id=str(prod.id),
        user=current_user,
        entity_id=prod.entity_id,
        details=f"Created {p_type} item '{prod.name}' (SKU: {prod.sku or 'N/A'}, Track Inventory: {track_inv})"
    )

    return serialize_product(prod)

@router.put("/products/{product_id}", response_model=ProductResponse)
@router.put("/items/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    prod_in: ProductUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Item not found")
    verify_entity_access(prod.entity_id, current_user, db)

    # Check SKU uniqueness if changed
    if prod_in.sku is not None:
        sku_clean = prod_in.sku.strip() if prod_in.sku.strip() else None
        if sku_clean:
            conflict = db.query(Product).filter(
                Product.entity_id == prod.entity_id,
                Product.id != prod.id,
                func.lower(Product.sku) == func.lower(sku_clean)
            ).first()
            if conflict:
                raise HTTPException(status_code=400, detail=f"SKU '{sku_clean}' already exists for this entity.")
        prod.sku = sku_clean

    if prod_in.name is not None:
        if not prod_in.name.strip():
            raise HTTPException(status_code=400, detail="Item Name cannot be empty.")
        prod.name = prod_in.name.strip()

    target_type = prod.product_type
    if prod_in.product_type is not None:
        raw_t = prod_in.product_type.strip().upper()
        target_type = "SERVICE" if raw_t == "SERVICE" else ("PRODUCT" if raw_t in ["PRODUCT", "GOODS"] else raw_t)
        prod.product_type = target_type
        if target_type == "SERVICE":
            prod.track_inventory = False

    target_sales_id = None
    if prod_in.sales_account_id is not None:
        target_sales_id = prod_in.sales_account_id
    elif prod_in.income_account_id is not None:
        target_sales_id = prod_in.income_account_id

    target_pur_id = None
    if prod_in.purchase_account_id is not None:
        target_pur_id = prod_in.purchase_account_id
    elif prod_in.expense_account_id is not None:
        target_pur_id = prod_in.expense_account_id

    target_inv_id = prod_in.inventory_account_id

    # Validate accounts being modified
    validate_product_account_mappings(
        db=db,
        entity_id=prod.entity_id,
        product_type=target_type,
        sales_account_id=target_sales_id,
        purchase_account_id=target_pur_id,
        inventory_account_id=target_inv_id,
        track_inventory=prod_in.track_inventory if prod_in.track_inventory is not None else prod.track_inventory
    )

    if prod_in.category is not None:
        prod.category = prod_in.category.strip() if prod_in.category.strip() else None
    if prod_in.unit is not None:
        prod.unit = prod_in.unit.strip().upper()
    if prod_in.description is not None:
        prod.description = prod_in.description.strip() if prod_in.description.strip() else None
    if prod_in.selling_price is not None:
        prod.selling_price = prod_in.selling_price
    if prod_in.purchase_price is not None:
        prod.purchase_price = prod_in.purchase_price
    if prod_in.hsn_sac_code is not None:
        prod.hsn_sac_code = prod_in.hsn_sac_code.strip() if prod_in.hsn_sac_code.strip() else None
    if prod_in.tax_rate is not None:
        prod.tax_rate = prod_in.tax_rate

    if target_sales_id is not None:
        prod.income_account_id = target_sales_id

    if target_pur_id is not None:
        prod.expense_account_id = target_pur_id

    if target_inv_id is not None:
        prod.inventory_account_id = target_inv_id

    if prod_in.track_inventory is not None:
        if (prod.product_type or "").upper() == "SERVICE":
            prod.track_inventory = False
        else:
            prod.track_inventory = prod_in.track_inventory

    if prod_in.opening_stock is not None:
        prod.opening_stock = prod_in.opening_stock
    if prod_in.opening_stock_rate is not None:
        prod.opening_stock_rate = prod_in.opening_stock_rate

    if prod_in.reorder_level is not None:
        prod.reorder_level = prod_in.reorder_level
        prod.min_stock_alert = prod_in.reorder_level
    elif prod_in.min_stock_alert is not None:
        prod.reorder_level = prod_in.min_stock_alert
        prod.min_stock_alert = prod_in.min_stock_alert

    if prod_in.warehouse_location is not None:
        prod.warehouse_location = prod_in.warehouse_location
    if prod_in.current_stock is not None:
        prod.current_stock = prod_in.current_stock
    if prod_in.is_active is not None:
        prod.is_active = prod_in.is_active

    db.commit()
    db.refresh(prod)

    log_audit(
        db=db,
        action="UPDATE",
        record_type="Product",
        record_id=str(prod.id),
        user=current_user,
        entity_id=prod.entity_id,
        details=f"Updated item '{prod.name}' (SKU: {prod.sku or 'N/A'})"
    )

    return serialize_product(prod)

@router.patch("/products/{product_id}/status", response_model=ProductResponse)
@router.patch("/items/{product_id}/status", response_model=ProductResponse)
def toggle_product_status(
    product_id: int,
    status_in: ProductStatusUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Item not found")
    verify_entity_access(prod.entity_id, current_user, db)

    prod.is_active = status_in.is_active
    db.commit()
    db.refresh(prod)

    state_str = "Activated" if prod.is_active else "Deactivated"
    log_audit(
        db=db,
        action="STATUS_CHANGE",
        record_type="Product",
        record_id=str(prod.id),
        user=current_user,
        entity_id=prod.entity_id,
        details=f"{state_str} item '{prod.name}'"
    )

    return serialize_product(prod)

# =========================================================================
# 3. SALES INVOICES
# =========================================================================
@router.get("/invoices", response_model=Union[PaginatedResponse[InvoiceResponse], List[InvoiceResponse]])
def get_invoices(
    entity_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
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

    ordered_query = query.order_by(desc(Invoice.invoice_date), desc(Invoice.id))

    def transform_invoice(inv):
        res = InvoiceResponse.model_validate(inv, from_attributes=True)
        if inv.customer:
            res.customer_name = inv.customer.name
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_invoice)


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
        payment_token=uuid.uuid4().hex,
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
@router.get("/payments/customer", response_model=Union[PaginatedResponse[CustomerPaymentResponse], List[CustomerPaymentResponse]])
@router.get("/payments", response_model=Union[PaginatedResponse[CustomerPaymentResponse], List[CustomerPaymentResponse]])
def get_customer_payments(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
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

    ordered_query = query.order_by(desc(CustomerPayment.payment_date), desc(CustomerPayment.id))

    def transform_payment(p):
        res = CustomerPaymentResponse.model_validate(p, from_attributes=True)
        if p.customer:
            res.customer_name = p.customer.name
        if p.invoice:
            res.invoice_number = p.invoice.invoice_number
        if p.deposit_account:
            res.deposit_account_name = f"{p.deposit_account.code} - {p.deposit_account.name}"
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_payment)


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
@router.get("/estimates", response_model=Union[PaginatedResponse[EstimateResponse], List[EstimateResponse]])
def get_estimates(
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
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

    ordered_query = query.order_by(desc(Estimate.estimate_date), desc(Estimate.id))

    def transform_estimate(est):
        res = EstimateResponse.model_validate(est, from_attributes=True)
        if est.customer:
            res.customer_name = est.customer.name
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_estimate)


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
@router.get("/orders", response_model=Union[PaginatedResponse[SalesOrderResponse], List[SalesOrderResponse]])
def get_sales_orders(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(SalesOrder).options(joinedload(SalesOrder.customer), joinedload(SalesOrder.lines))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(SalesOrder.entity_id == entity_id)
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)

    ordered_query = query.order_by(desc(SalesOrder.order_date), desc(SalesOrder.id))

    def transform_so(so):
        res = SalesOrderResponse.model_validate(so, from_attributes=True)
        if so.customer:
            res.customer_name = so.customer.name
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_so)


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
@router.get("/credit-notes", response_model=Union[PaginatedResponse[CreditNoteResponse], List[CreditNoteResponse]])
def get_credit_notes(
    entity_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CreditNote).options(joinedload(CreditNote.customer), joinedload(CreditNote.invoice))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(CreditNote.entity_id == entity_id)
    if customer_id:
        query = query.filter(CreditNote.customer_id == customer_id)

    ordered_query = query.order_by(desc(CreditNote.credit_note_date), desc(CreditNote.id))

    def transform_cn(cn):
        res = CreditNoteResponse.model_validate(cn, from_attributes=True)
        if cn.customer:
            res.customer_name = cn.customer.name
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_cn)


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
@router.get("/recurring", response_model=Union[PaginatedResponse[RecurringInvoiceResponse], List[RecurringInvoiceResponse]])
def get_recurring_invoices(
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RecurringInvoice).options(joinedload(RecurringInvoice.customer))
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(RecurringInvoice.entity_id == entity_id)

    ordered_query = query.order_by(desc(RecurringInvoice.created_at))

    def transform_recurring(r):
        res = RecurringInvoiceResponse.model_validate(r, from_attributes=True)
        if r.customer:
            res.customer_name = r.customer.name
        return res

    return paginate_or_all(ordered_query, page=page, page_size=page_size, paginate=paginate, item_transform=transform_recurring)


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

# =========================================================================
# 8. PAYMENT GATEWAY & INBOUND INVOICE COLLECTION
# =========================================================================
@router.get("/invoices/{id}/payment-link")
def get_invoice_payment_link(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    verify_entity_access(invoice.entity_id, current_user, db)

    if not invoice.payment_token:
        invoice.payment_token = uuid.uuid4().hex
        db.commit()
        db.refresh(invoice)

    entity = db.query(Entity).filter(Entity.id == invoice.entity_id).first()
    upi_id = entity.upi_id if entity else None
    
    # UPI standard deep-link URI
    upi_uri = None
    if upi_id:
        import urllib.parse
        entity_encoded = urllib.parse.quote(entity.name or "RicozBooks")
        inv_encoded = urllib.parse.quote(f"Invoice {invoice.invoice_number}")
        upi_uri = f"upi://pay?pa={upi_id}&pn={entity_encoded}&am={invoice.balance_amount}&cu=INR&tn={inv_encoded}"

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "payment_token": invoice.payment_token,
        "payment_link": f"/pay/{invoice.payment_token}",
        "balance_amount": invoice.balance_amount,
        "currency": invoice.currency,
        "upi_id": upi_id,
        "upi_uri": upi_uri,
        "status": invoice.status
    }

@router.get("/public/invoices/{token}", response_model=PublicInvoiceResponse)
def get_public_invoice(
    token: str,
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.entity),
        joinedload(Invoice.customer),
        joinedload(Invoice.lines)
    ).filter(Invoice.payment_token == token).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or link has expired")

    lines_res = [InvoiceLineResponse.model_validate(line, from_attributes=True) for line in invoice.lines]

    return PublicInvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        payment_token=invoice.payment_token,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        status=invoice.status,
        subtotal=invoice.subtotal,
        taxable_amount=invoice.taxable_amount,
        cgst_amount=invoice.cgst_amount,
        sgst_amount=invoice.sgst_amount,
        igst_amount=invoice.igst_amount,
        total_tax=invoice.total_tax,
        total_amount=invoice.total_amount,
        paid_amount=invoice.paid_amount,
        balance_amount=invoice.balance_amount,
        currency=invoice.currency,
        notes=invoice.notes,
        terms=invoice.terms,
        entity_name=invoice.entity.name if invoice.entity else "Organization",
        entity_legal_name=invoice.entity.legal_name if invoice.entity else None,
        entity_gstin=invoice.entity.gstin if invoice.entity else None,
        entity_address=invoice.entity.address if invoice.entity else None,
        entity_upi_id=invoice.entity.upi_id if invoice.entity else None,
        razorpay_key_id=invoice.entity.razorpay_key_id if invoice.entity else None,
        payment_gateway_active=invoice.entity.payment_gateway_active if invoice.entity else True,
        customer_name=invoice.customer.name if invoice.customer else "Valued Client",
        customer_email=invoice.customer.email if invoice.customer else None,
        customer_phone=invoice.customer.phone if invoice.customer else None,
        lines=lines_res
    )

@router.post("/public/invoices/{token}/pay", response_model=PublicInvoicePaymentResponse)
def pay_public_invoice(
    token: str,
    pay_req: PublicInvoicePaymentRequest,
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.entity),
        joinedload(Invoice.customer)
    ).filter(Invoice.payment_token == token).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or link has expired")

    if invoice.status == InvoiceStatus.PAID.value or invoice.balance_amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Invoice is already fully paid.")

    pay_amount = quantize_amount(pay_req.amount)
    if pay_amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")
    if pay_amount > invoice.balance_amount:
        raise HTTPException(status_code=400, detail=f"Payment amount cannot exceed remaining balance of {invoice.balance_amount}")

    deposit_acc = get_or_create_account(
        db, invoice.entity_id, "1100", "Bank Accounts / Online Gateway", 
        AccountType.ASSET, NormalBalance.DEBIT, invoice.currency
    )

    pay_no = generate_payment_number(db, invoice.entity_id)
    ref_no = pay_req.gateway_payment_id or pay_req.reference_number or f"GATEWAY-{uuid.uuid4().hex[:8].upper()}"

    payment = CustomerPayment(
        entity_id=invoice.entity_id,
        customer_id=invoice.customer_id,
        invoice_id=invoice.id,
        payment_number=pay_no,
        payment_date=date.today(),
        amount=pay_amount,
        payment_mode=pay_req.payment_mode or "UPI",
        deposit_account_id=deposit_acc.id,
        reference_number=ref_no,
        notes=f"Inbound online settlement via {pay_req.payment_mode}. Payer: {pay_req.payer_name or 'Online Portal'}"
    )
    db.add(payment)
    db.flush()

    record_customer_payment_transaction(db, payment, current_user=None)

    db.refresh(invoice)
    return PublicInvoicePaymentResponse(
        success=True,
        message=f"Payment of {invoice.currency} {pay_amount} successfully processed and settled!",
        payment_id=payment.id,
        invoice_number=invoice.invoice_number,
        amount_paid=pay_amount,
        remaining_balance=invoice.balance_amount,
        status=invoice.status,
        transaction_reference=ref_no
    )

@router.post("/payments/webhook")
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    payload = await request.json()
    event = payload.get("event", "payment.captured")
    payment_data = payload.get("payload", {}).get("payment", {}).get("entity", payload)
    
    notes = payment_data.get("notes", {})
    payment_token = notes.get("payment_token")
    
    if payment_token:
        invoice = db.query(Invoice).filter(Invoice.payment_token == payment_token).first()
        if invoice and invoice.balance_amount > 0:
            amount_in_rupees = Decimal(str(payment_data.get("amount", 0))) / Decimal("100.0") if "amount" in payment_data else invoice.balance_amount
            pay_amt = min(quantize_amount(amount_in_rupees), invoice.balance_amount)
            if pay_amt > 0:
                deposit_acc = get_or_create_account(
                    db, invoice.entity_id, "1100", "Bank Accounts / Online Gateway", 
                    AccountType.ASSET, NormalBalance.DEBIT, invoice.currency
                )
                payment = CustomerPayment(
                    entity_id=invoice.entity_id,
                    customer_id=invoice.customer_id,
                    invoice_id=invoice.id,
                    payment_number=generate_payment_number(db, invoice.entity_id),
                    payment_date=date.today(),
                    amount=pay_amt,
                    payment_mode="GATEWAY_WEBHOOK",
                    deposit_account_id=deposit_acc.id,
                    reference_number=payment_data.get("id", f"WH-{uuid.uuid4().hex[:8].upper()}"),
                    notes=f"Webhook event: {event}"
                )
                db.add(payment)
                db.flush()
                record_customer_payment_transaction(db, payment, current_user=None)
    
    return {"status": "ok", "event": event}


