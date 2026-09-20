import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def active_entity(auth_headers):
    ent_res = client.get("/api/v1/entities", headers=auth_headers)
    assert ent_res.status_code == 200
    entities = ent_res.json()
    assert len(entities) > 0
    return entities[0]

def test_customer_lifecycle(auth_headers, active_entity):
    entity_id = active_entity["id"]
    
    # 1. Create a customer
    payload = {
        "entity_id": entity_id,
        "name": "Tata Technologies Ltd",
        "company_name": "Tata Technologies Global",
        "email": "accounts@tatatech.com",
        "phone": "+91 9876543210",
        "gstin": "27AAACT2727Q1ZB",
        "billing_address": "Plot 25, Hinjawadi Phase 1",
        "city": "Pune",
        "state": "Maharashtra",
        "postal_code": "411057",
        "country": "India",
        "payment_terms_days": 30,
        "opening_balance": 0.0,
        "currency": "INR"
    }
    create_res = client.post("/api/v1/customers", json=payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    customer = create_res.json()
    assert customer["name"] == "Tata Technologies Ltd"
    assert customer["gstin"] == "27AAACT2727Q1ZB"
    assert float(customer["current_balance"]) == 0.0
    customer_id = customer["id"]

    # 2. Search customer
    search_res = client.get(f"/api/v1/customers?entity_id={entity_id}&search=Tata", headers=auth_headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert any(c["id"] == customer_id for c in results)

    # 3. Get customer detail & statement
    stmt_res = client.get(f"/api/v1/customers/{customer_id}/statement", headers=auth_headers)
    assert stmt_res.status_code == 200
    stmt = stmt_res.json()
    assert stmt["customer_id"] == customer_id
    assert stmt["customer_name"] == "Tata Technologies Ltd"
    assert len(stmt["entries"]) == 0

def test_product_catalog(auth_headers, active_entity):
    entity_id = active_entity["id"]

    payload = {
        "entity_id": entity_id,
        "sku": "SRV-CLOUD-001",
        "name": "Cloud Infrastructure Consulting",
        "description": "Monthly managed cloud architecture consulting",
        "type": "SERVICE",
        "unit": "HOURS",
        "unit_price": 5000.00,
        "hsn_sac": "998315",
        "tax_rate": 18.00
    }
    res = client.post("/api/v1/products", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    product = res.json()
    assert product["sku"] == "SRV-CLOUD-001"
    assert float(product["tax_rate"]) == 18.00

    # List products
    list_res = client.get(f"/api/v1/products?entity_id={entity_id}", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(p["id"] == product["id"] for p in list_res.json())

def test_invoice_creation_intra_state_gst(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # Ensure we have a customer
    cust_res = client.post("/api/v1/customers", json={
        "entity_id": entity_id,
        "name": "Reliance Digital Retail",
        "state": "Maharashtra",
        "gstin": "27AAACR1234Q1Z1"
    }, headers=auth_headers)
    assert cust_res.status_code == 201
    customer = cust_res.json()

    # Create Invoice (Intra-state: Maharashtra to Maharashtra -> CGST 9% + SGST 9%)
    inv_payload = {
        "entity_id": entity_id,
        "customer_id": customer["id"],
        "invoice_date": "2026-03-20",
        "due_date": "2026-04-19",
        "supply_state": "Maharashtra",
        "notes": "Payment due within 30 days",
        "lines": [
            {
                "description": "Enterprise Cloud Architecture",
                "quantity": 10.0,
                "unit": "HOURS",
                "unit_price": 5000.0,
                "discount_pct": 10.0,  # 10% discount: 50,000 - 5,000 = 45,000 taxable
                "hsn_sac": "998315",
                "tax_rate": 18.0
            }
        ]
    }
    create_res = client.post("/api/v1/invoices", json=inv_payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    inv = create_res.json()

    # 10 hrs * 5000 = 50,000. Discount 10% = 5,000. Taxable = 45,000.
    assert float(inv["subtotal"]) == 50000.0
    assert float(inv["discount_amount"]) == 5000.0
    assert float(inv["taxable_amount"]) == 45000.0
    # Intra-state: CGST 9% (4050), SGST 9% (4050), IGST 0
    assert float(inv["cgst_amount"]) == 4050.0
    assert float(inv["sgst_amount"]) == 4050.0
    assert float(inv["igst_amount"]) == 0.0
    assert float(inv["total_tax"]) == 8100.0
    # Grand total = 45000 + 8100 = 53100.0
    assert float(inv["total_amount"]) == 53100.0
    assert float(inv["balance_amount"]) == 53100.0
    assert inv["status"] == "DRAFT"

    # Now post invoice to General Ledger
    post_res = client.post(f"/api/v1/invoices/{inv['id']}/post", headers=auth_headers)
    assert post_res.status_code == 200, post_res.text
    posted_inv = post_res.json()
    assert posted_inv["status"] == "SENT" or posted_inv["status"] == "POSTED"
    assert posted_inv["journal_entry_id"] is not None

    # Verify General Ledger Entry is perfectly balanced
    je_res = client.get(f"/api/v1/journal-entries/{posted_inv['journal_entry_id']}", headers=auth_headers)
    assert je_res.status_code == 200, je_res.text
    je = je_res.json()
    assert float(je["total_debit"]) == float(je["total_credit"])
    assert float(je["total_debit"]) == 53100.0

    # Record Customer Payment
    pay_payload = {
        "entity_id": entity_id,
        "customer_id": customer["id"],
        "invoice_id": posted_inv["id"],
        "payment_date": "2026-03-21",
        "payment_mode": "BANK_TRANSFER",
        "amount": 53100.0,
        "reference_number": "UTR-9918273645",
        "notes": "Full settlement received via NEFT"
    }
    pay_res = client.post("/api/v1/payments", json=pay_payload, headers=auth_headers)
    assert pay_res.status_code == 201, pay_res.text
    payment = pay_res.json()
    assert float(payment["amount"]) == 53100.0
    assert payment["journal_entry_id"] is not None

    # Check Invoice is now PAID
    inv_check = client.get(f"/api/v1/invoices/{posted_inv['id']}", headers=auth_headers)
    assert inv_check.status_code == 200
    inv_data = inv_check.json()
    assert inv_data["status"] == "PAID"
    assert float(inv_data["paid_amount"]) == 53100.0
    assert float(inv_data["balance_amount"]) == 0.0

    # Verify Customer Statement has 2 balanced entries
    stmt_res = client.get(f"/api/v1/customers/{customer['id']}/statement", headers=auth_headers)
    assert stmt_res.status_code == 200
    stmt = stmt_res.json()
    assert len(stmt["entries"]) == 2
    assert float(stmt["current_balance"]) == 0.0

def test_estimate_workflow_and_conversion(auth_headers, active_entity):
    entity_id = active_entity["id"]

    cust_res = client.post("/api/v1/customers", json={
        "entity_id": entity_id,
        "name": "Adani Green Energy Ltd",
        "state": "Gujarat",
        "gstin": "24AAACA1234Q1Z2"
    }, headers=auth_headers)
    assert cust_res.status_code == 201
    cust = cust_res.json()

    est_payload = {
        "entity_id": entity_id,
        "customer_id": cust["id"],
        "estimate_date": "2026-03-20",
        "expiry_date": "2026-04-20",
        "notes": "Valid for 30 days",
        "lines": [
            {
                "description": "Solar Farm SCADA Integration",
                "quantity": 2.0,
                "unit": "SYSTEMS",
                "unit_price": 75000.0,
                "discount_pct": 0.0,
                "tax_rate": 18.0
            }
        ]
    }
    est_res = client.post("/api/v1/estimates", json=est_payload, headers=auth_headers)
    assert est_res.status_code == 201, est_res.text
    estimate = est_res.json()
    assert estimate["status"] == "DRAFT"
    assert float(estimate["total_amount"]) == 177000.0  # 150,000 + 18% (27,000)

    # Convert to Invoice
    conv_res = client.post(f"/api/v1/estimates/{estimate['id']}/convert", headers=auth_headers)
    assert conv_res.status_code == 200, conv_res.text
    conv_inv = conv_res.json()
    assert conv_inv["customer_id"] == cust["id"]
    assert float(conv_inv["total_amount"]) == 177000.0
    assert conv_inv["status"] == "DRAFT"

    # Verify estimate status is CONVERTED
    est_check = client.get(f"/api/v1/estimates/{estimate['id']}", headers=auth_headers)
    assert est_check.status_code == 200
    assert est_check.json()["status"] == "CONVERTED"

