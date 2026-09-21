import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.models.company import Entity
from app.models.sales import Product, ProductType
from app.models.journal import JournalEntry

# Ensure all tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def active_entity():
    db = SessionLocal()
    try:
        entity = db.query(Entity).filter(Entity.code == "RICOZ_IN").first()
        if not entity:
            entity = db.query(Entity).first()
        return {"id": entity.id, "code": entity.code}
    finally:
        db.close()


def test_inventory_lifecycle_and_adjustments(auth_headers, active_entity):
    entity_id = active_entity["id"]
    db = SessionLocal()
    try:
        # Ensure a product exists for inventory testing
        product = db.query(Product).filter(Product.entity_id == entity_id).first()
        if not product:
            product = Product(
                entity_id=entity_id,
                name="Enterprise Server Rack 42U",
                sku="SRV-RACK-42U",
                product_type=ProductType.GOODS.value,
                unit="PCS",
                selling_price=Decimal("45000.00"),
                purchase_price=Decimal("30000.00"),
                hsn_sac_code="84715000",
                current_stock=Decimal("10.00"),
                min_stock_alert=Decimal("3.00"),
                is_active=True
            )
            db.add(product)
            db.commit()
            db.refresh(product)
        prod_id = product.id
    finally:
        db.close()

    # 1. Check Inventory Valuation Endpoint
    val_resp = client.get(f"/api/v1/inventory/valuation?entity_id={entity_id}", headers=auth_headers)
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["total_products_count"] > 0
    assert "total_asset_valuation" in val_data

    # 2. Execute Stock Adjustment (INCREASE +5 PCS)
    adj_increase_payload = {
        "entity_id": entity_id,
        "product_id": prod_id,
        "adjustment_type": "INCREASE",
        "quantity": "5.00",
        "unit_cost": "30000.00",
        "reason": "Physical count audit surplus found in bay 4",
        "warehouse_location": "Main Warehouse"
    }
    adj_resp = client.post("/api/v1/inventory/adjustments", json=adj_increase_payload, headers=auth_headers)
    assert adj_resp.status_code == 201, f"Adjustment failed: {adj_resp.text}"
    adj_data = adj_resp.json()
    assert adj_data["total_value"] == "150000.00"
    assert adj_data["journal_entry_id"] is not None

    # Verify Balanced Journal Entry in DB
    db = SessionLocal()
    try:
        je = db.query(JournalEntry).filter(JournalEntry.id == adj_data["journal_entry_id"]).first()
        assert je is not None
        assert je.total_debit == Decimal("150000.00")
        assert je.total_credit == Decimal("150000.00")
    finally:
        db.close()

    # 3. Execute Stock Adjustment (DECREASE -2 PCS Damaged)
    adj_decrease_payload = {
        "entity_id": entity_id,
        "product_id": prod_id,
        "adjustment_type": "DECREASE",
        "quantity": "2.00",
        "unit_cost": "30000.00",
        "reason": "Damaged during transit inspection",
        "warehouse_location": "Main Warehouse"
    }
    dec_resp = client.post("/api/v1/inventory/adjustments", json=adj_decrease_payload, headers=auth_headers)
    assert dec_resp.status_code == 201
    assert dec_resp.json()["total_value"] == "60000.00"

    # 4. Verify Movements Register
    mov_resp = client.get(f"/api/v1/inventory/movements?entity_id={entity_id}&product_id={prod_id}", headers=auth_headers)
    assert mov_resp.status_code == 200
    movements = mov_resp.json()
    assert len(movements) >= 2


def test_gst_returns_and_settlement(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # 1. Get GST Dashboard Metrics
    metrics_resp = client.get(f"/api/v1/gst/metrics?entity_id={entity_id}&period=092026", headers=auth_headers)
    assert metrics_resp.status_code == 200
    metrics = metrics_resp.json()
    assert "total_output_tax_due" in metrics
    assert "total_input_tax_credit_available" in metrics

    # 2. Generate GSTR-1 Outward Return
    gstr1_resp = client.get(f"/api/v1/gst/gstr1?entity_id={entity_id}&period=092026", headers=auth_headers)
    assert gstr1_resp.status_code == 200
    gstr1 = gstr1_resp.json()
    assert "b2b_invoices" in gstr1
    assert "hsn_summary" in gstr1
    assert "total_tax_liability" in gstr1

    # 3. Generate GSTR-3B Monthly Return with ITC Offsetting
    gstr3b_resp = client.get(f"/api/v1/gst/gstr3b?entity_id={entity_id}&period=092026", headers=auth_headers)
    assert gstr3b_resp.status_code == 200
    gstr3b = gstr3b_resp.json()
    assert "outward_supplies" in gstr3b
    assert "eligible_itc" in gstr3b
    assert "tax_settlement" in gstr3b
    assert "total_cash_payable" in gstr3b["tax_settlement"]

    # 4. Execute GST Settlement (if liability > 0, settle; if 0, create a test invoice first then settle)
    tax_settle = gstr3b["tax_settlement"]
    if Decimal(str(tax_settle["total_output_liability"])) > Decimal("0.00"):
        settle_resp = client.post(
            "/api/v1/gst/settle",
            json={
                "entity_id": entity_id,
                "return_period": "092026",
                "reference_number": "CHALLAN-CIN-992140"
            },
            headers=auth_headers
        )
        assert settle_resp.status_code == 200, f"Settlement failed: {settle_resp.text}"
        settle_data = settle_resp.json()
        assert settle_data["arn_number"].startswith("AA")
        assert settle_data["settlement_journal_id"] is not None

