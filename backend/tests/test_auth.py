import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "healthy"

def test_login_admin_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" == "access_token"
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@ricozbooks.com"
    assert "ADMIN" in data["user"]["roles"]

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_login_accountant_and_me():
    # Login as accountant
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "accountant@ricozbooks.com", "password": "accountant123"}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    
    # Test /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "accountant@ricozbooks.com"
    assert "ACCOUNTANT" in me_data["roles"]

def test_entities_retrieval():
    # Login as admin
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    ent_res = client.get("/api/v1/entities", headers=headers)
    assert ent_res.status_code == 200
    entities = ent_res.json()
    assert len(entities) >= 3
    codes = [e["code"] for e in entities]
    assert "RICOZ_IN" in codes
    assert "RICOZ_US" in codes
    assert "RICOZ_UK" in codes

def test_demo_request_endpoint():
    res = client.post(
        "/api/v1/auth/demo-request",
        json={
            "full_name": "Rohan Deshmukh",
            "work_email": "rohan@techcorp.in",
            "phone_number": "+91 98765 43210",
            "company_name": "TechCorp Solutions Pvt Ltd",
            "role": "CFO / Business Owner",
            "entities_count": "2–5",
            "what_to_see": "Accounting & Double-Entry Ledger",
            "preferred_date": "2026-10-05",
            "preferred_time": "11:30 AM - 12:30 PM IST"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "reference_id" in data
    assert data["reference_id"].startswith("DEMO-")


