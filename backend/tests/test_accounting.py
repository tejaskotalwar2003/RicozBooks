import pytest
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

def test_chart_of_accounts_list():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    res = client.get("/api/v1/accounts", headers=headers)
    assert res.status_code == 200
    accounts = res.json()
    assert len(accounts) >= 10
    codes = [a["code"] for a in accounts]
    assert "1000" in codes  # Cash
    assert "4000" in codes  # Sales Revenue

def test_chart_of_accounts_create():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    # Get entity
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]
    
    new_acc = {
        "entity_id": entity_id,
        "code": "5300",
        "name": "Software & SaaS Subscriptions",
        "account_type": "EXPENSE",
        "normal_balance": "DEBIT",
        "description": "Cloud services and developer tools",
        "currency": "INR",
        "is_active": True
    }
    res = client.post("/api/v1/accounts", json=new_acc, headers=headers)
    # Either created (201) or already exists from prior run (400)
    assert res.status_code in [201, 400]

def test_balanced_journal_creation_and_workflow():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    rev_headers = {"Authorization": f"Bearer {tokens['reviewer']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # Fetch accounts
    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    entity_id = cash_acc["entity_id"]
    sales_acc = next(a for a in accounts if a["code"] == "4000" and a["entity_id"] == entity_id)

    # 1. Balanced journal creation (Debit 10,000 == Credit 10,000)
    journal_payload = {
        "entity_id": entity_id,
        "entry_date": "2026-09-15",
        "reference": "TEST-BAL-001",
        "description": "Customer cash payment for enterprise licenses",
        "currency": "INR",
        "exchange_rate": 1.0,
        "save_as_draft": True,
        "lines": [
            {"account_id": cash_acc["id"], "description": "Cash received", "debit": 10000.00, "credit": 0.00},
            {"account_id": sales_acc["id"], "description": "Sales recognized", "debit": 0.00, "credit": 10000.00}
        ]
    }
    create_res = client.post("/api/v1/journal-entries", json=journal_payload, headers=acct_headers)
    assert create_res.status_code == 201, create_res.text
    journal = create_res.json()
    assert journal["status"] == "DRAFT"
    assert Decimal(str(journal["total_debit"])) == Decimal("10000.00")
    assert Decimal(str(journal["total_credit"])) == Decimal("10000.00")
    journal_id = journal["id"]

    # 2. Accountant can edit draft
    edit_payload = {
        "description": "Updated customer cash payment description",
    }
    edit_res = client.put(f"/api/v1/journal-entries/{journal_id}", json=edit_payload, headers=acct_headers)
    assert edit_res.status_code == 200
    assert edit_res.json()["description"] == "Updated customer cash payment description"

    # 3. Accountant submits journal for review
    submit_res = client.post(f"/api/v1/journal-entries/{journal_id}/submit", headers=acct_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 4. Accountant CANNOT edit submitted journal
    forbidden_edit = client.put(f"/api/v1/journal-entries/{journal_id}", json=edit_payload, headers=acct_headers)
    assert forbidden_edit.status_code == 400

    # 5. Reviewer approves journal
    appr_res = client.post(
        f"/api/v1/journal-entries/{journal_id}/approve", 
        json={"comments": "Verified invoice and bank remittance."}, 
        headers=rev_headers
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 6. Post approved journal to ledger
    post_res = client.post(f"/api/v1/journal-entries/{journal_id}/post", headers=rev_headers)
    assert post_res.status_code == 200
    posted_data = post_res.json()
    assert posted_data["status"] == "POSTED"
    assert posted_data["posted_at"] is not None

    # 7. Posted journal cannot be edited
    posted_edit = client.put(f"/api/v1/journal-entries/{journal_id}", json=edit_payload, headers=acct_headers)
    assert posted_edit.status_code == 400

    # 8. Reversal entry creation
    rev_res = client.post(
        f"/api/v1/journal-entries/{journal_id}/reverse",
        json={"reason": "Customer payment returned / correction"},
        headers=admin_headers
    )
    assert rev_res.status_code == 200
    reversal_data = rev_res.json()
    assert reversal_data["status"] == "POSTED"
    assert reversal_data["reversal_of_id"] == journal_id
    assert Decimal(str(reversal_data["total_debit"])) == Decimal("10000.00")

    # Check original is now marked REVERSED
    orig_check = client.get(f"/api/v1/journal-entries/{journal_id}", headers=acct_headers)
    assert orig_check.json()["status"] == "REVERSED"

def test_unbalanced_journal_rejected():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    sales_acc = next(a for a in accounts if a["code"] == "4000")

    # Unbalanced: Debit 10,000 vs Credit 9,000
    unbalanced_payload = {
        "entity_id": cash_acc["entity_id"],
        "entry_date": "2026-09-15",
        "description": "Faulty unbalanced voucher",
        "lines": [
            {"account_id": cash_acc["id"], "debit": 10000.00, "credit": 0.00},
            {"account_id": sales_acc["id"], "debit": 0.00, "credit": 9000.00}
        ]
    }
    res = client.post("/api/v1/journal-entries", json=unbalanced_payload, headers=acct_headers)
    assert res.status_code == 400
    assert "Double-entry balance violation" in res.json()["detail"]

def test_reviewer_rejection_workflow():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    rev_headers = {"Authorization": f"Bearer {tokens['reviewer']}"}

    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    rent_acc = next(a for a in accounts if a["code"] == "5100")
    entity_id = cash_acc["entity_id"]
    rent_acc = next(a for a in accounts if a["code"] == "5100" and a["entity_id"] == entity_id)

    # Create & submit directly
    payload = {
        "entity_id": cash_acc["entity_id"],
        "entry_date": "2026-09-15",
        "description": "Office rent payment without GST invoice attached",
        "save_as_draft": False,
        "lines": [
            {"account_id": rent_acc["id"], "debit": 50000.00, "credit": 0.00},
            {"account_id": cash_acc["id"], "debit": 0.00, "credit": 50000.00}
        ]
    }
    create_res = client.post("/api/v1/journal-entries", json=payload, headers=acct_headers)
    assert create_res.status_code == 201
    journal_id = create_res.json()["id"]

    # Reject without reason fails
    no_reason = client.post(f"/api/v1/journal-entries/{journal_id}/reject", json={}, headers=rev_headers)
    assert no_reason.status_code == 400

    # Reject with reason succeeds
    rej_res = client.post(
        f"/api/v1/journal-entries/{journal_id}/reject",
        json={"reason": "Missing tax invoice and landlord pan card. Please re-attach."},
        headers=rev_headers
    )
    assert rej_res.status_code == 200
    rejected_journal = rej_res.json()
    assert rejected_journal["status"] == "REJECTED"
    assert "Missing tax invoice" in rejected_journal["rejection_reason"]

    # Accountant can edit rejected journal to fix it
    fix_res = client.put(
        f"/api/v1/journal-entries/{journal_id}",
        json={"reference": "GST-INV-2026-991"},
        headers=acct_headers
    )
    assert fix_res.status_code == 200
    assert fix_res.json()["status"] == "DRAFT"  # Reset to draft for resubmission

