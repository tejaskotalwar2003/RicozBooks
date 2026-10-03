import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def active_entity(auth_headers):
    ent_res = client.get("/api/v1/entities", headers=auth_headers)
    assert ent_res.status_code == 200
    entities = ent_res.json()
    assert len(entities) > 0
    return entities[0]

def test_pagination_endpoints_structure(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # 1. Test Invoices Pagination
    res = client.get(f"/api/v1/invoices?entity_id={entity_id}&page=1&page_size=5", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert isinstance(data["items"], list)
    assert len(data["items"]) <= 5

    # 2. Test Invoices Unpaginated (for selectors/backward compatibility)
    res_all = client.get(f"/api/v1/invoices?entity_id={entity_id}&paginate=false", headers=auth_headers)
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert isinstance(data_all, list)

    # 3. Test Customers Pagination
    res_cust = client.get(f"/api/v1/customers?entity_id={entity_id}&page=1&page_size=10", headers=auth_headers)
    assert res_cust.status_code == 200
    cust_data = res_cust.json()
    assert "items" in cust_data
    assert "total" in cust_data
    assert cust_data["page"] == 1
    assert cust_data["page_size"] == 10

    # 4. Test Bills Pagination
    res_bills = client.get(f"/api/v1/bills?entity_id={entity_id}&page=1&page_size=10", headers=auth_headers)
    assert res_bills.status_code == 200
    bills_data = res_bills.json()
    assert "items" in bills_data
    assert "total" in bills_data
    assert bills_data["page"] == 1
    assert bills_data["page_size"] == 10

    # 5. Test Vendors Pagination
    res_ven = client.get(f"/api/v1/vendors?entity_id={entity_id}&page=1&page_size=10", headers=auth_headers)
    assert res_ven.status_code == 200
    ven_data = res_ven.json()
    assert "items" in ven_data
    assert "total" in ven_data

    # 6. Test Expenses Pagination
    res_exp = client.get(f"/api/v1/expenses/expenses?entity_id={entity_id}&page=1&page_size=10", headers=auth_headers)
    assert res_exp.status_code == 200
    exp_data = res_exp.json()
    assert "items" in exp_data
    assert "total" in exp_data

    # 7. Test Journal Entries Pagination
    res_je = client.get(f"/api/v1/journal-entries?entity_id={entity_id}&page=1&page_size=10", headers=auth_headers)
    assert res_je.status_code == 200
    je_data = res_je.json()
    assert "items" in je_data
    assert "total" in je_data

    # 8. Test Page Out Of Range (returns empty list, never 500 error)
    res_high = client.get(f"/api/v1/invoices?entity_id={entity_id}&page=99999&page_size=20", headers=auth_headers)
    assert res_high.status_code == 200
    high_data = res_high.json()
    assert high_data["items"] == []
    assert high_data["page"] == 99999

    # 9. Test Invalid Page Parameter (page < 1 or page_size > 100)
    res_invalid_page = client.get(f"/api/v1/invoices?entity_id={entity_id}&page=0", headers=auth_headers)
    assert res_invalid_page.status_code == 422  # Validation error

    res_invalid_size = client.get(f"/api/v1/invoices?entity_id={entity_id}&page_size=500", headers=auth_headers)
    assert res_invalid_size.status_code == 422  # Exceeds max 100

def test_pagination_isolation_and_filtering(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # Filter with status
    res_filtered = client.get(
        f"/api/v1/invoices?entity_id={entity_id}&status=PAID&page=1&page_size=5",
        headers=auth_headers
    )
    assert res_filtered.status_code == 200
    data = res_filtered.json()
    for inv in data["items"]:
        assert inv["status"] == "PAID"
