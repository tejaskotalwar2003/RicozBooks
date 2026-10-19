import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, Role, UserSession
from app.models.department import Department
from app.models.company import Company, Entity, OrganizationInvitation, InvitationStatus
from app.models.audit import AuditLog
from app.migrate_entities import seed_default_departments, seed_default_roles

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_phase3_test_data():
    Base.metadata.create_all(bind=engine)
    seed_default_departments()
    seed_default_roles()

    db = SessionLocal()
    try:
        # 1. Ensure Roles
        roles_to_ensure = ["SUPER_ADMIN", "ADMIN", "DEPARTMENT_HEAD", "TEAM_MEMBER", "ACCOUNTANT", "REVIEWER", "MANAGER", "ORG_ADMIN"]
        for r_name in roles_to_ensure:
            if not db.query(Role).filter(Role.name == r_name).first():
                db.add(Role(name=r_name, description=f"{r_name} Role"))
        db.commit()

        # 2. Company & Entity for test environment
        test_company = db.query(Company).filter(Company.code == "PHASE3_CORP").first()
        if not test_company:
            test_company = Company(name="Phase 3 Corp", code="PHASE3_CORP", base_currency="INR")
            db.add(test_company)
            db.commit()
            db.refresh(test_company)

            test_entity = Entity(company_id=test_company.id, name="Phase 3 Main Entity", code="P3_ENT", base_currency="INR")
            db.add(test_entity)
            db.commit()

        # 3. Super Admin
        super_admin = db.query(User).filter(User.email == "p3_super_admin@example.com").first()
        if not super_admin:
            super_admin = User(
                email="p3_super_admin@example.com",
                hashed_password=get_password_hash("SuperAdminSecret123!"),
                first_name="P3Super",
                last_name="Admin",
                job_title="Platform Super Admin",
                is_active=True,
                is_superuser=True,
                default_company_id=test_company.id
            )
            admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
            super_admin.roles.append(admin_role)
            db.add(super_admin)

        # 4. Standard Non-Superadmin Staff
        regular_user = db.query(User).filter(User.email == "p3_regular_staff@example.com").first()
        if not regular_user:
            regular_user = User(
                email="p3_regular_staff@example.com",
                hashed_password=get_password_hash("StaffPassword123!"),
                first_name="Regular",
                last_name="Staff",
                job_title="Staff Member",
                is_active=True,
                is_superuser=False,
                default_company_id=test_company.id
            )
            acct_role = db.query(Role).filter(Role.name == "ACCOUNTANT").first()
            regular_user.roles.append(acct_role)
            db.add(regular_user)

        # 5. Department Head for Finance
        fin_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
        fin_head = db.query(User).filter(User.email == "p3_finance_head@example.com").first()
        if not fin_head:
            fin_head = User(
                email="p3_finance_head@example.com",
                hashed_password=get_password_hash("FinanceHead123!"),
                first_name="Finance",
                last_name="Leader",
                job_title="Finance Head",
                is_active=True,
                is_superuser=False,
                department_id=fin_dept.id if fin_dept else None,
                default_company_id=test_company.id
            )
            head_role = db.query(Role).filter(Role.name == "DEPARTMENT_HEAD").first()
            fin_head.roles.append(head_role)
            db.add(fin_head)
            db.flush()
        else:
            fin_head.department_id = fin_dept.id if fin_dept else None
            fin_head.is_active = True

        if fin_dept:
            fin_dept.head_user_id = fin_head.id

        db.commit()
    finally:
        db.close()


def get_token(email: str, password: str = "SuperAdminSecret123!") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Failed login for {email}: {res.text}"
    return res.json()["access_token"]


# ============================================================================
# Section 1: User Directory & Access Management Tests
# ============================================================================

def test_list_users_authorization():
    # Regular user should be rejected with 403 Forbidden
    reg_token = get_token("p3_regular_staff@example.com", "StaffPassword123!")
    res = client.get("/api/v1/developer/users", headers={"Authorization": f"Bearer {reg_token}"})
    assert res.status_code == 403
    assert "Platform Developer / Super Admin privileges required" in res.json()["detail"]

    # Super Admin can view all users
    admin_token = get_token("p3_super_admin@example.com")
    res = client.get("/api/v1/developer/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 3

    # Search for specific user
    res_search = client.get("/api/v1/developer/users?search=p3_super_admin", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_search.status_code == 200
    assert any(u["email"] == "p3_super_admin@example.com" for u in res_search.json()["items"])


def test_user_filtering_and_search():
    admin_token = get_token("p3_super_admin@example.com")

    # Search by email
    res = client.get("/api/v1/developer/users?search=p3_finance_head", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["email"] == "p3_finance_head@example.com"

    # Filter by department
    db = SessionLocal()
    fin_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
    db.close()

    res = client.get(f"/api/v1/developer/users?department_id={fin_dept.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    for u in res.json()["items"]:
        assert u["department_id"] == fin_dept.id

    # Filter by status
    res = client.get("/api/v1/developer/users?status=active", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    for u in res.json()["items"]:
        assert u["is_active"] is True


def test_get_user_details():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    fin_head = db.query(User).filter(User.email == "p3_finance_head@example.com").first()
    db.close()

    res = client.get(f"/api/v1/developer/users/{fin_head.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "p3_finance_head@example.com"
    assert data["is_department_head"] is True
    assert data["department_code"] == "FINANCE_ACCOUNTING"
    assert "hashed_password" not in data  # Never expose secrets


def test_update_user_department_assignment():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    user = db.query(User).filter(User.email == "p3_regular_staff@example.com").first()
    ops_dept = db.query(Department).filter(Department.code == "OPERATIONS").first()
    db.close()

    res = client.put(
        f"/api/v1/developer/users/{user.id}/department",
        json={"department_id": ops_dept.id},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["department_id"] == ops_dept.id
    assert data["department_code"] == "OPERATIONS"


def test_update_user_role():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    user = db.query(User).filter(User.email == "p3_regular_staff@example.com").first()
    db.close()

    # Assign valid role
    res = client.put(
        f"/api/v1/developer/users/{user.id}/role",
        json={"role": "MANAGER"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert "MANAGER" in res.json()["roles"]

    # Reject invalid role
    res = client.put(
        f"/api/v1/developer/users/{user.id}/role",
        json={"role": "INVALID_ROLE_XYZ"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 400
    assert "Invalid role" in res.json()["detail"]


def test_suspend_and_reactivate_user():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    # Create a dummy user to suspend
    dummy = db.query(User).filter(User.email == "p3_to_suspend@example.com").first()
    if not dummy:
        dummy = User(
            email="p3_to_suspend@example.com",
            hashed_password=get_password_hash("DummyPass123!"),
            first_name="Suspend",
            last_name="Target",
            is_active=True
        )
        db.add(dummy)
        db.commit()
        db.refresh(dummy)
    dummy_id = dummy.id
    db.close()

    # 1. Suspend
    res = client.post(f"/api/v1/developer/users/{dummy_id}/suspend", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # 2. Verify suspended user cannot log in
    login_res = client.post("/api/v1/auth/login", json={"email": "p3_to_suspend@example.com", "password": "DummyPass123!"})
    assert login_res.status_code == 403
    assert "inactive" in login_res.json()["detail"].lower()

    # 3. Reactivate
    react_res = client.post(f"/api/v1/developer/users/{dummy_id}/reactivate", headers={"Authorization": f"Bearer {admin_token}"})
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    # 4. Verify user can now log in again
    login_res2 = client.post("/api/v1/auth/login", json={"email": "p3_to_suspend@example.com", "password": "DummyPass123!"})
    assert login_res2.status_code == 200


def test_cannot_suspend_self_or_last_superadmin():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == "p3_super_admin@example.com").first()
    db.close()

    # Cannot suspend self
    res = client.post(f"/api/v1/developer/users/{admin_user.id}/suspend", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400
    assert "cannot suspend your own" in res.json()["detail"].lower()


# ============================================================================
# Section 2: Departmental & Platform Invitation Tests
# ============================================================================

def test_super_admin_invite_department_head():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    tech_dept = db.query(Department).filter(Department.code == "TECHNICAL_ENGINEERING").first()
    db.close()

    invite_payload = {
        "email": "new_tech_head@example.com",
        "department_id": tech_dept.id,
        "role": "DEPARTMENT_HEAD",
        "is_department_head": True
    }

    res = client.post("/api/v1/developer/invitations", json=invite_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new_tech_head@example.com"
    assert data["department_id"] == tech_dept.id
    assert data["is_department_head"] is True
    assert data["status"] == "PENDING"
    assert data["invite_url"] is not None


def test_department_head_can_invite_team_member_to_own_department():
    fin_token = get_token("p3_finance_head@example.com", "FinanceHead123!")
    db = SessionLocal()
    fin_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
    db.close()

    invite_payload = {
        "email": "new_fin_accountant@example.com",
        "department_id": fin_dept.id,
        "role": "ACCOUNTANT",
        "is_department_head": False
    }

    res = client.post("/api/v1/developer/invitations", json=invite_payload, headers={"Authorization": f"Bearer {fin_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new_fin_accountant@example.com"
    assert data["department_id"] == fin_dept.id
    assert data["role"] == "ACCOUNTANT"
    assert data["is_department_head"] is False


def test_department_head_cannot_invite_into_other_department():
    fin_token = get_token("p3_finance_head@example.com", "FinanceHead123!")
    db = SessionLocal()
    ops_dept = db.query(Department).filter(Department.code == "OPERATIONS").first()
    db.close()

    invite_payload = {
        "email": "unauthorized_invitee@example.com",
        "department_id": ops_dept.id,
        "role": "TEAM_MEMBER",
        "is_department_head": False
    }

    res = client.post("/api/v1/developer/invitations", json=invite_payload, headers={"Authorization": f"Bearer {fin_token}"})
    assert res.status_code == 403
    assert "not authorized to invite members to 'Operations'" in res.json()["detail"]


def test_department_head_cannot_appoint_other_head_or_grant_admin():
    fin_token = get_token("p3_finance_head@example.com", "FinanceHead123!")
    db = SessionLocal()
    fin_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
    db.close()

    # Attempt to appoint department head
    res1 = client.post("/api/v1/developer/invitations", json={
        "email": "hijack_head@example.com",
        "department_id": fin_dept.id,
        "role": "DEPARTMENT_HEAD",
        "is_department_head": True
    }, headers={"Authorization": f"Bearer {fin_token}"})
    assert res1.status_code == 403
    assert "cannot appoint other Department Heads" in res1.json()["detail"]

    # Attempt to grant SUPER_ADMIN
    res2 = client.post("/api/v1/developer/invitations", json={
        "email": "hijack_admin@example.com",
        "department_id": fin_dept.id,
        "role": "SUPER_ADMIN",
        "is_department_head": False
    }, headers={"Authorization": f"Bearer {fin_token}"})
    assert res2.status_code == 403
    assert "can only assign team roles" in res2.json()["detail"]


def test_duplicate_pending_invitation_refreshes_cleanly():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    dept = db.query(Department).filter(Department.code == "SALES_DEMO").first()
    db.close()

    payload = {
        "email": "duplicate_check@example.com",
        "department_id": dept.id,
        "role": "TEAM_MEMBER",
        "is_department_head": False
    }

    # 1st creation
    res1 = client.post("/api/v1/developer/invitations", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res1.status_code == 201
    inv_id_1 = res1.json()["id"]

    # 2nd creation with updated role
    payload["role"] = "MANAGER"
    res2 = client.post("/api/v1/developer/invitations", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 201
    assert res2.json()["id"] == inv_id_1
    assert res2.json()["role"] == "MANAGER"


def test_list_invitations_scoped_by_role():
    admin_token = get_token("p3_super_admin@example.com")
    fin_token = get_token("p3_finance_head@example.com", "FinanceHead123!")

    # Super admin sees all invitations
    res_admin = client.get("/api/v1/developer/invitations", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    all_invs = res_admin.json()["items"]
    assert len(all_invs) >= 2

    # Finance head sees only Finance invitations
    res_fin = client.get("/api/v1/developer/invitations", headers={"Authorization": f"Bearer {fin_token}"})
    assert res_fin.status_code == 200
    fin_invs = res_fin.json()["items"]
    for inv in fin_invs:
        assert inv["department_code"] == "FINANCE_ACCOUNTING"


def test_resend_and_revoke_invitation():
    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    dept = db.query(Department).filter(Department.code == "CUSTOMER_SUPPORT").first()
    db.close()

    res = client.post("/api/v1/developer/invitations", json={
        "email": "support_agent@example.com",
        "department_id": dept.id,
        "role": "TEAM_MEMBER",
        "is_department_head": False
    }, headers={"Authorization": f"Bearer {admin_token}"})
    inv_id = res.json()["id"]

    # Resend
    resend_res = client.post(f"/api/v1/developer/invitations/{inv_id}/resend", headers={"Authorization": f"Bearer {admin_token}"})
    assert resend_res.status_code == 200
    assert resend_res.json()["status"] == "PENDING"

    # Revoke
    revoke_res = client.post(f"/api/v1/developer/invitations/{inv_id}/revoke", headers={"Authorization": f"Bearer {admin_token}"})
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "REVOKED"


def test_accept_departmental_invitation_flow():
    import uuid
    flow_email = f"p3_flow_{uuid.uuid4().hex[:6]}@example.com"

    admin_token = get_token("p3_super_admin@example.com")
    db = SessionLocal()
    dept = db.query(Department).filter(Department.code == "CUSTOMER_SUPPORT").first()
    db.close()

    # Super Admin invites a new support head
    invite_res = client.post("/api/v1/developer/invitations", json={
        "email": flow_email,
        "department_id": dept.id,
        "role": "DEPARTMENT_HEAD",
        "is_department_head": True
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert invite_res.status_code == 201

    db = SessionLocal()
    inv_record = db.query(OrganizationInvitation).filter(OrganizationInvitation.email == flow_email).first()
    token_str = inv_record.token
    db.close()

    # 1. Public Validate Token
    val_res = client.get(f"/api/v1/tenants/invitations/validate/{token_str}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert "Customer Support" in val_data["company_name"]

    # 2. Public Accept Token
    accept_res = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token_str,
        "password": "SupportPassword123!",
        "first_name": "Support",
        "last_name": "Champion"
    })
    assert accept_res.status_code == 200
    token_data = accept_res.json()
    assert "access_token" in token_data

    # 3. Verify user created, department assigned, and head updated in DB
    db = SessionLocal()
    new_user = db.query(User).filter(User.email == flow_email).first()
    assert new_user is not None
    assert new_user.department_id == dept.id
    assert any(r.name == "DEPARTMENT_HEAD" for r in new_user.roles)

    dept_after = db.query(Department).filter(Department.id == dept.id).first()
    assert dept_after.head_user_id == new_user.id

    inv_after = db.query(OrganizationInvitation).filter(OrganizationInvitation.id == inv_record.id).first()
    assert inv_after.status == InvitationStatus.ACCEPTED
    db.close()

    # 4. Attempting to accept again fails (single-use enforced)
    accept_again = client.post("/api/v1/tenants/invitations/accept", json={
        "token": token_str,
        "password": "SupportPassword123!",
        "first_name": "Support",
        "last_name": "Champion"
    })
    assert accept_again.status_code == 400
    assert "already been accepted" in accept_again.json()["detail"].lower()
