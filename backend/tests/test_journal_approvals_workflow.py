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

def test_journal_approvals_and_reopen_workflow():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    rev_headers = {"Authorization": f"Bearer {tokens['reviewer']}"}

    # 1. Fetch accounts to build valid double-entry lines
    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    entity_id = cash_acc["entity_id"]
    sales_acc = next(a for a in accounts if a["code"] == "4000" and a["entity_id"] == entity_id)

    # 2. Check summary before new submissions
    rev_summary_before = client.get(f"/api/v1/journal-entries/approvals/summary?entity_id={entity_id}", headers=rev_headers).json()
    assert rev_summary_before["can_approve"] is True
    initial_pending = rev_summary_before["pending_count"]
    initial_approved = rev_summary_before["approved_count"]

    # Non-reviewer (accountant) check
    acct_summary = client.get(f"/api/v1/journal-entries/approvals/summary?entity_id={entity_id}", headers=acct_headers).json()
    assert acct_summary["can_approve"] is False
    assert acct_summary["pending_count"] == 0  # non-reviewer queue is 0

    # 3. Create a draft journal
    journal_payload = {
        "entity_id": entity_id,
        "entry_date": "2026-09-20",
        "reference": "TEST-APP-FLOW-01",
        "description": "Maker-Reviewer-Reopen test journal",
        "currency": "INR",
        "exchange_rate": 1.0,
        "save_as_draft": True,
        "lines": [
            {"account_id": cash_acc["id"], "description": "Cash receipt", "debit": 4500.00, "credit": 0.00},
            {"account_id": sales_acc["id"], "description": "Software license", "debit": 0.00, "credit": 4500.00}
        ]
    }
    create_res = client.post("/api/v1/journal-entries", json=journal_payload, headers=acct_headers)
    assert create_res.status_code == 201
    journal_id = create_res.json()["id"]
    assert create_res.json()["status"] == "DRAFT"

    # Draft cannot be reopened
    bad_reopen = client.post(f"/api/v1/journal-entries/{journal_id}/reopen", json={"reason": "Should fail"}, headers=rev_headers)
    assert bad_reopen.status_code == 400

    # 4. Submit for review -> pending_count increases
    sub_res = client.post(f"/api/v1/journal-entries/{journal_id}/submit", headers=acct_headers)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "SUBMITTED"

    rev_summary_after_sub = client.get(f"/api/v1/journal-entries/approvals/summary?entity_id={entity_id}", headers=rev_headers).json()
    assert rev_summary_after_sub["pending_count"] == initial_pending + 1

    # Non-reviewer cannot approve
    forbidden_appr = client.post(f"/api/v1/journal-entries/{journal_id}/approve", json={"comments": "Hack"}, headers=acct_headers)
    assert forbidden_appr.status_code == 403

    # 5. Reviewer approves
    appr_res = client.post(f"/api/v1/journal-entries/{journal_id}/approve", json={"comments": "First approval by reviewer"}, headers=rev_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    rev_summary_after_appr = client.get(f"/api/v1/journal-entries/approvals/summary?entity_id={entity_id}", headers=rev_headers).json()
    assert rev_summary_after_appr["pending_count"] == initial_pending
    assert rev_summary_after_appr["approved_count"] == initial_approved + 1

    # Double approval fails
    double_appr = client.post(f"/api/v1/journal-entries/{journal_id}/approve", json={"comments": "Double"}, headers=rev_headers)
    assert double_appr.status_code == 400

    # 6. Reviewer realizes mistake BEFORE posting -> Reopen workflow
    # Reopen without reason fails
    no_reason = client.post(f"/api/v1/journal-entries/{journal_id}/reopen", json={"reason": ""}, headers=rev_headers)
    assert no_reason.status_code == 400

    # Non-reviewer cannot reopen
    acct_reopen = client.post(f"/api/v1/journal-entries/{journal_id}/reopen", json={"reason": "Accountant trying to reopen"}, headers=acct_headers)
    assert acct_reopen.status_code == 403

    # Reviewer reopens with valid reason
    reopen_res = client.post(
        f"/api/v1/journal-entries/{journal_id}/reopen",
        json={"reason": "Incorrect revenue account credited. Needs line correction."},
        headers=rev_headers
    )
    assert reopen_res.status_code == 200
    reopened_journal = reopen_res.json()
    assert reopened_journal["status"] == "SUBMITTED"

    # Pending count is back up, approved count is back down
    rev_summary_after_reopen = client.get(f"/api/v1/journal-entries/approvals/summary?entity_id={entity_id}", headers=rev_headers).json()
    assert rev_summary_after_reopen["pending_count"] == initial_pending + 1
    assert rev_summary_after_reopen["approved_count"] == initial_approved

    # Check audit / approval trail: BOTH previous APPROVED and new REOPENED exist
    detail_res = client.get(f"/api/v1/journal-entries/{journal_id}", headers=rev_headers)
    approvals = detail_res.json()["approvals"]
    actions = [a["action"] for a in approvals]
    assert "APPROVED" in actions
    assert "REOPENED" in actions
    reopen_trail = next(a for a in approvals if a["action"] == "REOPENED")
    assert "Incorrect revenue account credited" in reopen_trail["comments"]

    # 7. Re-approve after re-review
    re_appr = client.post(f"/api/v1/journal-entries/{journal_id}/approve", json={"comments": "Re-verified and approved"}, headers=rev_headers)
    assert re_appr.status_code == 200
    assert re_appr.json()["status"] == "APPROVED"

    # 8. Post to GL
    post_res = client.post(f"/api/v1/journal-entries/{journal_id}/post", headers=rev_headers)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "POSTED"

    # 9. POSTED journal CANNOT be reopened! Must return 400
    post_reopen = client.post(
        f"/api/v1/journal-entries/{journal_id}/reopen",
        json={"reason": "Mistake after posting"},
        headers=rev_headers
    )
    assert post_reopen.status_code == 400
    assert "Posted journal entries cannot be reopened" in post_reopen.json()["detail"]

def test_journal_rejection_and_resubmission_flow():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    rev_headers = {"Authorization": f"Bearer {tokens['reviewer']}"}

    acc_res = client.get("/api/v1/accounts", headers=acct_headers)
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    entity_id = cash_acc["entity_id"]
    sales_acc = next(a for a in accounts if a["code"] == "4000" and a["entity_id"] == entity_id)

    # 1. Create and submit
    journal_payload = {
        "entity_id": entity_id,
        "entry_date": "2026-09-21",
        "reference": "TEST-REJECT-01",
        "description": "Voucher to be rejected",
        "currency": "INR",
        "exchange_rate": 1.0,
        "save_as_draft": False,
        "lines": [
            {"account_id": cash_acc["id"], "description": "Cash", "debit": 1200.00, "credit": 0.00},
            {"account_id": sales_acc["id"], "description": "Sales", "debit": 0.00, "credit": 1200.00}
        ]
    }
    create_res = client.post("/api/v1/journal-entries", json=journal_payload, headers=acct_headers)
    assert create_res.status_code == 201
    journal_id = create_res.json()["id"]
    assert create_res.json()["status"] == "SUBMITTED"

    # 2. Reject without reason fails
    no_reason = client.post(f"/api/v1/journal-entries/{journal_id}/reject", json={"reason": ""}, headers=rev_headers)
    assert no_reason.status_code == 400

    # 3. Reject with reason
    reject_res = client.post(
        f"/api/v1/journal-entries/{journal_id}/reject",
        json={"reason": "Missing supporting customer purchase order."},
        headers=rev_headers
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"
    assert reject_res.json()["rejection_reason"] == "Missing supporting customer purchase order."

    # 4. Accountant updates rejected journal -> resets to DRAFT
    update_res = client.put(
        f"/api/v1/journal-entries/{journal_id}",
        json={"description": "Voucher with attached PO"},
        headers=acct_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "DRAFT"

    # 5. Resubmit
    resubmit_res = client.post(f"/api/v1/journal-entries/{journal_id}/submit", headers=acct_headers)
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"] == "SUBMITTED"
