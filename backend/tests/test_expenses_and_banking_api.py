import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, engine, Base
from app.models.account import Account, AccountType
from app.models.company import Entity
from app.models.journal import JournalEntry

# Create any newly added tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ricozbooks.com", "password": "admin123"}
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def active_entity(auth_headers):
    db = SessionLocal()
    try:
        entity = db.query(Entity).filter(Entity.code == "RICOZ_IN").first()
        if not entity:
            entity = db.query(Entity).first()
        return {"id": entity.id, "code": entity.code}
    finally:
        db.close()


def test_expenses_lifecycle(auth_headers, active_entity):
    entity_id = active_entity["id"]
    db = SessionLocal()
    try:
        expense_acc = db.query(Account).filter(
            Account.entity_id == entity_id,
            Account.account_type == AccountType.EXPENSE
        ).first()
        bank_gl = db.query(Account).filter(
            Account.entity_id == entity_id,
            Account.code == "1100"
        ).first()
        expense_acc_id = expense_acc.id if expense_acc else None
        bank_gl_id = bank_gl.id if bank_gl else None
    finally:
        db.close()

    # 1. Fetch categories (verifies auto-seeding)
    resp = client.get(f"/api/v1/expenses/categories?entity_id={entity_id}", headers=auth_headers)
    assert resp.status_code == 200
    categories = resp.json()
    assert len(categories) > 0
    cat_id = categories[0]["id"]
    if not expense_acc_id:
        expense_acc_id = categories[0]["default_account_id"]

    # 2. Create Reimbursable Expense Claim
    exp_payload = {
        "entity_id": entity_id,
        "title": "Client Lunch & Team Strategy Session",
        "category_id": cat_id,
        "expense_date": "2026-09-15",
        "expense_account_id": expense_acc_id,
        "payment_method": "PERSONAL_REIMBURSABLE",
        "subtotal": "4500.00",
        "tax_amount": "810.00",
        "currency": "INR",
        "merchant_name": "Taj Lands End Bistro",
        "reference_number": "INV-LUNCH-9912",
        "description": "Lunch meeting with prospective enterprise client",
        "is_reimbursable": True,
        "is_billable": False
    }

    create_resp = client.post("/api/v1/expenses/expenses", json=exp_payload, headers=auth_headers)
    assert create_resp.status_code == 201, f"Create expense failed: {create_resp.text}"
    exp_data = create_resp.json()
    exp_id = exp_data["id"]
    assert exp_data["total_amount"] == "5310.00"
    assert exp_data["status"] == "SUBMITTED"

    # 3. Maker-Checker Approval
    action_resp = client.post(
        f"/api/v1/expenses/expenses/{exp_id}/action",
        json={"action": "APPROVE"},
        headers=auth_headers
    )
    assert action_resp.status_code == 200
    assert action_resp.json()["status"] == "APPROVED"

    # 4. Post to General Ledger
    post_resp = client.post(f"/api/v1/expenses/expenses/{exp_id}/post", headers=auth_headers)
    assert post_resp.status_code == 200
    posted_exp = post_resp.json()
    assert posted_exp["status"] == "POSTED"
    assert posted_exp["journal_entry_id"] is not None

    # Verify Balanced Journal Entry in DB
    db = SessionLocal()
    try:
        je = db.query(JournalEntry).filter(JournalEntry.id == posted_exp["journal_entry_id"]).first()
        assert je is not None
        assert je.total_debit == Decimal("5310.00")
        assert je.total_credit == Decimal("5310.00")
    finally:
        db.close()

    # 5. Reimburse Claim
    reimb_resp = client.post(
        f"/api/v1/expenses/expenses/{exp_id}/reimburse",
        json={"payment_account_id": bank_gl_id},
        headers=auth_headers
    )
    assert reimb_resp.status_code == 200
    assert reimb_resp.json()["status"] == "PAID"
    assert reimb_resp.json()["reimbursement_journal_id"] is not None


def test_banking_accounts_and_transfers(auth_headers, active_entity):
    entity_id = active_entity["id"]
    db = SessionLocal()
    try:
        bank_gl = db.query(Account).filter(
            Account.entity_id == entity_id,
            Account.code == "1100"
        ).first()
        bank_gl_id = bank_gl.id if bank_gl else None
    finally:
        db.close()

    # 1. Create Bank Account 1 (HDFC Current)
    acc1_payload = {
        "entity_id": entity_id,
        "bank_name": "HDFC Bank",
        "account_name": "HDFC Primary Operational Account",
        "account_number": "502000999991",
        "account_type": "CHECKING",
        "ifsc_code": "HDFC0001234",
        "currency": "INR",
        "gl_account_id": bank_gl_id,
        "opening_balance": "500000.00"
    }
    resp1 = client.post("/api/v1/banking/accounts", json=acc1_payload, headers=auth_headers)
    assert resp1.status_code == 201
    bank1_id = resp1.json()["id"]

    # 2. Create Bank Account 2 (ICICI Escrow)
    acc2_payload = {
        "entity_id": entity_id,
        "bank_name": "ICICI Bank",
        "account_name": "ICICI Secondary Reserve Account",
        "account_number": "000405888882",
        "account_type": "SAVINGS",
        "ifsc_code": "ICIC0000004",
        "currency": "INR",
        "gl_account_id": bank_gl_id,
        "opening_balance": "100000.00"
    }
    resp2 = client.post("/api/v1/banking/accounts", json=acc2_payload, headers=auth_headers)
    assert resp2.status_code == 201
    bank2_id = resp2.json()["id"]

    # 3. Execute Internal Bank Transfer of 50,000 INR from Bank 1 to Bank 2 with 50 INR fee
    transfer_payload = {
        "entity_id": entity_id,
        "from_bank_account_id": bank1_id,
        "to_bank_account_id": bank2_id,
        "transfer_date": "2026-09-18",
        "amount": "50000.00",
        "fee_amount": "50.00",
        "reference_number": "UTR-TEST-881299",
        "notes": "Reserve allocation"
    }
    tf_resp = client.post("/api/v1/banking/transfers", json=transfer_payload, headers=auth_headers)
    assert tf_resp.status_code == 201, f"Transfer failed: {tf_resp.text}"
    tf_data = tf_resp.json()
    assert tf_data["amount"] == "50000.00"

    # 4. Verify updated balances
    b1_check = client.get(f"/api/v1/banking/accounts/{bank1_id}", headers=auth_headers).json()
    b2_check = client.get(f"/api/v1/banking/accounts/{bank2_id}", headers=auth_headers).json()
    assert Decimal(str(b1_check["current_balance"])) == Decimal("449950.00") # 500,000 - 50,050
    assert Decimal(str(b2_check["current_balance"])) == Decimal("150000.00") # 100,000 + 50,000

    # 5. Verify transactions generated
    txs_b1 = client.get(f"/api/v1/banking/transactions?bank_account_id={bank1_id}", headers=auth_headers).json()
    assert len(txs_b1) >= 1
    assert txs_b1[0]["transaction_type"] == "TRANSFER_OUT"


def test_bank_reconciliation_workflow(auth_headers, active_entity):
    entity_id = active_entity["id"]

    # Get or create bank account
    accounts_resp = client.get(f"/api/v1/banking/accounts?entity_id={entity_id}", headers=auth_headers)
    assert accounts_resp.status_code == 200
    acc_id = accounts_resp.json()[0]["id"]

    # 1. Create Bank Reconciliation Session
    recon_payload = {
        "bank_account_id": acc_id,
        "statement_date": "2026-09-30",
        "statement_balance": "449950.00",
        "notes": "September 2026 Monthly Bank Reconciliation"
    }
    recon_resp = client.post("/api/v1/banking/reconciliations", json=recon_payload, headers=auth_headers)
    assert recon_resp.status_code == 201
    recon_id = recon_resp.json()["id"]

    # 2. Upload CSV Bank Statement
    csv_sample = """Date,Description,Reference,Debit,Credit,Balance
2026-09-18,Internal Transfer Out,UTR-TEST-881299,50050.00,0,449950.00
"""
    files = {"file": ("statement.csv", csv_sample, "text/csv")}
    upload_resp = client.post(
        f"/api/v1/banking/reconciliations/{recon_id}/upload-csv",
        files=files,
        headers=auth_headers
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["lines_imported"] == 1

    # 3. Complete Reconciliation Session
    comp_resp = client.post(f"/api/v1/banking/reconciliations/{recon_id}/complete", headers=auth_headers)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["status"] == "COMPLETED"
