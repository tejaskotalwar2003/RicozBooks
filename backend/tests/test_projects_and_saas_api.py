import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.models.company import Entity
from app.models.sales import Customer

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

def test_projects_lifecycle_and_profitability(auth_headers, active_entity):
    entity_id = active_entity["id"]
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.entity_id == entity_id).first()
        if not customer:
            customer = Customer(
                entity_id=entity_id,
                name="Acme Corp Enterprise",
                currency="INR"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
        customer_id = customer.id
    finally:
        db.close()

    # 1. Create Project
    import uuid
    unique_suffix = uuid.uuid4().hex[:6]
    proj_payload = {
        "entity_id": entity_id,
        "customer_id": customer_id,
        "name": "Cloud ERP Implementation",
        "code": f"PRJ-ERP-2026-{entity_id}",
        "code": f"PRJ-{unique_suffix}",
        "description": "Full-lifecycle enterprise ERP deployment and data migration",
        "billing_type": "TIME_AND_MATERIALS",
        "status": "IN_PROGRESS",
        "budget_amount": "50000.00",
        "default_hourly_rate": "150.00",
        "start_date": str(date.today())
    }

    create_res = client.post("/api/v1/projects", json=proj_payload, headers=auth_headers)
    assert create_res.status_code == 201, f"Create project failed: {create_res.text}"
    project = create_res.json()
    project_id = project["id"]
    assert project["name"] == "Cloud ERP Implementation"
    assert Decimal(str(project["budget_amount"])) == Decimal("50000.00")

    # 2. Add Project Task
    task_res = client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "name": "Database Migration & Validation",
            "description": "Port double-entry ledgers",
            "estimated_hours": "40.00",
            "status": "IN_PROGRESS"
        },
        headers=auth_headers
    )
    assert task_res.status_code == 201
    assert task_res.status_code == 201, f"Task error detail: {task_res.text}"
    task = task_res.json()
    task_id = task["id"]
    assert task["project_id"] == project_id

    # 3. Log Timesheet
    ts_res = client.post(
        "/api/v1/projects/timesheets",
        json={
            "entity_id": entity_id,
            "project_id": project_id,
            "task_id": task_id,
            "entry_date": str(date.today()),
            "hours": "10.00",
            "hourly_billable_rate": "150.00",
            "hourly_cost_rate": "50.00",
            "is_billable": True,
            "notes": "Architected multi-entity isolation"
        },
        headers=auth_headers
    )
    assert ts_res.status_code == 201
    timesheet = ts_res.json()
    assert Decimal(str(timesheet["hours"])) == Decimal("10.00")
    assert Decimal(str(timesheet["total_billable_amount"])) == Decimal("1500.00")
    assert Decimal(str(timesheet["total_cost_amount"])) == Decimal("500.00")

    # 4. Check Profitability
    prof_res = client.get(f"/api/v1/projects/{project_id}/profitability", headers=auth_headers)
    assert prof_res.status_code == 200
    profitability = prof_res.json()
    assert Decimal(str(profitability["total_billable_hours"])) == Decimal("10.00")
    assert Decimal(str(profitability["total_labor_cost"])) == Decimal("500.00")
    assert Decimal(str(profitability["gross_profit"])) == Decimal("1000.00")  # 1500 revenue - 500 cost
    assert Decimal(str(profitability["gross_margin_pct"])) > 0

    # 5. List Projects
    list_res = client.get(f"/api/v1/projects?entity_id={entity_id}", headers=auth_headers)
    assert list_res.status_code == 200
    p_data = list_res.json()
    projects = p_data.get("items", p_data) if isinstance(p_data, dict) else p_data
    assert any(p["id"] == project_id for p in projects)



def test_notifications_and_automation_checks(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # 1. Trigger Automation Checks (Overdue invoices scan, recurring billing)
    trigger_res = client.post(
        f"/api/v1/notifications/trigger-checks?entity_id={entity_id}",
        headers=auth_headers
    )
    assert trigger_res.status_code == 200
    trigger_data = trigger_res.json()
    assert "Automation cycle completed successfully" in trigger_data["message"]

    # 2. Get Notifications
    notifs_res = client.get(
        f"/api/v1/notifications?entity_id={entity_id}",
        headers=auth_headers
    )
    assert notifs_res.status_code == 200
    summary = notifs_res.json()
    assert "unread_count" in summary
    assert "notifications" in summary

    if summary["notifications"]:
        first_notif_id = summary["notifications"][0]["id"]
        # 3. Mark single as read
        read_res = client.put(f"/api/v1/notifications/{first_notif_id}/read", headers=auth_headers)
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

    # 4. Mark all as read
    all_read_res = client.put(f"/api/v1/notifications/mark-all-read?entity_id={entity_id}", headers=auth_headers)
    assert all_read_res.status_code == 200

    # Verify unread count is 0
    notifs_res2 = client.get(f"/api/v1/notifications?entity_id={entity_id}", headers=auth_headers)
    assert notifs_res2.json()["unread_count"] == 0


def test_saas_subscriptions_and_upgrades(auth_headers):
    # 1. Get SaaS Plans Catalog
    plans_res = client.get("/api/v1/subscriptions/plans", headers=auth_headers)
    assert plans_res.status_code == 200
    plans = plans_res.json()
    assert len(plans) >= 4
    tier_names = [p["tier"] for p in plans]
    assert "FREE" in tier_names
    assert "STARTER" in tier_names
    assert "GROWTH" in tier_names
    assert "ENTERPRISE" in tier_names

    # 2. Get Current Company Subscription & Quotas
    current_sub_res = client.get("/api/v1/subscriptions/current", headers=auth_headers)
    assert current_sub_res.status_code == 200
    current_sub = current_sub_res.json()
    assert "plan" in current_sub
    assert "entities_used" in current_sub
    assert "users_used" in current_sub

    # 3. Upgrade Plan to ENTERPRISE
    upgrade_res = client.post(
        "/api/v1/subscriptions/upgrade",
        json={"tier": "ENTERPRISE", "billing_cycle": "ANNUALLY"},
        headers=auth_headers
    )
    assert upgrade_res.status_code == 200
    upgraded = upgrade_res.json()
    assert upgraded["plan"]["tier"] == "ENTERPRISE"
    assert upgraded["billing_cycle"] == "ANNUALLY"
    assert upgraded["plan"]["max_entities"] >= 50
