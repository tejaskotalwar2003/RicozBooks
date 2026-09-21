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

def test_vendor_lifecycle(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # 1. Create a Vendor
    payload = {
        "entity_id": entity_id,
        "name": "Amazon Web Services India",
        "company_name": "AWS Cloud Services Pvt Ltd",
        "email": "billing@aws.amazon.com",
        "phone": "+91 80 1234 5678",
        "gstin": "27AABCA1234Q1Z5",
        "pan": "AABCA1234Q",
        "billing_address": "Embassy GolfLinks Business Park",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560071",
        "country": "India",
        "payment_terms_days": 30,
        "opening_balance": 0.0,
        "currency": "INR",
        "bank_name": "Citibank N.A.",
        "bank_account_number": "0987654321",
        "bank_ifsc": "CITI0000001"
    }
    create_res = client.post("/api/v1/vendors", json=payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    vendor = create_res.json()
    assert vendor["name"] == "Amazon Web Services India"
    assert vendor["gstin"] == "27AABCA1234Q1Z5"
    assert float(vendor["current_balance"]) == 0.0
    vendor_id = vendor["id"]

    # 2. Search vendor
    search_res = client.get(f"/api/v1/vendors?entity_id={entity_id}&search=Amazon", headers=auth_headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert any(v["id"] == vendor_id for v in results)

    # 3. Get vendor ledger statement
    stmt_res = client.get(f"/api/v1/vendors/{vendor_id}/statement", headers=auth_headers)
    assert stmt_res.status_code == 200
    stmt = stmt_res.json()
    assert stmt["vendor_id"] == vendor_id
    assert stmt["vendor_name"] == "Amazon Web Services India"
    assert len(stmt["entries"]) == 0

def test_purchase_order_and_bill_conversion(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # Create vendor
    v_res = client.post("/api/v1/vendors", json={
        "entity_id": entity_id,
        "name": "Dell Technologies India",
        "state": "Maharashtra",
        "gstin": "27AABCD5678Q1Z9"
    }, headers=auth_headers)
    assert v_res.status_code == 201
    vendor = v_res.json()

    # Create Purchase Order (PO)
    po_payload = {
        "entity_id": entity_id,
        "vendor_id": vendor["id"],
        "order_date": "2026-03-20",
        "delivery_date": "2026-03-30",
        "notes": "Supply of Developer Workstations",
        "lines": [
            {
                "description": "Dell XPS 15 High-Performance Laptops",
                "quantity": 5.0,
                "unit": "PCS",
                "unit_price": 120000.0,
                "discount_pct": 5.0,  # 5% off 600,000 = 30,000 discount -> 570,000 taxable
                "hsn_sac": "84713010",
                "tax_rate": 18.0
            }
        ]
    }
    po_res = client.post("/api/v1/purchase-orders", json=po_payload, headers=auth_headers)
    assert po_res.status_code == 201, po_res.text
    po = po_res.json()
    assert po["status"] == "DRAFT"
    # 570,000 + 18% (102,600) = 672,600.00
    assert float(po["taxable_amount"]) == 570000.0
    assert float(po["total_amount"]) == 672600.0

    # Convert PO to Bill
    conv_res = client.post(f"/api/v1/purchase-orders/{po['id']}/convert-to-bill", headers=auth_headers)
    assert conv_res.status_code == 200, conv_res.text
    bill = conv_res.json()
    assert bill["vendor_id"] == vendor["id"]
    assert float(bill["total_amount"]) == 672600.0
    assert bill["status"] == "DRAFT"

    # Verify PO status is BILLED
    po_check = client.get(f"/api/v1/purchase-orders/{po['id']}", headers=auth_headers)
    assert po_check.status_code == 200
    assert po_check.json()["status"] == "BILLED"

def test_bill_creation_and_gl_posting(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # Create vendor
    v_res = client.post("/api/v1/vendors", json={
        "entity_id": entity_id,
        "name": "WeWork BKC Co-working",
        "state": "Maharashtra",
        "gstin": "27AABCW9876Q1Z2"
    }, headers=auth_headers)
    assert v_res.status_code == 201
    vendor = v_res.json()

    # Create Bill
    bill_payload = {
        "entity_id": entity_id,
        "vendor_id": vendor["id"],
        "vendor_invoice_ref": "WEWORK-INV-2026-991",
        "bill_date": "2026-03-20",
        "due_date": "2026-04-19",
        "notes": "Office Workspace Rental March 2026",
        "lines": [
            {
                "description": "Dedicated 20-Desk Enterprise Suite",
                "quantity": 1.0,
                "unit": "MONTH",
                "unit_price": 200000.0,
                "discount_pct": 0.0,
                "hsn_sac": "997212",
                "tax_rate": 18.0
            }
        ]
    }
    bill_res = client.post("/api/v1/bills", json=bill_payload, headers=auth_headers)
    assert bill_res.status_code == 201, bill_res.text
    bill = bill_res.json()
    # 200,000 + 18% (36,000) = 236,000.00
    assert float(bill["taxable_amount"]) == 200000.0
    assert float(bill["total_tax"]) == 36000.0
    assert float(bill["total_amount"]) == 236000.0
    assert float(bill["balance_amount"]) == 236000.0
    assert bill["status"] == "DRAFT"

    # Post Bill to General Ledger
    post_res = client.post(f"/api/v1/bills/{bill['id']}/post", headers=auth_headers)
    assert post_res.status_code == 200, post_res.text
    posted_bill = post_res.json()
    assert posted_bill["status"] == "POSTED"
    assert posted_bill["journal_entry_id"] is not None

    # Verify Journal Entry is strictly balanced
    je_res = client.get(f"/api/v1/journal-entries/{posted_bill['journal_entry_id']}", headers=auth_headers)
    assert je_res.status_code == 200, je_res.text
    je = je_res.json()
    assert float(je["total_debit"]) == float(je["total_credit"])
    assert float(je["total_debit"]) == 236000.0

    # Record Vendor Payment / Disbursement
    pay_payload = {
        "entity_id": entity_id,
        "vendor_id": vendor["id"],
        "bill_id": posted_bill["id"],
        "payment_date": "2026-03-21",
        "payment_mode": "BANK_TRANSFER",
        "amount": 236000.0,
        "reference_number": "UTR-DISB-7718293041",
        "notes": "Full settlement via corporate banking portal"
    }
    pay_res = client.post("/api/v1/vendor-payments", json=pay_payload, headers=auth_headers)
    assert pay_res.status_code == 201, pay_res.text
    payment = pay_res.json()
    assert float(payment["amount"]) == 236000.0
    assert payment["journal_entry_id"] is not None

    # Check Bill status is now PAID
    bill_check = client.get(f"/api/v1/bills/{posted_bill['id']}", headers=auth_headers)
    assert bill_check.status_code == 200
    b_data = bill_check.json()
    assert b_data["status"] == "PAID"
    assert float(b_data["paid_amount"]) == 236000.0
    assert float(b_data["balance_amount"]) == 0.0

    # Verify Vendor Statement has 2 balanced entries and 0 closing balance
    stmt_res = client.get(f"/api/v1/vendors/{vendor['id']}/statement", headers=auth_headers)
    assert stmt_res.status_code == 200
    stmt = stmt_res.json()
    assert len(stmt["entries"]) == 2
    assert float(stmt["current_balance"]) == 0.0

