import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, Role, Permission, user_roles
from app.models.department import Department
from app.models.company import Company, Entity
from app.models.audit import AuditLog
from app.api.deps import require_permission

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_rbac_test_environment():
    """Seed test fixtures including Super Admin, Department Head, and Standard User."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.migrate_entities import seed_default_roles, seed_granular_permissions_and_matrix, seed_default_departments
        seed_default_departments()
        seed_default_roles()
        seed_granular_permissions_and_matrix()

        # 1. Platform Super Admin
        super_admin = db.query(User).filter(User.email == "phase4_superadmin@example.com").first()
        if not super_admin:
            super_admin = User(
                email="phase4_superadmin@example.com",
                hashed_password=get_password_hash("SuperAdminSecure123!"),
                first_name="Platform",
                last_name="SuperAdmin",
                job_title="Chief Architect",
                is_active=True,
                is_superuser=True
            )
            super_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
            if super_role:
                super_admin.roles.append(super_role)
            db.add(super_admin)

        # 2. Department Head (Finance & Accounting)
        finance_dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
        dept_head = db.query(User).filter(User.email == "phase4_financehead@example.com").first()
        if not dept_head:
            dept_head = User(
                email="phase4_financehead@example.com",
                hashed_password=get_password_hash("FinanceHeadSecure123!"),
                first_name="Eleanor",
                last_name="Vance",
                job_title="Head of Finance",
                is_active=True,
                is_superuser=False,
                department_id=finance_dept.id if finance_dept else None
            )
            head_role = db.query(Role).filter(Role.name == "DEPARTMENT_HEAD").first()
            if head_role:
                dept_head.roles.append(head_role)
            db.add(dept_head)

        # 3. Regular Tenant Member (No Developer Console access)
        standard_user = db.query(User).filter(User.email == "phase4_tenantuser@example.com").first()
        if not standard_user:
            standard_user = User(
                email="phase4_tenantuser@example.com",
                hashed_password=get_password_hash("TenantUserSecure123!"),
                first_name="Jane",
                last_name="Tenant",
                job_title="Bookkeeper",
                is_active=True,
                is_superuser=False
            )
            accountant_role = db.query(Role).filter(Role.name == "ACCOUNTANT").first()
            if accountant_role:
                standard_user.roles.append(accountant_role)
            db.add(standard_user)

        # 4. Configurable Custom Role for permission update tests
        test_role = db.query(Role).filter(Role.name == "TEST_CUSTOM_ROLE").first()
        if not test_role:
            test_role = Role(
                name="TEST_CUSTOM_ROLE",
                description="Custom configurable role for automated testing"
            )
            db.add(test_role)

        db.commit()
    finally:
        db.close()


def get_auth_token(email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def get_dev_auth_token(email: str, password: str) -> str:
    res = client.post("/api/v1/auth/developer/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Developer login failed for {email}: {res.text}"
    return res.json()["access_token"]


# ============================================================================
# 1. Role and Permission Directory & Matrix Tests
# ============================================================================

def test_unauthenticated_cannot_access_roles():
    res = client.get("/api/v1/developer/roles")
    assert res.status_code == 401


def test_standard_user_forbidden_from_roles_api():
    token = get_auth_token("phase4_tenantuser@example.com", "TenantUserSecure123!")
    res = client.get("/api/v1/developer/roles", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_super_admin_can_list_all_roles():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    res = client.get("/api/v1/developer/roles", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 9
    
    role_names = [r["name"] for r in roles]
    assert "SUPER_ADMIN" in role_names
    assert "DEVELOPER" in role_names
    assert "DEPARTMENT_HEAD" in role_names
    assert "TEAM_MEMBER" in role_names
    assert "ORG_ADMIN" in role_names
    assert "ACCOUNTANT" in role_names

    super_admin_role = next(r for r in roles if r["name"] == "SUPER_ADMIN")
    assert super_admin_role["is_protected"] is True
    assert len(super_admin_role["permissions"]) >= 40


def test_super_admin_can_list_all_permissions():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    res = client.get("/api/v1/developer/permissions", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    perms = res.json()
    assert len(perms) >= 40
    
    perm_codes = [p["code"] for p in perms]
    assert "developer:administer" in perm_codes
    assert "roles:manage" in perm_codes
    assert "audit:read" in perm_codes
    assert "journals:create" in perm_codes
    assert "finance:approve" in perm_codes
    assert "operations:manage" in perm_codes
    assert "technical:manage" in perm_codes


def test_get_role_permission_matrix():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    res = client.get("/api/v1/developer/roles/matrix", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "roles" in data
    assert "permissions" in data
    assert "modules" in data
    assert "matrix" in data

    assert len(data["roles"]) >= 9
    assert len(data["permissions"]) >= 40
    assert "developer" in data["modules"]
    assert "finance" in data["modules"]
    assert "operations" in data["modules"]


# ============================================================================
# 2. Role Permission Update & Security Protection Tests
# ============================================================================

def test_super_admin_cannot_revoke_mandatory_security_permissions():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    
    # Get SUPER_ADMIN role ID
    roles_res = client.get("/api/v1/developer/roles", headers={"Authorization": f"Bearer {token}"})
    super_role = next(r for r in roles_res.json() if r["name"] == "SUPER_ADMIN")
    
    # Attempt to empty or strip mandatory permissions (developer:administer, roles:manage, etc.)
    res = client.put(
        f"/api/v1/developer/roles/{super_role['id']}/permissions",
        json={"permission_ids": []},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "mandatory" in res.json()["detail"].lower()


def test_update_permissions_with_invalid_id_rejected():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    roles_res = client.get("/api/v1/developer/roles", headers={"Authorization": f"Bearer {token}"})
    test_role = next(r for r in roles_res.json() if r["name"] == "TEST_CUSTOM_ROLE")

    res = client.put(
        f"/api/v1/developer/roles/{test_role['id']}/permissions",
        json={"permission_ids": [999999]},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "invalid" in res.json()["detail"].lower()


def test_update_configurable_role_permissions_success_and_audited():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    
    # Fetch permissions to pick 2 valid IDs
    perms_res = client.get("/api/v1/developer/permissions", headers={"Authorization": f"Bearer {token}"})
    all_perms = perms_res.json()
    selected_perms = all_perms[:3]
    selected_ids = [p["id"] for p in selected_perms]

    roles_res = client.get("/api/v1/developer/roles", headers={"Authorization": f"Bearer {token}"})
    test_role = next(r for r in roles_res.json() if r["name"] == "TEST_CUSTOM_ROLE")

    res = client.put(
        f"/api/v1/developer/roles/{test_role['id']}/permissions",
        json={"permission_ids": selected_ids},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    updated_role = res.json()
    assigned_ids = [p["id"] for p in updated_role["permissions"]]
    assert set(assigned_ids) == set(selected_ids)

    # Verify consequential audit log was generated
    audit_res = client.get(
        "/api/v1/developer/audit-logs?action=ROLE_PERMISSIONS_UPDATED&limit=5",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert audit_res.status_code == 200
    audit_items = audit_res.json()["items"]
    assert len(audit_items) > 0
    latest_event = audit_items[0]
    assert latest_event["action"] == "ROLE_PERMISSIONS_UPDATED"
    assert latest_event["record_type"] == "Role"
    assert str(test_role["id"]) in latest_event["record_id"]


# ============================================================================
# 3. Central Audit Trail Endpoints & Filtering Tests
# ============================================================================

def test_unauthenticated_cannot_access_audit_logs():
    res = client.get("/api/v1/developer/audit-logs")
    assert res.status_code == 401


def test_standard_user_forbidden_from_audit_logs():
    token = get_auth_token("phase4_tenantuser@example.com", "TenantUserSecure123!")
    res = client.get("/api/v1/developer/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_super_admin_can_query_and_paginate_audit_logs():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    res = client.get(
        "/api/v1/developer/audit-logs?page=1&limit=10",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "pages" in data
    assert "available_actions" in data
    assert "available_record_types" in data
    assert data["page"] == 1
    assert data["limit"] == 10
    assert data["total"] > 0
    assert len(data["items"]) <= 10


def test_audit_log_filtering_by_action_and_search():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    
    # Filter by specific action
    res = client.get(
        "/api/v1/developer/audit-logs?action=DEVELOPER_LOGIN_SUCCESS&limit=5",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    items = res.json()["items"]
    for item in items:
        assert item["action"] == "DEVELOPER_LOGIN_SUCCESS"

    # Free text search
    search_res = client.get(
        "/api/v1/developer/audit-logs?search=phase4_superadmin&limit=5",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert search_res.status_code == 200
    search_items = search_res.json()["items"]
    assert len(search_items) > 0


def test_audit_log_detail_inspection():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    
    # Fetch any existing audit item ID
    list_res = client.get("/api/v1/developer/audit-logs?limit=1", headers={"Authorization": f"Bearer {token}"})
    first_item = list_res.json()["items"][0]
    
    detail_res = client.get(
        f"/api/v1/developer/audit-logs/{first_item['id']}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == first_item["id"]
    assert detail["action"] == first_item["action"]
    assert "timestamp" in detail


def test_audit_log_detail_not_found():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    res = client.get(
        "/api/v1/developer/audit-logs/9999999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404


# ============================================================================
# 4. Immutability Enforcement & Secret Sanitization Tests
# ============================================================================

def test_audit_logs_are_strictly_immutable_no_update_or_delete():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    list_res = client.get("/api/v1/developer/audit-logs?limit=1", headers={"Authorization": f"Bearer {token}"})
    target_id = list_res.json()["items"][0]["id"]

    # DELETE must be rejected with 405 Method Not Allowed
    del_res = client.delete(
        f"/api/v1/developer/audit-logs/{target_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_res.status_code == 405, "Audit logs must not have a DELETE route"

    # PUT must be rejected with 405 Method Not Allowed
    put_res = client.put(
        f"/api/v1/developer/audit-logs/{target_id}",
        json={"action": "TAMPERED_ACTION"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert put_res.status_code == 405, "Audit logs must not have a PUT route"


def test_audit_logs_sanitize_sensitive_credentials():
    token = get_dev_auth_token("phase4_superadmin@example.com", "SuperAdminSecure123!")
    db = SessionLocal()
    try:
        # Insert a raw test log with simulated sensitive json details
        sensitive_entry = AuditLog(
            action="CREDENTIAL_TEST_EVENT",
            record_type="SecurityTest",
            record_id="999",
            user_email="security@test.com",
            details='{"username": "admin", "password": "supersecretpassword123", "token": "raw_jwt_token_here"}'
        )
        db.add(sensitive_entry)
        db.commit()
        db.refresh(sensitive_entry)
        sensitive_id = sensitive_entry.id
    finally:
        db.close()

    res = client.get(
        f"/api/v1/developer/audit-logs/{sensitive_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    details = res.json()["details"]
    assert "supersecretpassword123" not in details
    assert "raw_jwt_token_here" not in details
    assert "[REDACTED]" in details


# ============================================================================
# 5. Permission-Level Dependency Enforcement (require_permission)
# ============================================================================

def test_require_permission_dependency_blocks_unauthorized_user():
    # Regular tenant user has ACCOUNTANT role, which does NOT have 'developer:administer'
    token = get_auth_token("phase4_tenantuser@example.com", "TenantUserSecure123!")
    
    # We can test an endpoint protected by require_developer_admin
    res = client.get("/api/v1/developer/verify", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403

    # Check that an unauthorized attempt was logged in AuditLog
    db = SessionLocal()
    try:
        logged = db.query(AuditLog).filter(
            AuditLog.action == "UNAUTHORIZED_DEVELOPER_ACCESS_ATTEMPT",
            AuditLog.user_email == "phase4_tenantuser@example.com"
        ).first()
        assert logged is not None
    finally:
        db.close()

