import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.models.department import Department
from app.models.audit import AuditLog
from app.migrate_entities import seed_default_departments

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_module_data():
    Base.metadata.create_all(bind=engine)
    seed_default_departments()

    db = SessionLocal()
    try:
        # Create Roles
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(name="ADMIN", description="Administrator")
            db.add(admin_role)

        accountant_role = db.query(Role).filter(Role.name == "ACCOUNTANT").first()
        if not accountant_role:
            accountant_role = Role(name="ACCOUNTANT", description="Accountant")
            db.add(accountant_role)
        db.commit()

        # Super Admin
        super_admin = db.query(User).filter(User.email == "dept_test_admin@example.com").first()
        if not super_admin:
            super_admin = User(
                email="dept_test_admin@example.com",
                hashed_password=get_password_hash("SuperAdminSecret123!"),
                first_name="Platform",
                last_name="SuperAdmin",
                job_title="Super Admin",
                is_active=True,
                is_superuser=True
            )
            super_admin.roles.append(admin_role)
            db.add(super_admin)

        # Standard Non-Superadmin User
        standard_user = db.query(User).filter(User.email == "dept_test_regular@example.com").first()
        if not standard_user:
            standard_user = User(
                email="dept_test_regular@example.com",
                hashed_password=get_password_hash("RegularUserSecret123!"),
                first_name="Regular",
                last_name="Staff",
                job_title="Accountant",
                is_active=True,
                is_superuser=False
            )
            standard_user.roles.append(accountant_role)
            db.add(standard_user)
        else:
            standard_user.is_superuser = False

        # Inactive User
        inactive_user = db.query(User).filter(User.email == "dept_test_inactive@example.com").first()
        if not inactive_user:
            inactive_user = User(
                email="dept_test_inactive@example.com",
                hashed_password=get_password_hash("InactiveUserSecret123!"),
                first_name="Inactive",
                last_name="Person",
                is_active=False,
                is_superuser=False
            )
            db.add(inactive_user)

        # Candidate for Department Head
        candidate_user = db.query(User).filter(User.email == "dept_test_candidate@example.com").first()
        if not candidate_user:
            candidate_user = User(
                email="dept_test_candidate@example.com",
                hashed_password=get_password_hash("CandidatePass123!"),
                first_name="Ananya",
                last_name="Deshmukh",
                job_title="Senior Finance Lead",
                is_active=True,
                is_superuser=False
            )
            db.add(candidate_user)

        db.commit()
    finally:
        db.close()


def get_admin_token() -> str:
    res = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dept_test_admin@example.com", "password": "SuperAdminSecret123!"}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def get_regular_token() -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "dept_test_regular@example.com", "password": "RegularUserSecret123!"}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_five_default_departments_exist():
    """Verify all 5 required departments are initialized with stable codes."""
    db = SessionLocal()
    try:
        expected_codes = {
            "FINANCE_ACCOUNTING",
            "OPERATIONS",
            "TECHNICAL_ENGINEERING",
            "SALES_DEMO",
            "CUSTOMER_SUPPORT"
        }
        depts = db.query(Department).all()
        found_codes = {d.code for d in depts}
        assert expected_codes.issubset(found_codes)
    finally:
        db.close()


def test_idempotent_department_seeding():
    """Running seed_default_departments multiple times should not create duplicate departments."""
    db = SessionLocal()
    try:
        count_before = db.query(Department).count()
        seed_default_departments()
        count_after = db.query(Department).count()
        assert count_before == count_after
    finally:
        db.close()


def test_list_departments_authenticated():
    """Super Admin can list departments and get calculated member counts."""
    token = get_admin_token()
    res = client.get(
        "/api/v1/developer/departments",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    first = data[0]
    assert "code" in first
    assert "name" in first
    assert "member_count" in first
    assert "active_member_count" in first
    assert "is_active" in first


def test_list_departments_forbidden_for_regular_user():
    """Regular tenant user receives 403 Forbidden when trying to list departments."""
    token = get_regular_token()
    res = client.get(
        "/api/v1/developer/departments",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403
    assert "Platform Developer / Super Admin privileges required" in res.json()["detail"]


def test_get_single_department_details():
    """Super admin can view single department details."""
    token = get_admin_token()
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
        dept_id = dept.id
    finally:
        db.close()

    res = client.get(
        f"/api/v1/developer/departments/{dept_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["code"] == "FINANCE_ACCOUNTING"
    assert data["name"] == "Finance & Accounting"


def test_duplicate_department_code_rejected():
    """Attempting to create a department with an already existing code returns 400."""
    token = get_admin_token()
    res = client.post(
        "/api/v1/developer/departments",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "FINANCE_ACCOUNTING",
            "name": "Duplicate Department"
        }
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_assign_and_replace_department_head():
    """Assigning, replacing, and unassigning a department head works safely and logs audit."""
    token = get_admin_token()
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "FINANCE_ACCOUNTING").first()
        dept_id = dept.id
        candidate = db.query(User).filter(User.email == "dept_test_candidate@example.com").first()
        candidate_id = candidate.id
    finally:
        db.close()

    # 1. Assign head
    assign_res = client.put(
        f"/api/v1/developer/departments/{dept_id}/head",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_id": candidate_id}
    )
    assert assign_res.status_code == 200
    data = assign_res.json()
    assert data["head_user_id"] == candidate_id
    assert data["head"]["email"] == "dept_test_candidate@example.com"

    # Verify user's department_id updated
    db = SessionLocal()
    try:
        cand_updated = db.query(User).filter(User.id == candidate_id).first()
        assert cand_updated.department_id == dept_id

        # Verify audit log
        audit = db.query(AuditLog).filter(
            AuditLog.action == "DEPARTMENT_HEAD_ASSIGNED",
            AuditLog.record_id == str(dept_id)
        ).first()
        assert audit is not None
    finally:
        db.close()

    # 2. Unassign head
    unassign_res = client.put(
        f"/api/v1/developer/departments/{dept_id}/head",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_id": None}
    )
    assert unassign_res.status_code == 200
    assert unassign_res.json()["head_user_id"] is None
    assert unassign_res.json()["head"] is None


def test_assign_inactive_head_rejected():
    """Assigning an inactive user as Department Head is rejected with 400."""
    token = get_admin_token()
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "OPERATIONS").first()
        dept_id = dept.id
        inactive = db.query(User).filter(User.email == "dept_test_inactive@example.com").first()
        inactive_id = inactive.id
    finally:
        db.close()

    res = client.put(
        f"/api/v1/developer/departments/{dept_id}/head",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_id": inactive_id}
    )
    assert res.status_code == 400
    assert "inactive" in res.json()["detail"].lower()


def test_toggle_department_status():
    """Toggling department status deactivates and reactivates it cleanly."""
    token = get_admin_token()
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "CUSTOMER_SUPPORT").first()
        dept_id = dept.id
        initial_status = dept.is_active
    finally:
        db.close()

    # Toggle 1
    res1 = client.post(
        f"/api/v1/developer/departments/{dept_id}/toggle-status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    assert res1.json()["is_active"] != initial_status

    # Toggle 2 (revert)
    res2 = client.post(
        f"/api/v1/developer/departments/{dept_id}/toggle-status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200
    assert res2.json()["is_active"] == initial_status


def test_department_member_listing_and_counts():
    """Department members endpoint lists assigned users and accurately marks is_head."""
    token = get_admin_token()
    db = SessionLocal()
    try:
        dept = db.query(Department).filter(Department.code == "TECHNICAL_ENGINEERING").first()
        dept_id = dept.id
        user = db.query(User).filter(User.email == "dept_test_candidate@example.com").first()
        user.department_id = dept_id
        dept.head_user_id = user.id
        db.commit()
    finally:
        db.close()

    res = client.get(
        f"/api/v1/developer/departments/{dept_id}/members",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    members = res.json()
    assert len(members) >= 1
    member = next((m for m in members if m["email"] == "dept_test_candidate@example.com"), None)
    assert member is not None
    assert member["is_head"] is True


def test_dashboard_stats_endpoint():
    """Dashboard stats endpoint returns live database-backed metrics."""
    token = get_admin_token()
    res = client.get(
        "/api/v1/developer/dashboard/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_users"] > 0
    assert stats["active_users"] > 0
    assert stats["total_departments"] >= 5
    assert stats["active_departments"] >= 1
    assert "platform_health" in stats
    assert stats["platform_health"]["database_status"] == "healthy"


def test_candidate_users_endpoint():
    """Candidate users endpoint lists active users for assignment."""
    token = get_admin_token()
    res = client.get(
        "/api/v1/developer/users/candidates",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) > 0
    assert all(c["is_active"] for c in candidates)

