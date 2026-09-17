import pytest
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

def test_entities_crud_and_details():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    # 1. List entities
    res = client.get("/api/v1/entities", headers=admin_headers)
    assert res.status_code == 200
    entities = res.json()
    assert len(entities) >= 1
    entity_id = entities[0]["id"]

    # 2. Get single entity
    detail_res = client.get(f"/api/v1/entities/{entity_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == entity_id
    assert "name" in detail
    assert "country" in detail

    # 3. Update entity (Admin)
    update_payload = {
        "city": "Mumbai",
        "state": "Maharashtra",
        "pan": "AABCR1234F",
        "financial_year": "2025-26"
    }
    put_res = client.put(f"/api/v1/entities/{entity_id}", json=update_payload, headers=admin_headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["city"] == "Mumbai"
    assert updated["pan"] == "AABCR1234F"

    # 4. Accountant cannot update entity (Forbidden 403)
    forbidden_put = client.put(f"/api/v1/entities/{entity_id}", json=update_payload, headers=acct_headers)
    assert forbidden_put.status_code == 403

def test_user_entity_assignment_workflow():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # Get entity
    res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = res.json()[0]["id"]

    # Get users to find accountant ID
    acct_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['accountant']}"}).json()
    acct_id = acct_me["id"]

    # Assign accountant to entity
    assign_res = client.post(f"/api/v1/entities/{entity_id}/users", json={"user_id": acct_id}, headers=admin_headers)
    assert assign_res.status_code == 200
    users = assign_res.json()
    user_ids = [u["user_id"] for u in users]
    assert acct_id in user_ids

    # List users assigned
    list_users_res = client.get(f"/api/v1/entities/{entity_id}/users", headers=admin_headers)
    assert list_users_res.status_code == 200
    assert any(u["user_id"] == acct_id for u in list_users_res.json())

    # Unassign user
    del_res = client.delete(f"/api/v1/entities/{entity_id}/users/{acct_id}", headers=admin_headers)
    assert del_res.status_code == 200

