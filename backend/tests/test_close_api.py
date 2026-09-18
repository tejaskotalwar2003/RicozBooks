import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    tokens = {}
    for role, email in [("admin", "admin@ricozbooks.com"), ("accountant", "accountant@ricozbooks.com"), ("reviewer", "reviewer@ricozbooks.com")]:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": f"{role}123"})
        tokens[role] = res.json()["access_token"]
    return tokens

def test_get_close_periods_and_tasks():
    tokens = get_tokens()
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    
    # 1. Fetch entities
    ent_res = client.get("/api/v1/entities", headers=headers)
    assert ent_res.status_code == 200
    entity_id = ent_res.json()[0]["id"]
    
    # 2. Get close periods
    periods_res = client.get(f"/api/v1/close/periods?entity_id={entity_id}", headers=headers)
    assert periods_res.status_code == 200
    periods = periods_res.json()
    assert len(periods) >= 1
    
    period = periods[0]
    period_id = period["id"]
    assert "September" in period["period_name"] or period["month"] == 9
    
    # 3. Get detailed period with tasks
    detail_res = client.get(f"/api/v1/close/periods/{period_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["tasks"]) >= 8
    
    task_names = [t["task_name"] for t in detail["tasks"]]
    assert any("Bank Reconciliation" in n for n in task_names)
    assert any("Depreciation" in n for n in task_names)

def test_close_task_update_and_progress_recalculation():
    tokens = get_tokens()
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]
    
    periods = client.get(f"/api/v1/close/periods?entity_id={entity_id}", headers=admin_headers).json()
    period_id = periods[0]["id"]
    
    detail = client.get(f"/api/v1/close/periods/{period_id}", headers=admin_headers).json()
    first_task = detail["tasks"][0]
    
    # Update task to IN_PROGRESS
    update_res = client.put(
        f"/api/v1/close/tasks/{first_task['id']}",
        json={"status": "IN_PROGRESS", "notes": "Checking September statement"},
        headers=acct_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"
    assert update_res.json()["notes"] == "Checking September statement"
    
    # Reviewer marks APPROVED
    rev_headers = {"Authorization": f"Bearer {tokens['reviewer']}"}
    appr_res = client.put(
        f"/api/v1/close/tasks/{first_task['id']}",
        json={"status": "APPROVED", "notes": "Bank statement matched to penny"},
        headers=rev_headers
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"
    assert appr_res.json()["completed_at"] is not None

def test_hard_period_lock_enforcement_and_emergency_reopen():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}
    
    # 1. Fetch entities & accounts
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]
    
    periods = client.get(f"/api/v1/close/periods?entity_id={entity_id}", headers=admin_headers).json()
    period_id = periods[0]["id"]
    
    # 2. Non-admin cannot lock period
    unauth_lock = client.post(
        f"/api/v1/close/periods/{period_id}/lock",
        json={"notes": "Accountant trying to lock"},
        headers=acct_headers
    )
    assert unauth_lock.status_code == 403
    
    # 3. Admin locks period
    lock_res = client.post(
        f"/api/v1/close/periods/{period_id}/lock",
        json={"notes": "Final September 2026 close sign-off by CFO"},
        headers=admin_headers
    )
    assert lock_res.status_code == 200
    locked_period = lock_res.json()
    assert locked_period["status"] == "CLOSED"
    assert locked_period["closed_at"] is not None
    
    # 4. HARD LOCK ENFORCEMENT: Attempting to create journal entry dated September 2026 is blocked
    acc_res = client.get("/api/v1/accounts", headers=admin_headers)
    accounts = acc_res.json()
    cash_acc = next(a for a in accounts if a["code"] == "1000")
    sales_acc = next(a for a in accounts if a["code"] == "4000")
    
    blocked_journal = {
        "entity_id": entity_id,
        "entry_date": "2026-09-20",  # September 2026 is CLOSED
        "reference": "BLOCKED-JE-01",
        "description": "Attempt to post to locked September period",
        "currency": "INR",
        "exchange_rate": 1.0,
        "save_as_draft": True,
        "lines": [
            {"account_id": cash_acc["id"], "description": "Cash", "debit": 5000.0, "credit": 0.0},
            {"account_id": sales_acc["id"], "description": "Sales", "debit": 0.0, "credit": 5000.0}
        ]
    }
    create_blocked = client.post("/api/v1/journal-entries", json=blocked_journal, headers=acct_headers)
    assert create_blocked.status_code == 400
    assert "locked and closed" in create_blocked.json()["detail"] or "permanently closed" in create_blocked.json()["detail"]
    
    # 5. Non-admin cannot modify tasks in locked period
    detail = client.get(f"/api/v1/close/periods/{period_id}", headers=admin_headers).json()
    first_task = detail["tasks"][0]
    task_edit_blocked = client.put(
        f"/api/v1/close/tasks/{first_task['id']}",
        json={"status": "IN_PROGRESS"},
        headers=acct_headers
    )
    assert task_edit_blocked.status_code == 400
    assert "closed and locked" in task_edit_blocked.json()["detail"]
    
    # 6. Admin emergency reopen
    reopen_res = client.post(
        f"/api/v1/close/periods/{period_id}/reopen",
        json={"reason": "Emergency statutory audit adjustments authorized by CFO"},
        headers=admin_headers
    )
    assert reopen_res.status_code == 200
    reopened_period = reopen_res.json()
    assert reopened_period["status"] in ["IN_PROGRESS", "READY_FOR_REVIEW"]
    assert reopened_period["closed_at"] is None
    
    # 7. Journal creation is now permitted again in unlocked period
    allowed_journal = client.post("/api/v1/journal-entries", json=blocked_journal, headers=acct_headers)
    assert allowed_journal.status_code == 201
