import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    admin_res = client.post("/api/v1/auth/login", json={"email": "admin@ricozbooks.com", "password": "admin123"})
    acct_res = client.post("/api/v1/auth/login", json={"email": "accountant@ricozbooks.com", "password": "accountant123"})
    rev_res = client.post("/api/v1/auth/login", json={"email": "reviewer@ricozbooks.com", "password": "reviewer123"})
    
    return {
        "admin": admin_res.json()["access_token"],
        "accountant": acct_res.json()["access_token"],
        "reviewer": rev_res.json()["access_token"],
    }

def test_trial_balance_calculation_and_balance_invariant():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    assert ent_res.status_code == 200
    entity_id = ent_res.json()[0]["id"]

    res = client.get(f"/api/v1/reports/trial-balance?entity_id={entity_id}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["entity_id"] == entity_id
    assert "currency" in data
    assert "items" in data
    assert "total_closing_debit" in data
    assert "total_closing_credit" in data
    assert "is_balanced" in data
    assert "difference" in data

    # Double-entry invariant check: Closing Debits must equal Closing Credits
    assert Decimal(str(data["total_closing_debit"])) == Decimal(str(data["total_closing_credit"]))
    assert data["is_balanced"] is True
    assert Decimal(str(data["difference"])) == Decimal("0.00")

def test_profit_and_loss_calculation():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]

    res = client.get(f"/api/v1/reports/profit-loss?entity_id={entity_id}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_revenue" in data
    assert "total_expense" in data
    assert "net_profit_loss" in data
    assert "gross_profit" in data

    tot_rev = Decimal(str(data["total_revenue"]))
    tot_exp = Decimal(str(data["total_expense"]))
    net_pnl = Decimal(str(data["net_profit_loss"]))

    # Equation: Net Profit = Total Revenue - Total Expense
    assert net_pnl == (tot_rev - tot_exp)

def test_balance_sheet_fundamental_accounting_equation():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]

    res = client.get(f"/api/v1/reports/balance-sheet?entity_id={entity_id}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_assets" in data
    assert "total_liabilities" in data
    assert "total_equity" in data
    assert "total_liabilities_and_equity" in data
    assert "is_balanced" in data
    assert "difference" in data

    tot_assets = Decimal(str(data["total_assets"]))
    tot_liab_eq = Decimal(str(data["total_liabilities_and_equity"]))
    tot_liab = Decimal(str(data["total_liabilities"]))
    tot_eq = Decimal(str(data["total_equity"]))

    # Fundamental Equation: Assets = Liabilities + Equity
    assert tot_liab_eq == (tot_liab + tot_eq)
    assert tot_assets == tot_liab_eq
    assert data["is_balanced"] is True
    assert Decimal(str(data["difference"])) == Decimal("0.00")

def test_reports_csv_exports():
    tokens = get_tokens()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    ent_res = client.get("/api/v1/entities", headers=admin_headers)
    entity_id = ent_res.json()[0]["id"]

    # 1. Export Trial Balance
    tb_csv = client.get(f"/api/v1/reports/trial-balance/export?entity_id={entity_id}", headers=admin_headers)
    assert tb_csv.status_code == 200
    assert "text/csv" in tb_csv.headers["content-type"]
    assert "Trial Balance" in tb_csv.text

    # 2. Export Profit & Loss
    pnl_csv = client.get(f"/api/v1/reports/profit-loss/export?entity_id={entity_id}", headers=admin_headers)
    assert pnl_csv.status_code == 200
    assert "text/csv" in pnl_csv.headers["content-type"]
    assert "Profit & Loss" in pnl_csv.text

    # 3. Export Balance Sheet
    bs_csv = client.get(f"/api/v1/reports/balance-sheet/export?entity_id={entity_id}", headers=admin_headers)
    assert bs_csv.status_code == 200
    assert "text/csv" in bs_csv.headers["content-type"]
    assert "Balance Sheet" in bs_csv.text

