import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta
from app.main import app

client = TestClient(app)

def test_public_customer_demo_booking():
    """Customer books a demo without needing to create an account or log in."""
    res = client.post(
        "/demos",
        json={
            "full_name": "Siddharth Verma",
            "work_email": "siddharth@fintechops.in",
            "phone": "+91 91234 56789",
            "company": "FintechOps Solutions",
            "role": "CFO / Business Owner",
            "entities_count": "2–5",
            "interest_area": "Multi-Entity Management",
            "preferred_date": (date.today() + timedelta(days=2)).isoformat(),
            "preferred_time": "11:30 AM - 12:30 PM IST"
        }
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "reference_code" in data
    assert data["reference_code"].startswith("DEMO-")
    assert data["status"] == "NEW"
    assert data["customer_name"] == "Siddharth Verma"
    assert data["company"] == "FintechOps Solutions"


def test_internal_auth_lifecycle():
    """Internal team members login with work credentials and receive JWT."""
    # 1. Invalid credentials
    bad_login = client.post(
        "/internal/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "wrong_password"}
    )
    assert bad_login.status_code == 401

    # 2. Valid credentials
    good_login = client.post(
        "/internal/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    assert good_login.status_code == 200, good_login.text
    token_data = good_login.json()
    assert "access_token" in token_data
    assert token_data["user"]["email"] == "admin@ricozbooks.com"
    assert token_data["user"]["role"] == "DEMO_ADMIN"
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. /internal/auth/me
    me_res = client.get("/internal/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "admin@ricozbooks.com"


def test_internal_dashboard_stats():
    """Internal dashboard aggregates real metrics from PostgreSQL."""
    login_res = client.post(
        "/internal/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    stats_res = client.get("/internal/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "new_requests" in stats
    assert "pending_requests" in stats
    assert "scheduled_demos" in stats
    assert "status_distribution" in stats
    assert "requests_over_time" in stats

    recent_res = client.get("/internal/dashboard/recent-demos", headers=headers)
    assert recent_res.status_code == 200
    assert isinstance(recent_res.json(), list)

    upcoming_res = client.get("/internal/dashboard/upcoming-demos", headers=headers)
    assert upcoming_res.status_code == 200
    assert isinstance(upcoming_res.json(), list)


def test_internal_demo_lifecycle_and_scheduling():
    """Full lifecycle: List -> Review -> Schedule -> Reschedule -> Assign."""
    # 1. Login as Admin
    login_res = client.post(
        "/internal/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 2. Get list of demos
    demos_res = client.get("/internal/demos?page=1&limit=10", headers=headers)
    assert demos_res.status_code == 200
    demos = demos_res.json()
    assert demos["total"] > 0
    demo_id = demos["items"][0]["id"]

    # 3. Update status to UNDER REVIEW
    status_res = client.patch(
        f"/internal/demos/{demo_id}/status",
        json={"status": "UNDER REVIEW"},
        headers=headers
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "UNDER REVIEW"

    # 4. Schedule Demo
    sched_date = (date.today() + timedelta(days=3)).isoformat()
    sched_res = client.patch(
        f"/internal/demos/{demo_id}/schedule",
        json={
            "confirmed_date": sched_date,
            "confirmed_time": "03:00 PM - 04:00 PM IST",
            "duration": "45 mins",
            "meeting_link": "https://meet.google.com/ricoz-confirmed",
            "internal_notes": "Client requested GST focus."
        },
        headers=headers
    )
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert sched_data["status"] == "SCHEDULED"
    assert sched_data["confirmed_time"] == "03:00 PM - 04:00 PM IST"
    assert sched_data["meeting_link"] == "https://meet.google.com/ricoz-confirmed"

    # 5. Reschedule Demo
    resched_date = (date.today() + timedelta(days=5)).isoformat()
    resched_res = client.patch(
        f"/internal/demos/{demo_id}/reschedule",
        json={
            "new_date": resched_date,
            "new_time": "04:30 PM - 05:30 PM IST",
            "reason": "Client executive had a board meeting conflict.",
            "meeting_link": "https://meet.google.com/ricoz-rescheduled"
        },
        headers=headers
    )
    assert resched_res.status_code == 200
    resched_data = resched_res.json()
    assert resched_data["status"] == "RESCHEDULED"
    assert len(resched_data["history"]) > 0
    assert resched_data["history"][0]["reason"] == "Client executive had a board meeting conflict."

    # 6. Team Members List & Assignment
    team_res = client.get("/internal/team", headers=headers)
    assert team_res.status_code == 200
    team = team_res.json()
    assert len(team) >= 2
    sales_rep = next(t for t in team if t["role"] == "SALES_TEAM")

    assign_res = client.patch(
        f"/internal/demos/{demo_id}/assign",
        json={"assigned_to": sales_rep["id"]},
        headers=headers
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_to"] == sales_rep["id"]
    assert assign_res.json()["assigned_user_name"] == sales_rep["name"]
