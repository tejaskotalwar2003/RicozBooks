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

def test_payment_gateway_and_inbound_collection(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # 1. Update entity with UPI ID and Razorpay Key
    upd_res = client.put(f"/api/v1/entities/{entity_id}", json={
        "upi_id": "ricozbooks@icici",
        "razorpay_key_id": "rzp_test_1234567890",
        "payment_gateway_active": True
    }, headers=auth_headers)
    assert upd_res.status_code == 200, upd_res.text
    assert upd_res.json()["upi_id"] == "ricozbooks@icici"

    # 2. Create customer
    cust_res = client.post("/api/v1/customers", json={
        "entity_id": entity_id,
        "name": "Global Tech Services Pvt Ltd",
        "company_name": "Global Tech Services",
        "email": "billing@globaltech.com",
        "phone": "+91 9988776655",
        "gstin": "27AABCG1234F1Z5",
        "state": "Maharashtra",
        "payment_terms_days": 15,
        "currency": "INR"
    }, headers=auth_headers)
    assert cust_res.status_code == 201, cust_res.text
    customer_id = cust_res.json()["id"]

    # 3. Create invoice
    inv_res = client.post("/api/v1/invoices", json={
        "entity_id": entity_id,
        "customer_id": customer_id,
        "invoice_date": "2026-09-24",
        "due_date": "2026-10-09",
        "currency": "INR",
        "notes": "Enterprise Cloud Architecture Consulting",
        "lines": [
            {
                "description": "Enterprise Cloud Consulting (40 hrs)",
                "hsn_sac": "998313",
                "quantity": 40.0,
                "unit_price": 2500.0,
                "discount_pct": 0.0,
                "tax_rate": 18.0
            }
        ]
    }, headers=auth_headers)
    assert inv_res.status_code == 201, inv_res.text
    invoice = inv_res.json()
    invoice_id = invoice["id"]
    payment_token = invoice.get("payment_token")
    assert payment_token is not None, "payment_token must be auto-generated"

    # Post invoice to General Ledger
    post_res = client.post(f"/api/v1/invoices/{invoice_id}/post", headers=auth_headers)
    assert post_res.status_code == 200, post_res.text

    # 4. Fetch payment link & UPI QR payload
    link_res = client.get(f"/api/v1/invoices/{invoice_id}/payment-link", headers=auth_headers)
    assert link_res.status_code == 200, link_res.text
    link_data = link_res.json()
    assert link_data["payment_token"] == payment_token
    assert f"/pay/{payment_token}" in link_data["payment_link"]
    assert "upi://pay?" in link_data["upi_uri"]
    assert "ricozbooks@icici" in link_data["upi_uri"]

    # 5. Customer visits public portal without authentication
    public_res = client.get(f"/api/v1/public/invoices/{payment_token}")
    assert public_res.status_code == 200, public_res.text
    public_data = public_res.json()
    assert public_data["invoice_number"] == invoice["invoice_number"]
    assert public_data["customer_name"] == "Global Tech Services Pvt Ltd"
    assert float(public_data["balance_amount"]) == 118000.0  # 100,000 + 18% GST
    assert public_data["entity_upi_id"] == "ricozbooks@icici"

    # 6. Customer makes a partial payment via UPI on public portal
    pay_res = client.post(f"/api/v1/public/invoices/{payment_token}/pay", json={
        "amount": 50000.0,
        "payment_mode": "UPI",
        "reference_number": "UPI/20260924/88392019",
        "payer_name": "Global Tech Finance Team"
    })
    assert pay_res.status_code == 200, pay_res.text
    pay_data = pay_res.json()
    assert pay_data["success"] is True
    assert float(pay_data["remaining_balance"]) == 68000.0
    assert pay_data["status"] == "PARTIALLY_PAID"

    # 7. Customer completes the remaining balance
    pay_res2 = client.post(f"/api/v1/public/invoices/{payment_token}/pay", json={
        "amount": 68000.0,
        "payment_mode": "CARD",
        "reference_number": "TXN_CARD_992817",
        "payer_name": "Global Tech Finance Team"
    })
    assert pay_res2.status_code == 200, pay_res2.text
    pay_data2 = pay_res2.json()
    assert pay_data2["success"] is True
    assert float(pay_data2["remaining_balance"]) == 0.0
    assert pay_data2["status"] == "PAID"

    # 8. Webhook handling
    webhook_res = client.post("/api/v1/payments/webhook", json={
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_wh_12345",
                    "amount": 100000,
                    "notes": {"payment_token": payment_token}
                }
            }
        }
    })
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "ok"
