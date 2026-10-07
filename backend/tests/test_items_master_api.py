import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.sales import Product
from app.models.journal import JournalEntry

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


def test_items_master_product_lifecycle(auth_headers, active_entity):
    entity_id = active_entity["id"]
    db = SessionLocal()
    initial_journals_count = db.query(JournalEntry).filter(JournalEntry.entity_id == entity_id).count()
    db.close()

    sku = f"ITM-PRD-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create a physical Product with Inventory Tracking
    create_payload = {
        "entity_id": entity_id,
        "name": "Wireless Ergonomic Keyboard",
        "sku": sku,
        "product_type": "PRODUCT",
        "category": "Electronics",
        "unit": "PCS",
        "description": "Ergonomic split wireless keyboard with Bluetooth & 2.4G",
        "selling_price": 4500.00,
        "purchase_price": 2800.00,
        "hsn_sac_code": "84716060",
        "tax_rate": 18.00,
        "track_inventory": True,
        "opening_stock": 25.00,
        "opening_stock_rate": 2800.00,
        "reorder_level": 10.00,
        "warehouse_location": "Central Warehouse"
    }
    res = client.post("/api/v1/items", json=create_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    item = res.json()
    item_id = item["id"]

    assert item["name"] == "Wireless Ergonomic Keyboard"
    assert item["sku"] == sku
    assert item["product_type"] == "PRODUCT"
    assert item["category"] == "Electronics"
    assert item["unit"] == "PCS"
    assert float(item["selling_price"]) == 4500.00
    assert float(item["purchase_price"]) == 2800.00
    assert float(item["tax_rate"]) == 18.00
    assert item["track_inventory"] is True
    assert float(item["opening_stock"]) == 25.00
    assert float(item["current_stock"]) == 25.00
    assert float(item["reorder_level"]) == 10.00
    assert item["warehouse_location"] == "Central Warehouse"
    assert item["is_active"] is True

    # VERIFY NO GENERAL LEDGER JOURNALS CREATED (Phase 1 Requirement)
    db = SessionLocal()
    after_journals_count = db.query(JournalEntry).filter(JournalEntry.entity_id == entity_id).count()
    db.close()
    assert after_journals_count == initial_journals_count, "Creating an item in Phase 1 must not create GL journals!"

    # 2. Duplicate SKU in same entity must fail with 400
    dup_res = client.post("/api/v1/items", json=create_payload, headers=auth_headers)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Retrieve item by ID
    get_res = client.get(f"/api/v1/items/{item_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == item_id

    # 4. Update item
    update_payload = {
        "selling_price": 4800.00,
        "reorder_level": 12.00,
        "category": "Computer Accessories"
    }
    update_res = client.put(f"/api/v1/items/{item_id}", json=update_payload, headers=auth_headers)
    assert update_res.status_code == 200
    updated_item = update_res.json()
    assert float(updated_item["selling_price"]) == 4800.00
    assert float(updated_item["reorder_level"]) == 12.00
    assert updated_item["category"] == "Computer Accessories"

    # 5. Deactivate / Activate item
    deact_res = client.patch(f"/api/v1/items/{item_id}/status", json={"is_active": False}, headers=auth_headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    act_res = client.patch(f"/api/v1/items/{item_id}/status", json={"is_active": True}, headers=auth_headers)
    assert act_res.status_code == 200
    assert act_res.json()["is_active"] is True


def test_service_item_rules(auth_headers, active_entity):
    entity_id = active_entity["id"]
    sku = f"SRV-CONS-{uuid.uuid4().hex[:6].upper()}"

    # Creating a SERVICE item with track_inventory=True must automatically disable inventory tracking
    payload = {
        "entity_id": entity_id,
        "name": "Quarterly Tax Filing & Advisory",
        "sku": sku,
        "product_type": "SERVICE",
        "category": "Professional Services",
        "unit": "HOURS",
        "description": "GST, TDS, and corporate tax advisory",
        "selling_price": 12000.00,
        "purchase_price": 0.00,
        "hsn_sac_code": "998231",
        "tax_rate": 18.00,
        "track_inventory": True,  # Should be forced to False
        "opening_stock": 50.00   # Should be reset to 0
    }
    res = client.post("/api/v1/items", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    item = res.json()

    assert item["product_type"] == "SERVICE"
    assert item["track_inventory"] is False
    assert float(item["opening_stock"]) == 0.0
    assert float(item["current_stock"]) == 0.0


def test_items_search_and_filters(auth_headers, active_entity):
    entity_id = active_entity["id"]
    uniq = uuid.uuid4().hex[:5].upper()

    sku_alpha = f"SKU-ALPHA-{uniq}"
    sku_beta = f"SKU-BETA-{uniq}"

    client.post("/api/v1/items", json={
        "entity_id": entity_id,
        "name": f"Alpha Laser Printer {uniq}",
        "sku": sku_alpha,
        "product_type": "PRODUCT",
        "category": "Hardware",
        "selling_price": 15000.00,
        "track_inventory": True,
        "opening_stock": 5.0,
        "reorder_level": 8.0  # low stock because current_stock (5) <= reorder_level (8)
    }, headers=auth_headers)

    client.post("/api/v1/items", json={
        "entity_id": entity_id,
        "name": f"Beta IT Consultation {uniq}",
        "sku": sku_beta,
        "product_type": "SERVICE",
        "category": "Consulting",
        "selling_price": 3000.00,
        "track_inventory": False
    }, headers=auth_headers)

    # 1. Search by Name
    name_res = client.get(f"/api/v1/items?entity_id={entity_id}&name_search=Alpha Laser Printer {uniq}", headers=auth_headers)
    assert name_res.status_code == 200
    items = name_res.json()["items"]
    assert any(i["sku"] == sku_alpha for i in items)
    assert not any(i["sku"] == sku_beta for i in items)

    # 2. Search by SKU
    sku_res = client.get(f"/api/v1/items?entity_id={entity_id}&sku_search={sku_beta}", headers=auth_headers)
    assert sku_res.status_code == 200
    items = sku_res.json()["items"]
    assert any(i["sku"] == sku_beta for i in items)
    assert not any(i["sku"] == sku_alpha for i in items)

    # 3. Filter by Type: SERVICE
    srv_res = client.get(f"/api/v1/items?entity_id={entity_id}&type=SERVICE&search={uniq}", headers=auth_headers)
    assert srv_res.status_code == 200
    items = srv_res.json()["items"]
    assert all(i["product_type"] == "SERVICE" for i in items)

    # 4. Filter by Type: PRODUCT
    prd_res = client.get(f"/api/v1/items?entity_id={entity_id}&type=PRODUCT&search={uniq}", headers=auth_headers)
    assert prd_res.status_code == 200
    items = prd_res.json()["items"]
    assert all(i["product_type"] in ["PRODUCT", "GOODS"] for i in items)

    # 5. Summary metrics
    sum_res = client.get(f"/api/v1/items/summary?entity_id={entity_id}", headers=auth_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_items"] >= 2
    assert summary["inventory_tracked"] >= 1
    assert summary["active_items"] >= 2
    assert summary["low_stock_items"] >= 1
    assert summary["products_count"] >= 1
    assert summary["services_count"] >= 1
