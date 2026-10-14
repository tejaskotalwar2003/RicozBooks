import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.models.account import Account, AccountType, NormalBalance
from app.models.company import Entity
from app.models.sales import Product, ProductType, Customer, Invoice, InvoiceLine, InvoiceStatus
from app.models.inventory import InventoryMovement, InventoryMovementType
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.services.account_defaults import ensure_cogs_account
from app.services.inventory_engine import ensure_inventory_accounts

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def active_entity(auth_headers):
    res = client.get("/api/v1/entities", headers=auth_headers)
    assert res.status_code == 200
    entities = res.json()
    assert len(entities) > 0
    return entities[0]


@pytest.fixture(scope="module")
def accounts_setup(active_entity):
    db: Session = SessionLocal()
    entity_id = active_entity["id"]
    
    # Ensure COGS 5700 and Inventory 1300 exist
    cogs_acc = ensure_cogs_account(db, entity_id, "INR")
    inv_asset_acc, _, _ = ensure_inventory_accounts(db, entity_id)

    sales_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "4000").first()
    if not sales_acc:
        sales_acc = Account(
            entity_id=entity_id,
            code="4000",
            name="Operating Sales Revenue",
            account_type=AccountType.REVENUE,
            normal_balance=NormalBalance.CREDIT,
            currency="INR",
            is_active=True
        )
        db.add(sales_acc)
        db.commit()
        db.refresh(sales_acc)

    sales_id = sales_acc.id
    cogs_id = cogs_acc.id
    inv_id = inv_asset_acc.id
    db.close()
    return {
        "sales": sales_id,
        "cogs": cogs_id,
        "inventory": inv_id
    }


@pytest.fixture(scope="module")
def test_customer(active_entity, auth_headers):
    payload = {
        "entity_id": active_entity["id"],
        "name": f"Test Enterprise Customer {uuid.uuid4().hex[:6]}",
        "email": f"cust_{uuid.uuid4().hex[:6]}@example.com",
        "city": "Mumbai",
        "state": "Maharashtra",
        "payment_terms_days": 30
    }
    res = client.post("/api/v1/customers", headers=auth_headers, json=payload)
    assert res.status_code == 201, res.text
    return res.json()


# =========================================================================
# 1. TEST SCENARIO SECTION 14: WATER BOTTLE
# =========================================================================
def test_section_14_water_bottle_scenario(active_entity, auth_headers, test_customer, accounts_setup):
    """
    PRODUCT:
    Water Bottle
    Type: Product
    Track Inventory: YES
    Opening Stock: 50
    Opening Stock Rate: ₹10
    Sales Account: 4000 - Operating Sales Revenue
    COGS Account: 5700 - Cost of Goods Sold (COGS)
    Inventory Account: 1300 - Merchandise Inventory

    SALES INVOICE:
    Quantity: 2
    Selling Price: ₹20 (Tax: 0% for direct comparison)

    EXPECTED:
    Sales Value: ₹40 before applicable taxes
    Stock Before Posting: 50
    Stock After Posting: 48
    Inventory Movement: SALES_DISPATCH, Quantity: 2, Total Cost: 20
    COGS: ₹20
    Inventory Reduction: ₹20
    Sales Revenue: ₹40
    GL:
      Dr Customer/AR ₹40
      Cr Sales Revenue ₹40
      Dr COGS ₹20
      Cr Inventory ₹20
    """
    db: Session = SessionLocal()
    entity_id = active_entity["id"]

    # 1. Create Product
    product_sku = f"WB-{uuid.uuid4().hex[:6].upper()}"
    prod_payload = {
        "entity_id": entity_id,
        "name": "Water Bottle",
        "sku": product_sku,
        "product_type": "PRODUCT",
        "track_inventory": True,
        "opening_stock": 50.00,
        "current_stock": 50.00,
        "opening_stock_rate": 10.00,
        "selling_price": 20.00,
        "purchase_price": 10.00,
        "tax_rate": 0.00,
        "sales_account_id": accounts_setup["sales"],
        "purchase_account_id": accounts_setup["cogs"],
        "inventory_account_id": accounts_setup["inventory"]
    }
    prod_res = client.post("/api/v1/items", headers=auth_headers, json=prod_payload)
    assert prod_res.status_code == 201, prod_res.text
    product_data = prod_res.json()
    product_id = product_data["id"]

    # Stock Before Posting: 50
    assert float(product_data["current_stock"]) == 50.0

    # 2. Create Sales Invoice (Quantity: 2, Selling Price: ₹20)
    inv_payload = {
        "entity_id": entity_id,
        "customer_id": test_customer["id"],
        "invoice_date": "2026-10-14",
        "due_date": "2026-11-14",
        "currency": "INR",
        "lines": [
            {
                "product_id": product_id,
                "description": "Water Bottle",
                "quantity": 2.00,
                "unit_price": 20.00,
                "discount_pct": 0.00,
                "tax_rate": 0.00
            }
        ]
    }
    inv_res = client.post("/api/v1/invoices", headers=auth_headers, json=inv_payload)
    assert inv_res.status_code == 201, inv_res.text
    inv_data = inv_res.json()
    invoice_id = inv_data["id"]

    # Verify Invoice Draft status and totals
    assert inv_data["status"] == "DRAFT"
    assert float(inv_data["subtotal"]) == 40.00
    assert float(inv_data["total_amount"]) == 40.00

    # Verify Stock is UNCHANGED while in DRAFT
    prod_db = db.query(Product).filter(Product.id == product_id).first()
    assert float(prod_db.current_stock) == 50.00

    # Verify NO Inventory Movement before posting
    mov_count = db.query(InventoryMovement).filter(
        InventoryMovement.product_id == product_id,
        InventoryMovement.reference_id == inv_data["invoice_number"]
    ).count()
    assert mov_count == 0

    # 3. Post Invoice to General Ledger
    post_res = client.post(f"/api/v1/invoices/{invoice_id}/post", headers=auth_headers)
    assert post_res.status_code == 200, post_res.text
    posted_inv = post_res.json()
    assert posted_inv["status"] in ["SENT", "POSTED"]

    # 4. Verify Stock After Posting: 50 -> 48
    db.expire_all()
    prod_after = db.query(Product).filter(Product.id == product_id).first()
    assert float(prod_after.current_stock) == 48.00, f"Expected stock 48.00, got {prod_after.current_stock}"

    # 5. Verify Inventory Movement Record
    movement = db.query(InventoryMovement).filter(
        InventoryMovement.product_id == product_id,
        InventoryMovement.reference_id == inv_data["invoice_number"]
    ).first()
    assert movement is not None
    assert movement.movement_type == InventoryMovementType.SALES_DISPATCH
    assert float(movement.quantity) == 2.00
    assert float(movement.unit_cost) == 10.00
    assert float(movement.total_cost) == 20.00
    assert movement.reference_type == "INVOICE"
    assert movement.journal_entry_id is not None

    # 6. Verify General Ledger Entries
    je = db.query(JournalEntry).filter(JournalEntry.id == posted_inv["journal_entry_id"]).first()
    assert je is not None
    assert je.status == JournalStatus.POSTED
    assert float(je.total_debit) == 60.00  # ₹40 AR + ₹20 COGS
    assert float(je.total_credit) == 60.00 # ₹40 Sales Rev + ₹20 Inventory Reduction
    assert je.total_debit == je.total_credit

    # Check individual journal lines
    je_lines = db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id == je.id).all()
    line_accounts = {l.account_id: l for l in je_lines}

    # AR line (debit 40)
    ar_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "1200").first()
    assert ar_acc.id in line_accounts
    assert float(line_accounts[ar_acc.id].debit) == 40.00
    assert float(line_accounts[ar_acc.id].credit) == 0.00

    # Sales Revenue line (credit 40)
    sales_acc_id = accounts_setup["sales"]
    assert sales_acc_id in line_accounts
    assert float(line_accounts[sales_acc_id].credit) == 40.00
    assert float(line_accounts[sales_acc_id].debit) == 0.00

    # COGS line (debit 20)
    cogs_acc_id = accounts_setup["cogs"]
    assert cogs_acc_id in line_accounts
    assert float(line_accounts[cogs_acc_id].debit) == 20.00
    assert float(line_accounts[cogs_acc_id].credit) == 0.00

    # Inventory line (credit 20)
    inv_acc_id = accounts_setup["inventory"]
    assert inv_acc_id in line_accounts
    assert float(line_accounts[inv_acc_id].credit) == 20.00
    assert float(line_accounts[inv_acc_id].debit) == 0.00

    db.close()


# =========================================================================
# 2. REGRESSION & IDEMPOTENCY: NO DOUBLE POSTING
# =========================================================================
def test_idempotent_posting_prevents_duplicate_effects(active_entity, auth_headers, test_customer, accounts_setup):
    """
    Verifies that calling /post on an already posted invoice raises HTTP 400
    and does NOT double decrement stock or duplicate journal entries.
    """
    db: Session = SessionLocal()
    entity_id = active_entity["id"]

    prod_res = client.post("/api/v1/items", headers=auth_headers, json={
        "entity_id": entity_id,
        "name": "Single Post Item",
        "sku": f"SP-{uuid.uuid4().hex[:6].upper()}",
        "track_inventory": True,
        "opening_stock": 10.00,
        "current_stock": 10.00,
        "purchase_price": 5.00,
        "selling_price": 15.00,
        "tax_rate": 0.00
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    inv_res = client.post("/api/v1/invoices", headers=auth_headers, json={
        "entity_id": entity_id,
        "customer_id": test_customer["id"],
        "invoice_date": "2026-10-14",
        "lines": [{"product_id": prod_id, "description": "Single Post Item", "quantity": 3.00, "unit_price": 15.00, "tax_rate": 0.00}]
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # First post: succeeds
    res1 = client.post(f"/api/v1/invoices/{inv_id}/post", headers=auth_headers)
    assert res1.status_code == 200

    prod_after1 = db.query(Product).filter(Product.id == prod_id).first()
    assert float(prod_after1.current_stock) == 7.00

    # Second post: MUST FAIL
    res2 = client.post(f"/api/v1/invoices/{inv_id}/post", headers=auth_headers)
    assert res2.status_code == 400
    assert "already posted" in res2.text.lower()

    # Stock must remain 7.00
    db.expire_all()
    prod_after2 = db.query(Product).filter(Product.id == prod_id).first()
    assert float(prod_after2.current_stock) == 7.00

    # Exactly 1 InventoryMovement
    movs = db.query(InventoryMovement).filter(InventoryMovement.product_id == prod_id).all()
    assert len(movs) == 1

    db.close()


# =========================================================================
# 3. NEGATIVE STOCK BLOCKED
# =========================================================================
def test_insufficient_stock_blocks_posting(active_entity, auth_headers, test_customer):
    """
    Verifies that when an invoice requires more stock than available,
    posting is rejected with HTTP 400 and stock is untouched.
    """
    db: Session = SessionLocal()
    entity_id = active_entity["id"]

    prod_res = client.post("/api/v1/items", headers=auth_headers, json={
        "entity_id": entity_id,
        "name": "Limited Stock Item",
        "sku": f"LIM-{uuid.uuid4().hex[:6].upper()}",
        "track_inventory": True,
        "opening_stock": 3.00,
        "current_stock": 3.00,
        "purchase_price": 10.00,
        "selling_price": 25.00,
        "tax_rate": 0.00
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # Create invoice requesting 5 (available is only 3)
    inv_res = client.post("/api/v1/invoices", headers=auth_headers, json={
        "entity_id": entity_id,
        "customer_id": test_customer["id"],
        "invoice_date": "2026-10-14",
        "lines": [{"product_id": prod_id, "description": "Limited Item", "quantity": 5.00, "unit_price": 25.00, "tax_rate": 0.00}]
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # Post must be rejected
    post_res = client.post(f"/api/v1/invoices/{inv_id}/post", headers=auth_headers)
    assert post_res.status_code == 400
    assert "insufficient stock" in post_res.text.lower()

    # Stock must remain untouched at 3.00
    db.expire_all()
    prod_after = db.query(Product).filter(Product.id == prod_id).first()
    assert float(prod_after.current_stock) == 3.00

    # No movements created
    mov_count = db.query(InventoryMovement).filter(InventoryMovement.product_id == prod_id).count()
    assert mov_count == 0

    db.close()


# =========================================================================
# 4. SERVICES AND NON-TRACKED ITEMS DO NOT AFFECT INVENTORY
# =========================================================================
def test_services_do_not_affect_inventory(active_entity, auth_headers, test_customer):
    """
    Verifies that products with track_inventory=False or product_type=SERVICE
    do NOT reduce stock or create InventoryMovement records.
    """
    db: Session = SessionLocal()
    entity_id = active_entity["id"]

    serv_res = client.post("/api/v1/items", headers=auth_headers, json={
        "entity_id": entity_id,
        "name": "Consulting Advisory Service",
        "sku": f"SRV-{uuid.uuid4().hex[:6].upper()}",
        "product_type": "SERVICE",
        "track_inventory": False,
        "opening_stock": 0.00,
        "current_stock": 0.00,
        "purchase_price": 0.00,
        "selling_price": 1000.00,
        "tax_rate": 0.00
    })
    assert serv_res.status_code == 201
    serv_id = serv_res.json()["id"]

    inv_res = client.post("/api/v1/invoices", headers=auth_headers, json={
        "entity_id": entity_id,
        "customer_id": test_customer["id"],
        "invoice_date": "2026-10-14",
        "lines": [{"product_id": serv_id, "description": "Strategic Advisory", "quantity": 1.00, "unit_price": 1000.00, "tax_rate": 0.00}]
    })
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    post_res = client.post(f"/api/v1/invoices/{inv_id}/post", headers=auth_headers)
    assert post_res.status_code == 200

    # Stock remains 0
    db.expire_all()
    serv_db = db.query(Product).filter(Product.id == serv_id).first()
    assert float(serv_db.current_stock) == 0.00

    # No movements
    mov_count = db.query(InventoryMovement).filter(InventoryMovement.product_id == serv_id).count()
    assert mov_count == 0

    # Journal Entry has only AR and Sales Revenue (no COGS/Inventory lines)
    inv_posted = post_res.json()
    je_lines = db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id == inv_posted["journal_entry_id"]).all()
    assert len(je_lines) == 2  # 1 Debit AR, 1 Credit Revenue

    db.close()


# =========================================================================
# 5. INACTIVE ITEMS BLOCKED
# =========================================================================
def test_inactive_item_cannot_be_invoiced(active_entity, auth_headers, test_customer):
    """
    Verifies that inactive items cannot be added to an invoice or posted.
    """
    entity_id = active_entity["id"]

    prod_res = client.post("/api/v1/items", headers=auth_headers, json={
        "entity_id": entity_id,
        "name": "Deactivated Widget",
        "sku": f"DEACT-{uuid.uuid4().hex[:6].upper()}",
        "product_type": "PRODUCT",
        "track_inventory": True,
        "opening_stock": 20.00,
        "current_stock": 20.00,
        "selling_price": 50.00,
        "tax_rate": 0.00
    })
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # Deactivate item
    deact_res = client.patch(f"/api/v1/items/{prod_id}/status", headers=auth_headers, json={"is_active": False})
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Attempt to create invoice with inactive item
    inv_res = client.post("/api/v1/invoices", headers=auth_headers, json={
        "entity_id": entity_id,
        "customer_id": test_customer["id"],
        "invoice_date": "2026-10-14",
        "lines": [{"product_id": prod_id, "description": "Deactivated Widget", "quantity": 1.00, "unit_price": 50.00, "tax_rate": 0.00}]
    })
    assert inv_res.status_code == 400
    assert "inactive" in inv_res.text.lower()
