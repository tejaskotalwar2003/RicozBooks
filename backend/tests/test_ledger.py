import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    admin_res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    acct_res = client.post("/api/v1/auth/login", json={"email": "accountant@ricozbooks.com", "password": "accountant123"})
    rev_res = client.post("/api/v1/auth/login", json={"email": "reviewer@ricozbooks.com", "password": "reviewer123"})
    
    return {
        "admin": admin_res.json()["access_token"],
        "accountant": acct_res.json()["access_token"],
        "reviewer": rev_res.json()["access_token"],
    }

def test_ledger_summary():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    assert ent_res.status_code == 200
    entity_id = ent_res.json()[0]["id"]

    res = client.get(f"/api/v1/ledger/summary?entity_id={entity_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "accounts" in data
    assert len(data["accounts"]) >= 5
    assert "total_period_debit" in data
    assert "total_period_credit" in data
    assert "total_closing_debit" in data

def test_account_ledger_details_and_running_balance():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    accounts = acc_res.json()
    cash_account = next(a for a in accounts if a["code"] == "1000")
    sales_account = next(a for a in accounts if a["code"] == "4000")
    entity_id = cash_account["entity_id"]

    # Post a guaranteed journal entry so we can test running balance progression
    je_payload = {
        "entity_id": entity_id,
        "entry_date": str(date.today()),
        "reference": "TEST-LEDGER-01",
        "description": "Ledger running balance verification entry",
        "currency": "INR",
        "exchange_rate": 1.0,
        "lines": [
            {
                "line_number": 1,
                "account_id": cash_account["id"],
                "description": "Cash receipt",
                "debit": 25000.0,
                "credit": 0.0
            },
            {
                "line_number": 2,
                "account_id": sales_account["id"],
                "description": "Consulting revenue",
                "debit": 0.0,
                "credit": 25000.0
            }
        ]
    }

    create_res = client.post("/api/v1/journal-entries", json=je_payload, headers=acct_headers)
    assert create_res.status_code == 201
    je_id = create_res.json()["id"]

    # Submit
    client.post(f"/api/v1/journal-entries/{je_id}/submit", headers=acct_headers)
    # Approve
    client.post(f"/api/v1/journal-entries/{je_id}/approve", json={"comments": "Approved for ledger test"}, headers={"Authorization": f"Bearer {tokens['reviewer']}"})
    # Post
    client.post(f"/api/v1/journal-entries/{je_id}/post", headers=admin_headers)

    # Fetch cash account ledger
    ledger_res = client.get(f"/api/v1/ledger/account/{cash_account['id']}?entity_id={entity_id}", headers=acct_headers)
    assert ledger_res.status_code == 200
    ledger_data = ledger_res.json()

    assert ledger_data["account_code"] == "1000"
    assert ledger_data["account_name"] == cash_account["name"]
    assert ledger_data["normal_balance"] == "DEBIT"
    assert "lines" in ledger_data
    assert len(ledger_data["lines"]) >= 1

    # Verify running balance
    last_line = ledger_data["lines"][-1]
    assert "running_balance" in last_line
    assert "balance_type" in last_line
    assert Decimal(str(last_line["running_balance"])) > Decimal("0")
    assert last_line["balance_type"] in ["DR", "CR"]

def test_ledger_csv_export():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]

    acc_res = client.get("/api/v1/accounts", headers=headers)
    cash_account = next(a for a in acc_res.json() if a["code"] == "1000")

    export_res = client.get(f"/api/v1/ledger/account/{cash_account['id']}/export?entity_id={entity_id}", headers=headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "RicozBooks - General Ledger Statement" in export_res.text
    assert "1000" in export_res.text

def test_audit_logs_advanced_filtering_and_export():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # Query paginated audit logs
    res = client.get("/api/v1/audit-logs?limit=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert len(data["items"]) <= 10

    # Query with action filter
    filtered_res = client.get("/api/v1/audit-logs?action=JOURNAL_POSTED", headers=headers)
    assert filtered_res.status_code == 200
    filtered_data = filtered_res.json()
    for item in filtered_data["items"]:
        assert item["action"] == "JOURNAL_POSTED"

    # Export audit logs CSV
    csv_res = client.get("/api/v1/audit-logs/export", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "RicozBooks - Immutable Forensic Audit Trail" in csv_res.text

