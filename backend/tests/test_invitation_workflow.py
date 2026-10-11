import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def register_test_company(prefix: str):
    suffix = uuid.uuid4().hex[:6]
    company_name = f"{prefix} Corp {suffix}"
    admin_email = f"admin_{suffix}@{prefix.lower()}.com"
    payload = {
        "company_name": company_name,
        "legal_name": f"{company_name} Ltd.",
        "business_email": f"contact_{suffix}@{prefix.lower()}.com",
        "phone_number": "+91 9876543210",
        "country": "India",
        "address": "123 Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "base_currency": "INR",
        "admin_name": f"Admin {suffix}",
        "admin_email": admin_email,
        "password": "Password123!"
    }
    res = client.post("/api/v1/auth/register-company", json=payload)
    assert res.status_code == 201, f"Failed registration: {res.text}"
    data = res.json()
    return {
        "token": data["access_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "company_id": data["company_id"],
        "company_name": company_name,
        "admin_email": admin_email
    }

def test_invitation_creation_and_absolute_link():
    """Verify that invitations produce absolute links and initialize delivery tracking."""
    comp = register_test_company("Acme")
    invitee_email = f"invitee_{uuid.uuid4().hex[:6]}@example.com"

    invite_payload = {
        "email": invitee_email,
        "role": "ACCOUNTANT"
    }

    res = client.post("/api/v1/tenants/invitations", json=invite_payload, headers=comp["headers"])
    assert res.status_code == 201, f"Invitation creation failed: {res.text}"
    data = res.json()

    assert data["email"] == invitee_email
    assert data["role"] == "ACCOUNTANT"
    assert data["status"] == "PENDING"
    assert "invite_url" in data
    # Ensure it's an absolute URL, never a relative fragment like /invite/...
    assert data["invite_url"].startswith("http://") or data["invite_url"].startswith("https://")
    assert "/invite/" in data["invite_url"]
    assert "token=" not in data["invite_url"]  # Should be /invite/<token>
    assert data["email_status"] in ["SENT", "FAILED", "SKIPPED", "NOT_CONFIGURED"]

    # Validate public token
    token = data["invite_url"].split("/invite/")[-1]
    val_res = client.get(f"/api/v1/tenants/invitations/validate/{token}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert val_data["email"] == invitee_email
    assert val_data["company_name"] == comp["company_name"]
    assert val_data["role"] == "ACCOUNTANT"
    assert val_data["user_exists"] is False

def test_duplicate_invitation_refreshes_existing():
    """Verify that sending an invite to the same email refreshes the existing pending invite."""
    comp = register_test_company("DupeTest")
    invitee_email = f"dupe_{uuid.uuid4().hex[:6]}@example.com"

    res1 = client.post("/api/v1/tenants/invitations", json={"email": invitee_email, "role": "ACCOUNTANT"}, headers=comp["headers"])
    assert res1.status_code == 201
    inv_id1 = res1.json()["id"]

    # Send second invitation for same email with different role
    res2 = client.post("/api/v1/tenants/invitations", json={"email": invitee_email, "role": "MANAGER"}, headers=comp["headers"])
    assert res2.status_code == 201
    inv2_data = res2.json()
    
    # Should update the same record
    assert inv2_data["id"] == inv_id1
    assert inv2_data["role"] == "MANAGER"

    # List invitations should only show one pending invitation for that email
    list_res = client.get("/api/v1/tenants/invitations", headers=comp["headers"])
    assert list_res.status_code == 200
    invites = [i for i in list_res.json() if i["email"] == invitee_email]
    assert len(invites) == 1
    assert invites[0]["role"] == "MANAGER"

def test_resend_invitation_and_rate_limiting():
    """Verify that resending an invitation works and enforces rate limiting."""
    comp = register_test_company("ResendTest")
    invitee_email = f"resend_{uuid.uuid4().hex[:6]}@example.com"

    res = client.post("/api/v1/tenants/invitations", json={"email": invitee_email, "role": "REVIEWER"}, headers=comp["headers"])
    assert res.status_code == 201
    inv_id = res.json()["id"]

    # First immediate resend should be rate limited (since created < 60s ago)
    resend_fail = client.post(f"/api/v1/tenants/invitations/{inv_id}/resend", headers=comp["headers"])
    assert resend_fail.status_code == 429
    assert "wait" in resend_fail.json()["detail"].lower()

def test_revoke_invitation_workflow():
    """Verify that an invitation can be revoked and the token is subsequently rejected."""
    comp = register_test_company("RevokeTest")
    invitee_email = f"revoke_{uuid.uuid4().hex[:6]}@example.com"

    res = client.post("/api/v1/tenants/invitations", json={"email": invitee_email, "role": "ACCOUNTANT"}, headers=comp["headers"])
    assert res.status_code == 201
    inv_id = res.json()["id"]
    token = res.json()["invite_url"].split("/invite/")[-1]

    # Revoke
    rev_res = client.post(f"/api/v1/tenants/invitations/{inv_id}/revoke", headers=comp["headers"])
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVOKED"

    # Token validation should now report invalid with revoked message
    val_res = client.get(f"/api/v1/tenants/invitations/validate/{token}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is False
    assert "revoked" in val_data["message"].lower()

    # Attempting to accept should fail
    acc_res = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token,
        "first_name": "John",
        "last_name": "Doe",
        "password": "Password123!"
    })
    assert acc_res.status_code == 400
    assert "revoked" in acc_res.json()["detail"].lower()

def test_accept_invitation_new_user_flow():
    """Verify complete new user invitation acceptance lifecycle."""
    comp = register_test_company("NewUserCo")
    invitee_email = f"newuser_{uuid.uuid4().hex[:6]}@example.com"

    res = client.post("/api/v1/tenants/invitations", json={"email": invitee_email, "role": "ACCOUNTANT"}, headers=comp["headers"])
    assert res.status_code == 201
    token = res.json()["invite_url"].split("/invite/")[-1]
    inv_id = res.json()["id"]

    # Accept invitation
    acc_res = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token,
        "first_name": "Alice",
        "last_name": "Smith",
        "password": "Password123!"
    })
    assert acc_res.status_code == 200
    acc_data = acc_res.json()
    assert "access_token" in acc_data
    assert acc_data["user"]["email"] == invitee_email
    assert "ACCOUNTANT" in acc_data["user"]["roles"]

    # Re-acceptance should fail
    re_acc = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token,
        "first_name": "Alice",
        "last_name": "Smith",
        "password": "Password123!"
    })
    assert re_acc.status_code == 400
    assert "already been accepted" in re_acc.json()["detail"].lower()

    # Revoking an already accepted invitation must be rejected
    rev_res = client.post(f"/api/v1/tenants/invitations/{inv_id}/revoke", headers=comp["headers"])
    assert rev_res.status_code == 400
    assert "cannot revoke an invitation that has already been accepted" in rev_res.json()["detail"].lower()

def test_accept_invitation_existing_user_flow():
    """Verify that existing users can accept invitations by verifying their password."""
    # 1. Existing user in Company X
    comp_x = register_test_company("CompanyX")
    existing_user_email = comp_x["admin_email"]

    # 2. Company Y invites that same existing user
    comp_y = register_test_company("CompanyY")
    res = client.post("/api/v1/tenants/invitations", json={"email": existing_user_email, "role": "MANAGER"}, headers=comp_y["headers"])
    assert res.status_code == 201
    token = res.json()["invite_url"].split("/invite/")[-1]

    # 3. Validation indicates user exists
    val_res = client.get(f"/api/v1/tenants/invitations/validate/{token}")
    assert val_res.status_code == 200
    assert val_res.json()["user_exists"] is True

    # 4. Acceptance with invalid password fails
    fail_acc = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token,
        "password": "WrongPassword!"
    })
    assert fail_acc.status_code in [400, 401]
    assert "incorrect password" in fail_acc.json()["detail"].lower()

    # 5. Acceptance with correct password succeeds
    succ_acc = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token,
        "password": "Password123!"
    })
    assert succ_acc.status_code == 200
    data = succ_acc.json()
    assert "access_token" in data
    assert "MANAGER" in data["user"]["roles"]

def test_multi_tenant_invitation_isolation():
    """Verify that Tenant A cannot view, resend, or revoke Tenant B's invitations."""
    comp_a = register_test_company("TenantAlpha")
    comp_b = register_test_company("TenantBeta")

    # Alpha creates an invite
    email_a = f"alpha_member_{uuid.uuid4().hex[:6]}@alpha.com"
    res_a = client.post("/api/v1/tenants/invitations", json={"email": email_a, "role": "ACCOUNTANT"}, headers=comp_a["headers"])
    assert res_a.status_code == 201
    inv_id_a = res_a.json()["id"]

    # Beta lists invitations -> must NOT see Alpha's invite
    list_b = client.get("/api/v1/tenants/invitations", headers=comp_b["headers"])
    assert list_b.status_code == 200
    ids_in_b = [i["id"] for i in list_b.json()]
    assert inv_id_a not in ids_in_b

    # Beta attempts to revoke Alpha's invite -> 404
    revoke_attack = client.post(f"/api/v1/tenants/invitations/{inv_id_a}/revoke", headers=comp_b["headers"])
    assert revoke_attack.status_code == 404

    # Beta attempts to resend Alpha's invite -> 404
    resend_attack = client.post(f"/api/v1/tenants/invitations/{inv_id_a}/resend", headers=comp_b["headers"])
    assert resend_attack.status_code == 404

def test_duplicate_member_invitation_blocked():
    """Verify Scenario A: Inviting an already active member to the same organization is blocked with exact user-facing message."""
    comp = register_test_company("DupeMemberCo")
    admin_email = comp["admin_email"]

    # Attempt to invite the admin (who is already an active member of this organization)
    res = client.post("/api/v1/tenants/invitations", json={"email": admin_email, "role": "MANAGER"}, headers=comp["headers"])
    assert res.status_code == 400
    assert res.json()["detail"] == "This user is already an active member of this organization."

def test_case_insensitive_duplicate_member_blocked():
    """Verify that case-insensitive email matching blocks active members from being re-invited."""
    comp = register_test_company("CaseCo")
    admin_email_upper = comp["admin_email"].upper()

    res = client.post("/api/v1/tenants/invitations", json={"email": admin_email_upper, "role": "ACCOUNTANT"}, headers=comp["headers"])
    assert res.status_code == 400
    assert res.json()["detail"] == "This user is already an active member of this organization."

def test_user_in_other_organization_can_be_invited():
    """Verify that a user who is an active member of Org A can still be invited to Org B."""
    comp_a = register_test_company("OrgA")
    comp_b = register_test_company("OrgB")
    member_a_email = comp_a["admin_email"]

    # Org B invites user from Org A
    res = client.post("/api/v1/tenants/invitations", json={"email": member_a_email, "role": "REVIEWER"}, headers=comp_b["headers"])
    assert res.status_code == 201
    assert res.json()["email"] == member_a_email
    assert res.json()["role"] == "REVIEWER"
