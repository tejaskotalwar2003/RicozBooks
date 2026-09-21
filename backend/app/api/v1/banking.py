from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.banking import (
    BankAccount, BankTransaction, BankTransfer, BankReconciliation, 
    BankStatementLine, BankTxType, BankTxStatus, ReconciliationStatus
)
from app.schemas.banking import (
    BankAccountCreate, BankAccountUpdate, BankAccountResponse,
    BankTransactionCreate, BankTransactionResponse,
    BankTransferCreate, BankTransferResponse,
    BankReconciliationCreate, BankReconciliationResponse,
    BankReconciliationMatchRequest, BankStatementLineResponse,
    BankingSummaryResponse
)
from app.services.banking_engine import (
    quantize_amount, process_internal_transfer, parse_and_load_csv_statement,
    recalculate_reconciliation_difference
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access,
    get_tenant_entity_ids, log_audit
)

router = APIRouter()


# =========================================================================
# 1. BANK ACCOUNTS
# =========================================================================
def format_bank_account_response(acc: BankAccount) -> dict:
    return {
        "id": acc.id,
        "entity_id": acc.entity_id,
        "bank_name": acc.bank_name,
        "account_name": acc.account_name,
        "account_number": acc.account_number,
        "account_type": acc.account_type,
        "ifsc_code": acc.ifsc_code,
        "swift_bic": acc.swift_bic,
        "branch_name": acc.branch_name,
        "currency": acc.currency,
        "gl_account_id": acc.gl_account_id,
        "opening_balance": acc.opening_balance,
        "current_balance": acc.current_balance,
        "is_active": acc.is_active,
        "gl_account_code": acc.gl_account.code if acc.gl_account else None,
        "gl_account_name": acc.gl_account.name if acc.gl_account else None,
        "created_at": acc.created_at,
        "updated_at": acc.updated_at
    }


@router.get("/accounts", response_model=List[BankAccountResponse])
def list_bank_accounts(
    entity_id: int = Query(...),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    q = db.query(BankAccount).options(joinedload(BankAccount.gl_account)).filter(BankAccount.entity_id == entity_id)
    if is_active is not None:
        q = q.filter(BankAccount.is_active == is_active)

    accounts = q.order_by(BankAccount.bank_name.asc()).all()
    return [format_bank_account_response(a) for a in accounts]


@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    acc_in: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(acc_in.entity_id, current_user, db)

    # Ensure GL account belongs to entity
    gl_acc = db.query(Account).filter(
        Account.id == acc_in.gl_account_id,
        Account.entity_id == acc_in.entity_id
    ).first()
    if not gl_acc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified GL account does not belong to this legal entity."
        )

    op_bal = quantize_amount(acc_in.opening_balance)
    bank_acc = BankAccount(
        entity_id=acc_in.entity_id,
        bank_name=acc_in.bank_name,
        account_name=acc_in.account_name,
        account_number=acc_in.account_number,
        account_type=acc_in.account_type,
        ifsc_code=acc_in.ifsc_code,
        swift_bic=acc_in.swift_bic,
        branch_name=acc_in.branch_name,
        currency=acc_in.currency,
        gl_account_id=acc_in.gl_account_id,
        opening_balance=op_bal,
        current_balance=op_bal,
        is_active=True
    )
    db.add(bank_acc)
    db.commit()
    db.refresh(bank_acc)

    log_audit(
        db=db,
        action="CREATE",
        record_type="BankAccount",
        record_id=str(bank_acc.id),
        user=current_user,
        entity_id=bank_acc.entity_id,
        details=f"Created bank account {bank_acc.bank_name} ({bank_acc.account_number})"
    )

    acc_detail = db.query(BankAccount).options(joinedload(BankAccount.gl_account)).filter(BankAccount.id == bank_acc.id).first()
    return format_bank_account_response(acc_detail)


@router.get("/accounts/{id}", response_model=BankAccountResponse)
def get_bank_account(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    acc = db.query(BankAccount).options(joinedload(BankAccount.gl_account)).filter(BankAccount.id == id).first()
    if not acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    verify_entity_access(acc.entity_id, current_user, db)
    return format_bank_account_response(acc)


# =========================================================================
# 2. BANK TRANSACTIONS
# =========================================================================
@router.get("/transactions", response_model=List[BankTransactionResponse])
def list_bank_transactions(
    bank_account_id: int = Query(...),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bank_acc = db.query(BankAccount).filter(BankAccount.id == bank_account_id).first()
    if not bank_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    verify_entity_access(bank_acc.entity_id, current_user, db)

    q = db.query(BankTransaction).filter(BankTransaction.bank_account_id == bank_account_id)
    if status_filter:
        q = q.filter(BankTransaction.status == status_filter.upper())

    txs = q.order_by(desc(BankTransaction.transaction_date), desc(BankTransaction.id)).offset(offset).limit(limit).all()
    return txs


# =========================================================================
# 3. INTERNAL TRANSFERS
# =========================================================================
@router.post("/transfers", response_model=BankTransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_in: BankTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(transfer_in.entity_id, current_user, db)

    transfer = process_internal_transfer(
        db=db,
        entity_id=transfer_in.entity_id,
        from_bank_account_id=transfer_in.from_bank_account_id,
        to_bank_account_id=transfer_in.to_bank_account_id,
        amount=transfer_in.amount,
        fee_amount=transfer_in.fee_amount,
        transfer_date=transfer_in.transfer_date,
        reference_number=transfer_in.reference_number,
        notes=transfer_in.notes,
        current_user=current_user
    )

    log_audit(
        db=db,
        action="CREATE",
        record_type="BankTransfer",
        record_id=str(transfer.id),
        user=current_user,
        entity_id=transfer.entity_id,
        details=f"Created internal transfer #{transfer.transfer_number} for {transfer.amount}"
    )
    return transfer


@router.get("/transfers", response_model=List[BankTransferResponse])
def list_transfers(
    entity_id: int = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    transfers = db.query(BankTransfer).filter(
        BankTransfer.entity_id == entity_id
    ).order_by(desc(BankTransfer.transfer_date), desc(BankTransfer.id)).offset(offset).limit(limit).all()
    return transfers


# =========================================================================
# 4. BANK RECONCILIATIONS
# =========================================================================
@router.post("/reconciliations", response_model=BankReconciliationResponse, status_code=status.HTTP_201_CREATED)
def create_reconciliation(
    rec_in: BankReconciliationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bank_acc = db.query(BankAccount).filter(BankAccount.id == rec_in.bank_account_id).first()
    if not bank_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    verify_entity_access(bank_acc.entity_id, current_user, db)

    stmt_bal = quantize_amount(rec_in.statement_balance)
    book_bal = quantize_amount(bank_acc.current_balance)
    diff = quantize_amount(stmt_bal - book_bal)

    recon = BankReconciliation(
        bank_account_id=bank_acc.id,
        statement_date=rec_in.statement_date,
        statement_balance=stmt_bal,
        book_balance=book_bal,
        reconciled_balance=Decimal("0.00"),
        difference=diff,
        status=ReconciliationStatus.IN_PROGRESS,
        notes=rec_in.notes,
        reconciled_by_id=current_user.id
    )
    db.add(recon)
    db.commit()
    db.refresh(recon)
    return recon


@router.get("/reconciliations/{id}", response_model=BankReconciliationResponse)
def get_reconciliation_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recon = db.query(BankReconciliation).options(
        joinedload(BankReconciliation.statement_lines),
        joinedload(BankReconciliation.bank_account)
    ).filter(BankReconciliation.id == id).first()
    if not recon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation session not found")

    verify_entity_access(recon.bank_account.entity_id, current_user, db)
    return recon


@router.post("/reconciliations/{id}/upload-csv")
async def upload_csv_statement(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recon = db.query(BankReconciliation).options(joinedload(BankReconciliation.bank_account)).filter(
        BankReconciliation.id == id
    ).first()
    if not recon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation session not found")

    verify_entity_access(recon.bank_account.entity_id, current_user, db)

    content = await file.read()
    csv_text = content.decode("utf-8", errors="replace")

    lines_imported = parse_and_load_csv_statement(db, recon.id, csv_text)
    db.refresh(recon)

    return {
        "message": f"Successfully parsed and loaded {lines_imported} statement lines from CSV.",
        "lines_imported": lines_imported,
        "difference": float(recon.difference)
    }


@router.post("/reconciliations/{id}/match")
def match_transaction(
    id: int,
    match_in: BankReconciliationMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recon = db.query(BankReconciliation).options(joinedload(BankReconciliation.bank_account)).filter(
        BankReconciliation.id == id
    ).first()
    if not recon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation session not found")

    verify_entity_access(recon.bank_account.entity_id, current_user, db)

    stmt_line = db.query(BankStatementLine).filter(
        BankStatementLine.id == match_in.statement_line_id,
        BankStatementLine.reconciliation_id == recon.id
    ).first()
    if not stmt_line:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement line not found")

    tx = db.query(BankTransaction).filter(
        BankTransaction.id == match_in.transaction_id,
        BankTransaction.bank_account_id == recon.bank_account_id
    ).first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank transaction not found")

    stmt_line.is_matched = True
    stmt_line.matched_transaction_id = tx.id
    tx.status = BankTxStatus.RECONCILED
    tx.reconciled_at = datetime.utcnow()
    tx.reconciliation_id = recon.id

    recalculate_reconciliation_difference(db, recon)
    db.commit()
    db.refresh(recon)

    return {"message": "Transaction matched successfully.", "difference": float(recon.difference)}


@router.post("/reconciliations/{id}/complete", response_model=BankReconciliationResponse)
def complete_reconciliation_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recon = db.query(BankReconciliation).options(
        joinedload(BankReconciliation.bank_account),
        joinedload(BankReconciliation.statement_lines)
    ).filter(BankReconciliation.id == id).first()
    if not recon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation not found")

    verify_entity_access(recon.bank_account.entity_id, current_user, db)

    recon.status = ReconciliationStatus.COMPLETED
    recon.completed_at = datetime.utcnow()
    recon.reconciled_by_id = current_user.id
    db.commit()
    db.refresh(recon)
    return recon


@router.get("/banking-summary", response_model=BankingSummaryResponse)
def get_banking_summary(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    accounts = db.query(BankAccount).filter(
        BankAccount.entity_id == entity_id,
        BankAccount.is_active == True
    ).all()

    total_cash = sum(a.current_balance for a in accounts)

    unreconciled_count = db.query(BankTransaction).join(
        BankAccount, BankAccount.id == BankTransaction.bank_account_id
    ).filter(
        BankAccount.entity_id == entity_id,
        BankTransaction.status == BankTxStatus.UNRECONCILED
    ).count()

    acc_summary = [
        {
            "id": a.id,
            "bank_name": a.bank_name,
            "account_name": a.account_name,
            "account_number": a.account_number,
            "balance": float(a.current_balance),
            "currency": a.currency
        }
        for a in accounts
    ]

    return {
        "total_liquid_cash": quantize_amount(Decimal(str(total_cash))),
        "active_bank_accounts_count": len(accounts),
        "unreconciled_transactions_count": unreconciled_count,
        "accounts_summary": acc_summary
    }
