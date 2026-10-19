import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.models.audit import AuditLog
from app.scripts.provision_super_admin import provision_super_admin

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create Admin Role
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(name="ADMIN", description="Administrator")
            db.add(admin_role)

        accountant_role = db.query(Role).filter(Role.name == "ACCOUNTANT").first()
        if not accountant_role:
            accountant_role = Role(name="ACCOUNTANT", description="Accountant")
            db.add(accountant_role)
        db.commit()

        # Super Admin User
        super_admin = db.query(User).filter(User.email == "dev_superadmin@example.com").first()
        if not super_admin:
            super_admin = User(
                email="dev_superadmin@example.com",
                hashed_password=get_password_hash("SuperAdminPass123!"),
                first_name="Super",
                last_name="Admin",
                job_title="Developer / Platform Super Admin",
                is_active=True,
                is_superuser=True
            )
            super_admin.roles.append(admin_role)
            db.add(super_admin)

        # Standard Tenant User (Non-Super Admin)
        standard_user = db.query(User).filter(User.email == "dev_standard@example.com").first()
        if not standard_user:
            standard_user = User(
                email="dev_standard@example.com",
                hashed_password=get_password_hash("StandardUserPass123!"),
                first_name="Regular",
                last_name="Staff",
                job_title="Finance Associate",
                is_active=True,
                is_superuser=False
            )
            standard_user.roles.append(accountant_role)
            db.add(standard_user)
        else:
            standard_user.is_superuser = False

        # Inactive Super Admin
        inactive_admin = db.query(User).filter(User.email == "dev_inactive@example.com").first()
        if not inactive_admin:
            inactive_admin = User(
                email="dev_inactive@example.com",
                hashed_password=get_password_hash("InactivePass123!"),
                first_name="Inactive",
                last_name="Admin",
                job_title="Former Admin",
                is_active=False,
                is_superuser=True
            )
            db.add(inactive_admin)

        db.commit()
    finally:
        db.close()


def test_developer_login_success():
    """Super Admin should authenticate successfully through /api/v1/auth/developer/login."""
    response = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_superadmin@example.com", "password": "SuperAdminPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["is_superuser"] is True
    assert data["user"]["email"] == "dev_superadmin@example.com"


def test_developer_login_rejected_for_regular_user():
    """Non-superadmin user must receive 403 Forbidden and have the attempt logged."""
    response = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_standard@example.com", "password": "StandardUserPass123!"}
    )
    assert response.status_code == 403
    assert "Developer Console is restricted" in response.json()["detail"]

    # Verify audit log recorded
    db = SessionLocal()
    try:
        audit = db.query(AuditLog).filter(
            AuditLog.action == "UNAUTHORIZED_DEVELOPER_ACCESS_ATTEMPT",
            AuditLog.user_email == "dev_standard@example.com"
        ).first()
        assert audit is not None
        assert "attempted to log in to Developer Console without superuser privileges" in audit.details
    finally:
        db.close()


def test_developer_login_invalid_password():
    """Incorrect password returns 401 Unauthorized."""
    response = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_superadmin@example.com", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_developer_login_inactive_user():
    """Inactive super admin returns 403 Forbidden."""
    response = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_inactive@example.com", "password": "InactivePass123!"}
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


def test_developer_verify_unauthenticated():
    """Unauthenticated request to /developer/verify returns 401."""
    response = client.get("/api/v1/developer/verify")
    assert response.status_code == 401


def test_developer_verify_forbidden_for_standard_token():
    """Standard user's token calling /developer/verify returns 403."""
    # Obtain token for standard user via regular /login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "dev_standard@example.com", "password": "StandardUserPass123!"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/developer/verify",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Platform Developer / Super Admin privileges required" in response.json()["detail"]


def test_developer_verify_success_for_superadmin():
    """Super Admin calling /developer/verify succeeds with 200 OK."""
    login_res = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_superadmin@example.com", "password": "SuperAdminPass123!"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/developer/verify",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "authorized"
    assert data["verified"] is True
    assert data["user"]["is_superuser"] is True


def test_developer_platform_status():
    """Super Admin calling /developer/status gets operational health info."""
    login_res = client.post(
        "/api/v1/auth/developer/login",
        json={"email": "dev_superadmin@example.com", "password": "SuperAdminPass123!"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/developer/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["database"] == "healthy"
    assert data["security"]["developer_console_access"] == "restricted"


def test_provision_super_admin_utility():
    """CLI utility should provision a new super admin and promote existing users."""
    # Provision new user
    res1 = provision_super_admin(
        email="cli_provisioned@example.com",
        password="SafePassword999!",
        first_name="CLI",
        last_name="SuperAdmin"
    )
    assert res1 is True

    # Pre-create an unpromoted user specifically for promote testing
    db = SessionLocal()
    try:
        user_to_promote = db.query(User).filter(User.email == "dev_to_promote@example.com").first()
        if not user_to_promote:
            user_to_promote = User(
                email="dev_to_promote@example.com",
                hashed_password=get_password_hash("PromotePass123!"),
                first_name="To",
                last_name="Promote",
                is_active=True,
                is_superuser=False
            )
            db.add(user_to_promote)
        else:
            user_to_promote.is_superuser = False
        db.commit()
    finally:
        db.close()

    # Promote existing user
    res2 = provision_super_admin(
        email="dev_to_promote@example.com",
        promote_only=True
    )
    assert res2 is True

    db = SessionLocal()
    try:
        user1 = db.query(User).filter(User.email == "cli_provisioned@example.com").first()
        assert user1 is not None
        assert user1.is_superuser is True

        user2 = db.query(User).filter(User.email == "dev_to_promote@example.com").first()
        assert user2.is_superuser is True
    finally:
        db.close()
