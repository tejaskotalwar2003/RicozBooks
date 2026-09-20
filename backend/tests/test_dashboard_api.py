import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dashboard_metrics_endpoint():
    # 1. Login as admin
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch entities
    ent_res = client.get("/api/v1/entities", headers=headers)
    assert ent_res.status_code == 200
    entities = ent_res.json()
    assert len(entities) >= 1
    entity_id = entities[0]["id"]

    # 3. Call dashboard metrics
    response = client.get(f"/api/v1/dashboard/metrics?entity_id={entity_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Validate essential metrics
    assert data["entity_id"] == entity_id
    assert "total_revenue" in data
    assert "total_expense" in data
    assert "net_profit" in data
    assert "total_assets" in data
    assert "is_balanced" in data
    assert "monthly_trajectory" in data
    assert isinstance(data["monthly_trajectory"], list)
    assert len(data["monthly_trajectory"]) >= 6
    assert "close_status" in data
    assert "journal_counts" in data
    assert "recent_journals" in data

    # Check journal counts breakdown
    counts = data["journal_counts"]
    assert "total" in counts
    assert "draft" in counts
    assert "pending" in counts
    assert "approved" in counts
    assert "posted" in counts
    assert "rejected" in counts
