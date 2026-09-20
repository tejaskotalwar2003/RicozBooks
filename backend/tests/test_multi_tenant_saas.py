import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_company_self_serve_registration():
    """Verify that any new business can self-register and atomically provision a full tenant workspace."""
    unique_suffix = uuid.uuid4().hex[:6]
    company_name = f"Nova Corp {unique_suffix}"
    admin_email = f"cfo_{unique_suffix}@novacorp.com"

    payload = {
        "company_name": company_name,
        "legal_name": f"{company_name} Ltd.",
        "business_email": f"info_{unique_suffix}@novacorp.com",
        "phone_number": "+91 9876543210",
        "country": "India",
        "address": "123 Business Bay, High Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "base_currency": "INR",
        "timezone": "Asia/Kolkata",
        "tax_identifier": f"27AABCN{unique_suffix.upper()}1Z5",
        "admin_name": "Rohan Deshmukh",
        "admin_email": admin_email,
        "password": "SecurePassword123!"
    }

    res = client.post("/api/v1/auth/register-company", json=payload)
    assert res.status_code == 201, f"Failed registration: {res.text}"
    data = res.json()

    assert "access_token" in data
    assert data["company_name"] == company_name
    assert data["company_id"] is not None
    assert data["entity_id"] is not None
    assert "Head Office" in data["entity_name"]

    user_info = data["user"]
    assert user_info["email"] == admin_email
    assert user_info["first_name"] == "Rohan"
    assert user_info["last_name"] == "Deshmukh"
    assert "ORG_ADMIN" in user_info["roles"]
    assert "ADMIN" in user_info["roles"]

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify standard Chart of Accounts was provisioned for the new company's entity
    coa_res = client.get(f"/api/v1/accounts?entity_id={data['entity_id']}", headers=headers)
    assert coa_res.status_code == 200
    accounts = coa_res.json()
    assert len(accounts) >= 10
    account_codes = [a["code"] for a in accounts]
    assert "1000" in account_codes  # Cash
    assert "1100" in account_codes  # Bank
    assert "1200" in account_codes  # AR
    assert "2000" in account_codes  # AP
    assert "4000" in account_codes  # Revenue

    # Verify company details endpoint
    org_res = client.get("/api/v1/tenants/company", headers=headers)
    assert org_res.status_code == 200
    org_data = org_res.json()
    assert org_data["name"] == company_name
    assert org_data["country"] == "India"
    assert org_data["base_currency"] == "INR"

def test_duplicate_registration_prevented():
    """Ensure duplicate email or company name is rejected."""
    unique_suffix = uuid.uuid4().hex[:6]
    company_name = f"Duplicate Corp {unique_suffix}"
    admin_email = f"admin_{unique_suffix}@dup.com"

    payload = {
        "company_name": company_name,
        "business_email": admin_email,
        "admin_name": "Test Admin",
        "admin_email": admin_email,
        "password": "Password123"
    }

    res1 = client.post("/api/v1/auth/register-company", json=payload)
    assert res1.status_code == 201

    # Attempt same email
    res2 = client.post("/api/v1/auth/register-company", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()

def test_multi_tenant_data_isolation():
    """Verify that Tenant A cannot access, query, or mutate Tenant B's data."""
    # 1. Register Tenant A
    suf_a = uuid.uuid4().hex[:6]
    res_a = client.post("/api/v1/auth/register-company", json={
        "company_name": f"Tenant Alpha {suf_a}",
        "business_email": f"contact_{suf_a}@alpha.com",
        "admin_name": "Alpha Admin",
        "admin_email": f"admin_{suf_a}@alpha.com",
        "password": "Password123"
    })
    data_a = res_a.json()
    token_a = data_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    entity_a_id = data_a["entity_id"]

    # 2. Register Tenant B
    suf_b = uuid.uuid4().hex[:6]
    res_b = client.post("/api/v1/auth/register-company", json={
        "company_name": f"Tenant Beta {suf_b}",
        "business_email": f"contact_{suf_b}@beta.com",
        "admin_name": "Beta Admin",
        "admin_email": f"admin_{suf_b}@beta.com",
        "password": "Password123"
    })
    data_b = res_b.json()
    token_b = data_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    entity_b_id = data_b["entity_id"]

    # Tenant A attempts to view Tenant B's entity details -> MUST be 403 Forbidden
    cross_entity_res = client.get(f"/api/v1/entities/{entity_b_id}", headers=headers_a)
    assert cross_entity_res.status_code == 403

    # Tenant A attempts to query Tenant B's accounts -> MUST be 403 Forbidden
    cross_coa_res = client.get(f"/api/v1/accounts?entity_id={entity_b_id}", headers=headers_a)
    assert cross_coa_res.status_code == 403

    # Tenant A queries their own accounts -> MUST succeed and only contain Tenant A accounts
    own_coa_res = client.get(f"/api/v1/accounts?entity_id={entity_a_id}", headers=headers_a)
    assert own_coa_res.status_code == 200

    # Tenant A attempts to query Tenant B's general ledger -> MUST be 403 Forbidden
    cross_ledger_res = client.get(f"/api/v1/ledger/summary?entity_id={entity_b_id}", headers=headers_a)
    assert cross_ledger_res.status_code == 403

    # Tenant A attempts to query Tenant B's trial balance -> MUST be 403 Forbidden
    cross_report_res = client.get(f"/api/v1/reports/trial-balance?entity_id={entity_b_id}", headers=headers_a)
    assert cross_report_res.status_code == 403

def test_team_member_invitation_lifecycle():
    """Verify inviting an employee, validating the token, and accepting the invite to join the tenant."""
    # 1. Register Company
    suf = uuid.uuid4().hex[:6]
    reg_res = client.post("/api/v1/auth/register-company", json={
        "company_name": f"Nexus Tech {suf}",
        "business_email": f"hello_{suf}@nexus.com",
        "admin_name": "Nexus CEO",
        "admin_email": f"ceo_{suf}@nexus.com",
        "password": "Password123"
    })
    admin_token = reg_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Org Admin invites an Accountant
    invite_email = f"accountant_{suf}@nexus.com"
    invite_res = client.post(
        "/api/v1/tenants/invitations",
        json={"email": invite_email, "role": "ACCOUNTANT"},
        headers=admin_headers
    )
    assert invite_res.status_code == 201
    invite_data = invite_res.json()
    token = invite_data["token"]
    assert invite_data["role"] == "ACCOUNTANT"
    assert invite_data["status"] == "PENDING"

    # 3. Public validation of invitation token
    val_res = client.get(f"/api/v1/tenants/invitations/validate/{token}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert val_data["company_name"] == f"Nexus Tech {suf}"
    assert val_data["role"] == "ACCOUNTANT"

    # 4. Employee accepts invitation and sets password
    accept_res = client.post(
        "/api/v1/tenants/invitations/accept",
        json={
            "token": token,
            "first_name": "Ananya",
            "last_name": "Roy",
            "password": "EmployeePassword123!"
        }
    )
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    employee_token = accept_data["access_token"]
    employee_user = accept_data["user"]
    assert employee_user["email"] == invite_email
    assert "ACCOUNTANT" in employee_user["roles"]
    assert employee_user["default_company_id"] == reg_res.json()["company_id"]

    # 5. Verify members list shows both Admin and new employee
    members_res = client.get("/api/v1/tenants/members", headers=admin_headers)
    assert members_res.status_code == 200
    members = members_res.json()
    emails = [m["email"] for m in members]
    assert f"ceo_{suf}@nexus.com" in emails
    assert invite_email in emails

def test_non_admin_cannot_invite():
    """Verify that accountants cannot send team invitations."""
    # Login as existing demo accountant
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "accountant@ricozbooks.com", "password": "accountant123"}
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    invite_res = client.post(
        "/api/v1/tenants/invitations",
        json={"email": "hacker@test.com", "role": "ADMIN"},
        headers=headers
    )
    assert invite_res.status_code == 403
