import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, Role, UserSession
from app.models.department import Department
from app.models.company import Company, Entity
from app.models.demo import DemoAdminUser
from app.models.audit import AuditLog

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_phase5_fixtures():
    """Ensure baseline test fixtures are seeded for Phase 5 verification."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.migrate_entities import seed_default_roles, seed_granular_permissions_and_matrix, seed_default_departments
        seed_default_departments()
        seed_default_roles()
        seed_granular_permissions_and_matrix()

        # 1. Platform Super Admin
        super_admin = db.query(User).filter(User.email == "sec_superadmin@ricozbooks.com").first()
        if not super_admin:
            super_admin = User(
                email="sec_superadmin@ricozbooks.com",
                hashed_password=get_password_hash("SuperAdminSecure123!"),
                first_name="Security",
                last_name="SuperAdmin",
                job_title="Platform SecOps",
                is_active=True,
                is_superuser=True
            )
            super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
            if super_role:
                super_admin.roles.append(super_role)
            db.add(super_admin)

        # 2. Operations Department Head
        ops_dept = db.query(Department).filter(Department.code == "OPERATIONS").first()
        ops_head = db.query(User).filter(User.email == "sec_opshead@ricozbooks.com").first()
        if not ops_head:
            ops_head = User(
                email="sec_opshead@ricozbooks.com",
                hashed_password=get_password_hash("OpsHeadSecure123!"),
                first_name="Oscar",
                last_name="Operations",
                job_title="Director of Operations",
                is_active=True,
                is_superuser=False,
                department_id=ops_dept.id if ops_dept else None
            )
            head_role = db.query(Role).filter(Role.name == "DEPARTMENT_HEAD").first()
            if head_role:
                ops_head.roles.append(head_role)
            db.add(ops_head)
            db.flush()
            if ops_dept:
                ops_dept.head_user_id = ops_head.id

        # 3. User to test suspension and immediate revocation
        suspendable_user = db.query(User).filter(User.email == "sec_suspendable@ricozbooks.com").first()
        if not suspendable_user:
            suspendable_user = User(
                email="sec_suspendable@ricozbooks.com",
                hashed_password=get_password_hash("Suspendable123!"),
                first_name="Sam",
                last_name="Suspendable",
                job_title="Junior Analyst",
                is_active=True,
                is_superuser=False,
                department_id=ops_dept.id if ops_dept else None
            )
            member_role = db.query(Role).filter(Role.name == "TEAM_MEMBER").first()
            if member_role:
                suspendable_user.roles.append(member_role)
            db.add(suspendable_user)

        # 4. Demo Portal Admin (Strictly isolated from Developer Console)
        demo_admin = db.query(DemoAdminUser).filter(DemoAdminUser.email == "sec_demouser@ricozbooks.com").first()
        if not demo_admin:
            demo_admin = DemoAdminUser(
                name="Demo Portal Coordinator",
                email="sec_demouser@ricozbooks.com",
                password_hash=get_password_hash("DemoPortalPass123!"),
                role="DEMO_ADMIN",
                is_active=True
            )
            db.add(demo_admin)

        db.commit()
    finally:
        db.close()


def get_token(email: str, password: str, is_dev: bool = False) -> str:
    endpoint = "/api/v1/auth/developer/login" if is_dev else "/api/v1/auth/login"
    res = client.post(endpoint, json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


# ============================================================================
# Security Check 1: Immediate Token Revocation on Suspension
# ============================================================================

def test_immediate_token_revocation_upon_suspension():
    """
    Verifies that a valid token issued before suspension is immediately rejected
    with 403 Forbidden once the user is suspended, without waiting for JWT expiration.
    """
    # 1. Obtain token while active
    user_token = get_token("sec_suspendable@ricozbooks.com", "Suspendable123!", is_dev=False)
    headers = {"Authorization": f"Bearer {user_token}"}

    # Verify user can access standard profile endpoint
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200

    # 2. Super Admin suspends the user
    admin_token = get_token("sec_superadmin@ricozbooks.com", "SuperAdminSecure123!", is_dev=True)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    db = SessionLocal()
    target_user = db.query(User).filter(User.email == "sec_suspendable@ricozbooks.com").first()
    target_id = target_user.id
    db.close()

    suspend_res = client.post(f"/api/v1/developer/users/{target_id}/suspend", headers=admin_headers)
    assert suspend_res.status_code == 200
    assert suspend_res.json()["is_active"] is False

    # 3. Request with existing JWT token MUST be rejected immediately (server-side status check)
    blocked_res = client.get("/api/v1/auth/me", headers=headers)
    assert blocked_res.status_code == 403
    assert "deactivated" in blocked_res.json()["detail"].lower()

    # 4. Reactivate user to clean up fixture state
    reactivate_res = client.post(f"/api/v1/developer/users/{target_id}/reactivate", headers=admin_headers)
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["is_active"] is True


# ============================================================================
# Security Check 2: Department Scope Enforcement & Boundary Isolation
# ============================================================================

def test_department_head_cannot_access_developer_console():
    """Department heads do NOT have platform-wide developer access."""
    login_res = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "sec_opshead@ricozbooks.com", "password": "OpsHeadSecure123!"}
    )
    assert login_res.status_code == 403
    assert "developer console is restricted" in login_res.json()["detail"].lower()


def test_department_head_cannot_grant_themselves_super_admin():
    """Department head cannot promote themselves or anyone to SUPER_ADMIN."""
    head_token = get_token("sec_opshead@ricozbooks.com", "OpsHeadSecure123!", is_dev=False)
    headers = {"Authorization": f"Bearer {head_token}"}

    db = SessionLocal()
    head_user = db.query(User).filter(User.email == "sec_opshead@ricozbooks.com").first()
    head_id = head_user.id
    db.close()

    # Attempt to call developer update role endpoint
    res = client.put(
        f"/api/v1/developer/users/{head_id}/role",
        json={"role": "SUPER_ADMIN"},
        headers=headers
    )
    assert res.status_code == 403


def test_department_head_cannot_invite_to_another_department():
    """Department head can only invite to their own assigned department."""
    head_token = get_token("sec_opshead@ricozbooks.com", "OpsHeadSecure123!", is_dev=False)
    headers = {"Authorization": f"Bearer {head_token}"}

    db = SessionLocal()
    # Find Finance department (different from Operations)
    fin_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
    fin_id = fin_dept.id
    db.close()

    # Attempt to invite a member into Finance
    res = client.post(
        "/api/v1/developer/invitations",
        json={
            "email": "unauthorized_cross_dept@example.com",
            "department_id": fin_id,
            "role": "TEAM_MEMBER",
            "is_department_head": False
        },
        headers=headers
    )
    assert res.status_code == 403
    assert "not authorized to invite" in res.json()["detail"].lower()


# ============================================================================
# Security Check 3: Demo Management Portal Strict Independence
# ============================================================================

def test_demo_portal_credentials_cannot_access_developer_console():
    """DemoAdminUser credentials cannot authenticate to Developer Console."""
    res = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "sec_demouser@ricozbooks.com", "password": "DemoPortalPass123!"}
    )
    # The user does not exist in standard 'users' table, so login must fail
    assert res.status_code in [401, 403]


def test_demo_portal_token_cannot_access_developer_endpoints():
    """Token from Demo Management Portal cannot access /api/v1/developer endpoints."""
    # Authenticate to Demo portal
    demo_login = client.post(
        "/api/v1/internal/auth/login",
        json={"email": "sec_demouser@ricozbooks.com", "password": "DemoPortalPass123!"}
    )
    assert demo_login.status_code == 200
    demo_token = demo_login.json()["access_token"]

    # Try to access developer verify endpoint
    dev_res = client.get(
        "/api/v1/developer/verify",
        headers={"Authorization": f"Bearer {demo_token}"}
    )
    assert dev_res.status_code in [401, 403]


# ============================================================================
# Security Check 4: Audit Immutability & Consequential Tracking
# ============================================================================

def test_audit_logs_cannot_be_deleted_or_overwritten():
    """Verify that audit records cannot be mutated or deleted through application APIs."""
    admin_token = get_token("sec_superadmin@ricozbooks.com", "SuperAdminSecure123!", is_dev=True)
    headers = {"Authorization": f"Bearer {admin_token}"}

    del_res = client.delete("/api/v1/developer/audit-logs/1", headers=headers)
    assert del_res.status_code == 405

    put_res = client.put("/api/v1/developer/audit-logs/1", json={"details": "tampered"}, headers=headers)
    assert put_res.status_code == 405

    patch_res = client.patch("/api/v1/developer/audit-logs/1", json={"details": "tampered"}, headers=headers)
    assert patch_res.status_code == 405


# ============================================================================
# Security Check 5: Hardcoded Superuser Auto-Promotion Removed
# ============================================================================

def test_no_hardcoded_superuser_auto_promotion_in_migrations():
    """
    Verify that migrate_entities.py does not contain hardcoded UPDATE statements
    granting is_superuser=TRUE based on fixed email strings.
    """
    import inspect
    from app import migrate_entities
    src = inspect.getsource(migrate_entities)
    assert "UPDATE users SET is_superuser = TRUE WHERE email" not in src, (
        "Found hardcoded is_superuser auto-promotion in migrate_entities.py! This is a security vulnerability."
    )
