import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    tokens = {}
    for role, email in [
        ("admin", "admin@ricozbooks.com"),
        ("accountant", "accountant@ricozbooks.com"),
        ("reviewer", "reviewer@ricozbooks.com")
    ]:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": f"{role}123"})
        tokens[role] = res.json()["access_token"]
    return tokens

def test_get_and_upsert_exchange_rates():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    # 1. Fetch exchange rates
    res = client.get("/api/v1/settings/exchange-rates", headers=admin_headers)
    assert res.status_code == 200
    rates = res.json()
    assert len(rates) >= 1

    # 2. Accountant attempt to add exchange rate should be rejected (403)
    acct_post = client.post(
        "/api/v1/settings/exchange-rates",
        headers=acct_headers,
        json={"from_currency": "USD", "to_currency": "INR", "rate": 84.50}
    )
    assert acct_post.status_code == 403

    # 3. Admin upserts exchange rate
    admin_post = client.post(
        "/api/v1/settings/exchange-rates",
        headers=admin_headers,
        json={"from_currency": "USD", "to_currency": "INR", "rate": 84.50, "effective_date": str(date.today())}
    )
    assert admin_post.status_code in [200, 201]
    saved_rate = admin_post.json()
    assert float(saved_rate["rate"]) == 84.5

    # 4. Update existing rate by ID
    rate_id = saved_rate["id"]
    put_res = client.put(
        f"/api/v1/settings/exchange-rates/{rate_id}",
        headers=admin_headers,
        json={"rate": 84.75}
    )
    assert put_res.status_code == 200
    assert float(put_res.json()["rate"]) == 84.75

def test_fiscal_periods_and_generate_year():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    # Get entity
    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    assert ent_res.status_code == 200
    entity_id = ent_res.json()[0]["id"]

    # Generate 12 periods for FY 2027-28
    gen_res = client.post(
        "/api/v1/settings/fiscal-periods/generate-year",
        headers=admin_headers,
        json={"entity_id": entity_id, "fiscal_year": "2027-28", "start_month": 4}
    )
    assert gen_res.status_code == 200
    periods = gen_res.json()
    assert len(periods) == 12
    assert periods[0]["period_number"] == 1
    assert "April" in periods[0]["name"]
    assert periods[11]["period_number"] == 12
    assert "March" in periods[11]["name"]

    # Query fiscal periods
    query_res = client.get(
        f"/api/v1/settings/fiscal-periods?entity_id={entity_id}&fiscal_year=2027-28",
        headers=acct_headers
    )
    assert query_res.status_code == 200
    assert len(query_res.json()) == 12

def test_roles_and_permissions_matrix():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    # 1. Fetch RBAC Matrix
    matrix_res = client.get("/api/v1/settings/roles-matrix", headers=acct_headers)
    assert matrix_res.status_code == 200
    matrix = matrix_res.json()
    assert "roles" in matrix
    assert "all_permissions" in matrix

    role_names = [r["name"] for r in matrix["roles"]]
    assert "ADMIN" in role_names
    assert "ACCOUNTANT" in role_names
    assert "REVIEWER" in role_names

    # 2. Accountant forbidden from updating permissions
    put_acct = client.put(
        "/api/v1/settings/roles-matrix",
        headers=acct_headers,
        json={"role_name": "ACCOUNTANT", "permission_codes": ["journals:create"]}
    )
    assert put_acct.status_code == 403

    # 3. Admin cannot wipe ADMIN role to empty
    wipe_admin = client.put(
        "/api/v1/settings/roles-matrix",
        headers=admin_headers,
        json={"role_name": "ADMIN", "permission_codes": []}
    )
    assert wipe_admin.status_code == 400

def test_entity_tax_profile():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    acct_headers = {"Authorization": f"Bearer {tokens['accountant']}"}

    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]

    # 1. Get entity profile
    prof_res = client.get(f"/api/v1/settings/entity-profile/{entity_id}", headers=acct_headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["id"] == entity_id
    assert "code" in prof

    # 2. Non-admin forbidden from updating profile
    acct_put = client.put(
        f"/api/v1/settings/entity-profile/{entity_id}",
        headers=acct_headers,
        json={"gstin": "27AABCA1234F1Z9"}
    )
    assert acct_put.status_code == 403

    # 3. Admin updates tax profile
    admin_put = client.put(
        f"/api/v1/settings/entity-profile/{entity_id}",
        headers=admin_headers,
        json={
            "legal_name": "Ricoz India Enterprise Ltd",
            "gstin": "27AAACB9999F1Z1",
            "pan": "AAACB9999F",
            "address": "Level 14, Ricoz Financial Tower, BKC",
            "city": "Mumbai",
            "state": "Maharashtra"
        }
    )
    assert admin_put.status_code == 200
    updated = admin_put.json()
    assert updated["legal_name"] == "Ricoz India Enterprise Ltd"
    assert updated["gstin"] == "27AAACB9999F1Z1"
    assert updated["city"] == "Mumbai"
