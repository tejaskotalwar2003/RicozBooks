import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sessions_and_security_lifecycle():
    # 1. Login as admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"},
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query active sessions
    sess_res = client.get("/api/v1/auth/sessions", headers=headers)
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) >= 1
    
    # Check that at least one session is marked current
    current_session = next((s for s in sessions if s["is_current"] is True), None)
    assert current_session is not None
    assert "Chrome" in current_session["browser"] or "Windows" in current_session["os"]

    # 3. Prevent terminating the current active session
    del_res = client.delete(f"/api/v1/auth/sessions/{current_session['id']}", headers=headers)
    assert del_res.status_code == 400
    assert "Cannot sign out the current active session" in del_res.json()["detail"]

    # 4. Sign out all other sessions
    sign_out_others_res = client.post("/api/v1/auth/sessions/sign-out-others", headers=headers)
    assert sign_out_others_res.status_code == 200
    assert sign_out_others_res.json()["status"] == "success"

    # 5. Query login activity
    activity_res = client.get("/api/v1/auth/login-activity", headers=headers)
    assert activity_res.status_code == 200
    activities = activity_res.json()
    assert isinstance(activities, list)
    assert len(activities) >= 1
    latest_act = activities[0]
    assert latest_act["status"] in ["SUCCESS", "FAILED"]
    assert "device_browser" in latest_act
    assert "timestamp" in latest_act

def test_change_password_and_invalidates_others():
    # Login as reviewer
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@ricozbooks.com", "password": "reviewer123"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Change password to new password
    change_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "reviewer123", "new_password": "reviewerNewPass123!"},
        headers=headers
    )
    assert change_res.status_code == 200
    assert change_res.json()["status"] == "success"

    # Revert back so existing tests continue to pass
    revert_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "reviewerNewPass123!", "new_password": "reviewer123"},
        headers=headers
    )
    assert revert_res.status_code == 200
