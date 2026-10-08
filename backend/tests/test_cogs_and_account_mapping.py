import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.models.account import Account, AccountType, NormalBalance
from app.models.company import Entity
from app.models.sales import Product
from app.services.account_defaults import (
    STANDARD_COGS_CODE, 
    STANDARD_COGS_NAME, 
    ensure_standard_accounts_for_all_entities,
    is_valid_cogs_account
)

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
def standard_accounts_for_entity(active_entity):
    db: Session = SessionLocal()
    entity_id = active_entity["id"]
    sales_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "4000").first()
    cogs_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "5700").first()
    inv_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "1300").first()
    salary_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "5000").first()
    rent_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "5100").first()
    ap_acc = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "2000").first()
    db.close()
    return {
        "sales": sales_acc,
        "cogs": cogs_acc,
        "inventory": inv_acc,
        "salary": salary_acc,
        "rent": rent_acc,
        "ap": ap_acc,
    }


def test_standard_cogs_account_attributes_and_provisioning(active_entity):
    """
    1. Verify 5700 exists.
    2. Verify account name is: Cost of Goods Sold (COGS).
    3. Verify Category = EXPENSE.
    4. Verify Normal Balance = DEBIT.
    5. Verify Status = Active.
    6. Verify description is accurate.
    7. Verify account is provisioned for all applicable entities.
    """
    db: Session = SessionLocal()
    entity_id = active_entity["id"]

    cogs_acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == STANDARD_COGS_CODE
    ).first()

    assert cogs_acc is not None, f"COGS account {STANDARD_COGS_CODE} not found for entity {entity_id}"
    assert cogs_acc.name == STANDARD_COGS_NAME
    assert cogs_acc.account_type == AccountType.EXPENSE
    assert cogs_acc.normal_balance == NormalBalance.DEBIT
    assert cogs_acc.is_active is True
    assert "inventory" in (cogs_acc.description or "").lower() or "cost" in (cogs_acc.description or "").lower()

    # Verify all entities have 5700 COGS
    all_entities = db.query(Entity).all()
    for ent in all_entities:
        ent_cogs = db.query(Account).filter(
            Account.entity_id == ent.id,
            Account.code == STANDARD_COGS_CODE
        ).first()
        assert ent_cogs is not None, f"Entity {ent.id} ({ent.code}) is missing standard 5700 COGS account"
        assert ent_cogs.name == STANDARD_COGS_NAME
        assert ent_cogs.account_type == AccountType.EXPENSE

    db.close()


def test_cogs_duplicate_protection_and_idempotence():
    """
    6. Verify no duplicate 5700 account is created.
    Verify idempotency of provisioning.
    """
    db: Session = SessionLocal()
    # Call ensure_standard_accounts_for_all_entities repeatedly
    count1 = ensure_standard_accounts_for_all_entities(db)
    count2 = ensure_standard_accounts_for_all_entities(db)

    assert count1 == 0, "No new accounts should be created as all entities already have 5700"
    assert count2 == 0, "Repeated calls must be strictly idempotent"

    # Verify each entity has at most one 5700 account
    all_entities = db.query(Entity).all()
    for ent in all_entities:
        cogs_accounts = db.query(Account).filter(
            Account.entity_id == ent.id,
            Account.code == STANDARD_COGS_CODE
        ).all()
        assert len(cogs_accounts) == 1, f"Entity {ent.id} has duplicate 5700 accounts: {len(cogs_accounts)}"

    db.close()


def test_cross_entity_account_isolation(auth_headers, active_entity):
    """
    8. Verify one company/entity's account data cannot be assigned or accessed from another company context.
    """
    db: Session = SessionLocal()
    # Find another entity
    other_ent = db.query(Entity).filter(Entity.id != active_entity["id"]).first()
    assert other_ent is not None, "Need at least two entities to verify isolation"
    
    # Get an account from other entity
    other_acc = db.query(Account).filter(Account.entity_id == other_ent.id).first()
    db.close()

    assert other_acc is not None
    # Attempt to create product in active_entity using other_acc.id
    payload = {
        "entity_id": active_entity["id"],
        "name": f"Isolation Test Item {uuid.uuid4().hex[:6]}",
        "sku": f"ISO-{uuid.uuid4().hex[:6].upper()}",
        "product_type": "PRODUCT",
        "sales_account_id": other_acc.id
    }
    res = client.post("/api/v1/items", json=payload, headers=auth_headers)
    assert res.status_code == 400, "Must reject account belonging to a different entity"
    assert "not found for this company/entity" in res.json()["detail"].lower()


def test_reject_unrelated_expense_as_cogs(auth_headers, active_entity, standard_accounts_for_entity):
    """
    10. Verify 5000 - Salary & Payroll Expense cannot be selected as COGS for inventory products.
    11. Verify unrelated expense accounts (Salary, Rent) are rejected.
    12. Verify backend rejects invalid Purchase / COGS account IDs submitted directly through the API.
    """
    entity_id = active_entity["id"]
    salary_acc = standard_accounts_for_entity["salary"]
    rent_acc = standard_accounts_for_entity["rent"]
    sales_acc = standard_accounts_for_entity["sales"]
    inv_acc = standard_accounts_for_entity["inventory"]

    assert salary_acc is not None
    assert rent_acc is not None

    # 1. Salary Expense as COGS
    sku_bad_salary = f"BAD-SAL-{uuid.uuid4().hex[:6].upper()}"
    bad_salary_payload = {
        "entity_id": entity_id,
        "name": "Invalid Salary Item",
        "sku": sku_bad_salary,
        "product_type": "PRODUCT",
        "sales_account_id": sales_acc.id if sales_acc else None,
        "purchase_account_id": salary_acc.id,
        "inventory_account_id": inv_acc.id if inv_acc else None,
        "track_inventory": True
    }
    res = client.post("/api/v1/items", json=bad_salary_payload, headers=auth_headers)
    assert res.status_code == 400, res.text
    detail = res.json()["detail"].lower()
    assert "purchase account for products must be a valid cost of goods sold (cogs)" in detail or "operating expense" in detail

    # 2. Rent Expense as COGS
    sku_bad_rent = f"BAD-RNT-{uuid.uuid4().hex[:6].upper()}"
    bad_rent_payload = {
        "entity_id": entity_id,
        "name": "Invalid Rent Item",
        "sku": sku_bad_rent,
        "product_type": "PRODUCT",
        "purchase_account_id": rent_acc.id,
        "track_inventory": True
    }
    res = client.post("/api/v1/items", json=bad_rent_payload, headers=auth_headers)
    assert res.status_code == 400, res.text
    assert "operating expense" in res.json()["detail"].lower() or "cost of goods sold" in res.json()["detail"].lower()


def test_reject_non_revenue_as_sales_account(auth_headers, active_entity, standard_accounts_for_entity):
    """
    14. Verify backend rejects non-REVENUE accounts as Sales Account.
    """
    entity_id = active_entity["id"]
    cogs_acc = standard_accounts_for_entity["cogs"]
    inv_acc = standard_accounts_for_entity["inventory"]
    ap_acc = standard_accounts_for_entity["ap"]

    # Asset account as Sales Account
    if inv_acc:
        bad_payload = {
            "entity_id": entity_id,
            "name": "Bad Sales Acc Item",
            "sku": f"BAD-SLS-{uuid.uuid4().hex[:6].upper()}",
            "product_type": "PRODUCT",
            "sales_account_id": inv_acc.id
        }
        res = client.post("/api/v1/items", json=bad_payload, headers=auth_headers)
        assert res.status_code == 400
        assert "sales account must be a revenue account" in res.json()["detail"].lower()

    # Liability account as Sales Account
    if ap_acc:
        bad_payload_ap = {
            "entity_id": entity_id,
            "name": "Bad Sales Acc AP Item",
            "sku": f"BAD-SLSAP-{uuid.uuid4().hex[:6].upper()}",
            "product_type": "PRODUCT",
            "sales_account_id": ap_acc.id
        }
        res = client.post("/api/v1/items", json=bad_payload_ap, headers=auth_headers)
        assert res.status_code == 400
        assert "sales account must be a revenue account" in res.json()["detail"].lower()


def test_reject_non_asset_as_inventory_account(auth_headers, active_entity, standard_accounts_for_entity):
    """
    16. Verify backend rejects non-ASSET accounts as Inventory Account.
    """
    entity_id = active_entity["id"]
    sales_acc = standard_accounts_for_entity["sales"]
    cogs_acc = standard_accounts_for_entity["cogs"]
    ap_acc = standard_accounts_for_entity["ap"]

    # Revenue as Inventory Account
    if sales_acc:
        bad_payload_rev = {
            "entity_id": entity_id,
            "name": "Bad Inv Acc Item",
            "sku": f"BAD-INV-{uuid.uuid4().hex[:6].upper()}",
            "product_type": "PRODUCT",
            "inventory_account_id": sales_acc.id
        }
        res = client.post("/api/v1/items", json=bad_payload_rev, headers=auth_headers)
        assert res.status_code == 400
        assert "inventory account must be an asset account" in res.json()["detail"].lower()

    # Expense as Inventory Account
    if cogs_acc:
        bad_payload_exp = {
            "entity_id": entity_id,
            "name": "Bad Inv Acc Item Exp",
            "sku": f"BAD-INVEXP-{uuid.uuid4().hex[:6].upper()}",
            "product_type": "PRODUCT",
            "inventory_account_id": cogs_acc.id
        }
        res = client.post("/api/v1/items", json=bad_payload_exp, headers=auth_headers)
        assert res.status_code == 400
        assert "inventory account must be an asset account" in res.json()["detail"].lower()


def test_water_bottle_complete_lifecycle(auth_headers, active_entity, standard_accounts_for_entity):
    """
    17. Create Water Bottle with:
        Sales Account: 4000
        Purchase / COGS Account: 5700
        Inventory Account: 1300
        Track Inventory: YES
    18. Verify the Item is saved successfully.
    19. Verify saved account mappings are correctly retrieved when editing the Item.
    """
    entity_id = active_entity["id"]
    sales_acc = standard_accounts_for_entity["sales"]
    cogs_acc = standard_accounts_for_entity["cogs"]
    inv_acc = standard_accounts_for_entity["inventory"]

    assert sales_acc is not None, "Standard account 4000 missing"
    assert cogs_acc is not None, "Standard account 5700 missing"
    assert inv_acc is not None, "Standard account 1300 missing"

    sku = f"WB-{uuid.uuid4().hex[:6].upper()}"

    water_bottle_payload = {
        "entity_id": entity_id,
        "name": "Water Bottle",
        "sku": sku,
        "product_type": "PRODUCT",
        "category": "Merchandise",
        "unit": "PCS",
        "description": "Premium Stainless Steel Insulated Water Bottle 750ml",
        "selling_price": 599.00,
        "purchase_price": 320.00,
        "hsn_sac_code": "392410",
        "tax_rate": 18.00,
        "sales_account_id": sales_acc.id,
        "purchase_account_id": cogs_acc.id,
        "inventory_account_id": inv_acc.id,
        "track_inventory": True,
        "opening_stock": 50.00,
        "opening_stock_rate": 320.00,
        "reorder_level": 15.00,
        "warehouse_location": "Main Warehouse"
    }

    create_res = client.post("/api/v1/items", json=water_bottle_payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    item_data = create_res.json()
    item_id = item_data["id"]

    # Verify mappings
    assert item_data["name"] == "Water Bottle"
    assert item_data["sku"] == sku
    assert item_data["income_account_id"] == sales_acc.id
    assert item_data["expense_account_id"] == cogs_acc.id
    assert item_data["inventory_account_id"] == inv_acc.id
    assert item_data["income_account_name"] == sales_acc.name
    assert item_data["expense_account_name"] == cogs_acc.name
    assert item_data["inventory_account_name"] == inv_acc.name
    assert item_data["track_inventory"] is True
    assert float(item_data["opening_stock"]) == 50.0

    # 19. Retrieve Item details (GET /api/v1/items/{id})
    get_res = client.get(f"/api/v1/items/{item_id}", headers=auth_headers)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["income_account_id"] == sales_acc.id
    assert retrieved["expense_account_id"] == cogs_acc.id
    assert retrieved["inventory_account_id"] == inv_acc.id

    # 19b. Edit Item and verify mappings are preserved
    update_payload = {
        "selling_price": 649.00,
        "purchase_account_id": cogs_acc.id,
        "reorder_level": 20.00
    }
    put_res = client.put(f"/api/v1/items/{item_id}", json=update_payload, headers=auth_headers)
    assert put_res.status_code == 200, put_res.text
    updated = put_res.json()
    assert float(updated["selling_price"]) == 649.0
    assert updated["expense_account_id"] == cogs_acc.id
    assert updated["income_account_id"] == sales_acc.id
    assert updated["inventory_account_id"] == inv_acc.id


def test_service_item_can_use_operating_expense(auth_headers, active_entity, standard_accounts_for_entity):
    """
    Services (which have no physical inventory) can legitimately use standard expense accounts.
    """
    entity_id = active_entity["id"]
    sales_acc = standard_accounts_for_entity["sales"]
    salary_acc = standard_accounts_for_entity["salary"]

    sku = f"SRV-{uuid.uuid4().hex[:6].upper()}"
    service_payload = {
        "entity_id": entity_id,
        "name": "Cloud Architecture Consultation",
        "sku": sku,
        "product_type": "SERVICE",
        "selling_price": 12000.00,
        "sales_account_id": sales_acc.id if sales_acc else None,
        "purchase_account_id": salary_acc.id if salary_acc else None,
        "track_inventory": False
    }

    res = client.post("/api/v1/items", json=service_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    item = res.json()
    assert item["product_type"] == "SERVICE"
    assert item["track_inventory"] is False


def test_regression_existing_items_and_summary_endpoint(auth_headers, active_entity):
    """
    20. Existing Items continue working.
    21. Existing Chart of Accounts functionality continues working.
    """
    # Test GET /api/v1/items
    list_res = client.get("/api/v1/items", headers=auth_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    assert data["total"] > 0

    # Test summary cards endpoint
    summary_res = client.get(f"/api/v1/items/summary?entity_id={active_entity['id']}", headers=auth_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total_items" in summary
    assert "inventory_tracked" in summary
    assert "active_items" in summary
    assert "low_stock_items" in summary
    assert summary["total_items"] >= summary["active_items"]

