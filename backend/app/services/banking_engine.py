import csv
import io
import re
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.company import Entity
from app.models.user import User
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.banking import (
    BankAccount, BankTransaction, BankTransfer, BankReconciliation, 
    BankStatementLine, BankTxType, BankTxStatus, ReconciliationStatus
)
from app.services.accounting_engine import validate_period_open


def quantize_amount(val: Optional[Decimal]) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def generate_transfer_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_tx = db.query(BankTransfer).filter(
        BankTransfer.entity_id == entity_id,
        BankTransfer.transfer_number.like(f"BT-{current_year}-%")
    ).order_by(desc(BankTransfer.id)).first()

    if last_tx:
        match = re.search(r'BT-\d{4}-(\d+)', last_tx.transfer_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"BT-{current_year}-{seq:04d}"


def ensure_bank_fee_account(db: Session, entity_id: int) -> Account:
    acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == "5750"
    ).first()
    if not acc:
        acc = Account(
            entity_id=entity_id,
            code="5750",
            name="Bank Charges & Fees",
            account_type=AccountType.EXPENSE,
            normal_balance=NormalBalance.DEBIT,
            currency="INR",
            description="Bank processing, wire, and administrative charges",
            is_active=True
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
    return acc


def process_internal_transfer(
    db: Session,
    entity_id: int,
    from_bank_account_id: int,
    to_bank_account_id: int,
    amount: Decimal,
    fee_amount: Decimal,
    transfer_date: date,
    reference_number: Optional[str],
    notes: Optional[str],
    current_user: User
) -> BankTransfer:
    """
    Executes an internal transfer between two bank accounts:
    - Balanced GL Entry:
      - Dr Destination Bank GL Account (amount)
      - Dr Bank Charges 5750 (fee_amount if > 0)
      - Cr Source Bank GL Account (amount + fee_amount)
    - Updates BankAccount current balances
    - Creates corresponding BankTransaction records
    """
    if from_bank_account_id == to_bank_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination bank accounts must be different."
        )

    amt = quantize_amount(amount)
    fee = quantize_amount(fee_amount)
    total_outflow = quantize_amount(amt + fee)

    if amt <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer amount must be strictly greater than zero."
        )

    # 1. Period Lock Check
    validate_period_open(db, entity_id, transfer_date)

    from_acc = db.query(BankAccount).filter(
        BankAccount.id == from_bank_account_id,
        BankAccount.entity_id == entity_id
    ).first()
    to_acc = db.query(BankAccount).filter(
        BankAccount.id == to_bank_account_id,
        BankAccount.entity_id == entity_id
    ).first()

    if not from_acc or not to_acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both bank accounts could not be found."
        )

    transfer_num = generate_transfer_number(db, entity_id)

    # 2. Balanced Journal Entry
    journal_lines = []
    line_num = 1

    # Dr Destination Bank GL Account
    journal_lines.append(
        JournalEntryLine(
            line_number=line_num,
            account_id=to_acc.gl_account_id,
            debit=amt,
            credit=Decimal("0.00"),
            description=f"Transfer In: From {from_acc.bank_name} ({from_acc.account_number[-4:]})"
        )
    )
    line_num += 1

    # Dr Bank Fee (if any)
    if fee > Decimal("0.00"):
        fee_account = ensure_bank_fee_account(db, entity_id)
        journal_lines.append(
            JournalEntryLine(
                line_number=line_num,
                account_id=fee_account.id,
                debit=fee,
                credit=Decimal("0.00"),
                description=f"Transfer Fee on #{transfer_num}"
            )
        )
        line_num += 1

    # Cr Source Bank GL Account
    journal_lines.append(
        JournalEntryLine(
            line_number=line_num,
            account_id=from_acc.gl_account_id,
            debit=Decimal("0.00"),
            credit=total_outflow,
            description=f"Transfer Out: To {to_acc.bank_name} ({to_acc.account_number[-4:]})"
        )
    )

    tot_deb = sum(l.debit for l in journal_lines)
    tot_cred = sum(l.credit for l in journal_lines)
    if tot_deb != tot_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Imbalance in bank transfer journal: Debit {tot_deb} != Credit {tot_cred}"
        )

    je = JournalEntry(
        entity_id=entity_id,
        entry_number=f"JE-{transfer_num}",
        entry_date=transfer_date,
        description=f"Internal Bank Transfer #{transfer_num} ({from_acc.bank_name} -> {to_acc.bank_name})",
        reference=reference_number or transfer_num,
        currency=from_acc.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=tot_deb,
        total_credit=tot_cred,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    for l in journal_lines:
        l.journal_entry_id = je.id
        db.add(l)

    # 3. Update Bank Account Balances
    from_acc.current_balance = quantize_amount(Decimal(str(from_acc.current_balance)) - total_outflow)
    to_acc.current_balance = quantize_amount(Decimal(str(to_acc.current_balance)) + amt)

    # 4. Create Bank Transactions
    tx_out = BankTransaction(
        bank_account_id=from_acc.id,
        transaction_type=BankTxType.TRANSFER_OUT,
        transaction_date=transfer_date,
        amount=total_outflow,
        is_credit=False, # Outflow
        running_balance=from_acc.current_balance,
        reference_number=reference_number or transfer_num,
        counterparty=f"{to_acc.bank_name} - {to_acc.account_name}",
        description=f"Transfer Out to {to_acc.account_name} ({transfer_num})",
        status=BankTxStatus.UNRECONCILED,
        journal_entry_id=je.id
    )
    db.add(tx_out)

    tx_in = BankTransaction(
        bank_account_id=to_acc.id,
        transaction_type=BankTxType.TRANSFER_IN,
        transaction_date=transfer_date,
        amount=amt,
        is_credit=True, # Inflow
        running_balance=to_acc.current_balance,
        reference_number=reference_number or transfer_num,
        counterparty=f"{from_acc.bank_name} - {from_acc.account_name}",
        description=f"Transfer In from {from_acc.account_name} ({transfer_num})",
        status=BankTxStatus.UNRECONCILED,
        journal_entry_id=je.id
    )
    db.add(tx_in)

    # 5. Create Transfer Record
    bt = BankTransfer(
        entity_id=entity_id,
        transfer_number=transfer_num,
        from_bank_account_id=from_acc.id,
        to_bank_account_id=to_acc.id,
        transfer_date=transfer_date,
        amount=amt,
        fee_amount=fee,
        currency=from_acc.currency,
        reference_number=reference_number,
        notes=notes,
        journal_entry_id=je.id,
        created_by_id=current_user.id
    )
    db.add(bt)
    db.commit()
    db.refresh(bt)
    return bt


def parse_and_load_csv_statement(
    db: Session,
    reconciliation_id: int,
    csv_text: str
) -> int:
    """
    Parses a CSV bank statement and populates statement lines.
    CSV expected headers: Date, Description, Reference, Debit/Withdrawal, Credit/Deposit, Balance
    Auto-matches against unreconciled BankTransactions with identical amount and close date.
    """
    recon = db.query(BankReconciliation).filter(BankReconciliation.id == reconciliation_id).first()
    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank reconciliation record not found."
        )

    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    lines_added = 0

    unreconciled_txs = db.query(BankTransaction).filter(
        BankTransaction.bank_account_id == recon.bank_account_id,
        BankTransaction.status == BankTxStatus.UNRECONCILED
    ).all()

    for row in reader:
        # Normalized key lookup
        row_clean = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        
        # Parse date
        dt_str = row_clean.get("date") or row_clean.get("txn date") or row_clean.get("transaction date") or date.today().isoformat()
        try:
            tx_date = datetime.strptime(dt_str, "%Y-%m-%d").date()
        except ValueError:
            try:
                tx_date = datetime.strptime(dt_str, "%d/%m/%Y").date()
            except ValueError:
                tx_date = date.today()

        desc_text = row_clean.get("description") or row_clean.get("narration") or row_clean.get("particulars") or "Bank Transaction"
        ref_text = row_clean.get("reference") or row_clean.get("chq/ref no") or row_clean.get("ref no") or None

        debit_val = Decimal(str(row_clean.get("debit") or row_clean.get("withdrawal") or "0") or "0")
        credit_val = Decimal(str(row_clean.get("credit") or row_clean.get("deposit") or "0") or "0")

        if credit_val > Decimal("0.00"):
            amt = quantize_amount(credit_val)
            is_credit = True
        else:
            amt = quantize_amount(debit_val)
            is_credit = False

        if amt <= Decimal("0.00"):
            continue

        bal_val = row_clean.get("balance")
        balance_after = quantize_amount(Decimal(str(bal_val))) if bal_val else None

        stmt_line = BankStatementLine(
            reconciliation_id=recon.id,
            transaction_date=tx_date,
            description=desc_text,
            reference=ref_text,
            amount=amt,
            is_credit=is_credit,
            balance_after=balance_after,
            is_matched=False
        )
        db.add(stmt_line)
        db.flush()

        # Try auto-matching
        for tx in unreconciled_txs:
            if tx.status == BankTxStatus.UNRECONCILED:
                if quantize_amount(tx.amount) == amt and tx.is_credit == is_credit:
                    # Check date proximity ±7 days
                    days_diff = abs((tx.transaction_date - tx_date).days)
                    if days_diff <= 7:
                        stmt_line.is_matched = True
                        stmt_line.matched_transaction_id = tx.id
                        tx.status = BankTxStatus.RECONCILED
                        tx.reconciled_at = datetime.utcnow()
                        tx.reconciliation_id = recon.id
                        break

        lines_added += 1

    # Re-calculate reconciliation balances
    recalculate_reconciliation_difference(db, recon)
    db.commit()
    return lines_added


def recalculate_reconciliation_difference(db: Session, recon: BankReconciliation):
    """
    Reconciliation Invariant:
    Statement Ending Balance - (Book Balance + Unreconciled Outflows - Unreconciled Inflows) = Difference
    """
    matched_lines = db.query(BankStatementLine).filter(
        BankStatementLine.reconciliation_id == recon.id,
        BankStatementLine.is_matched == True
    ).all()

    matched_credits = sum(l.amount for l in matched_lines if l.is_credit)
    matched_debits = sum(l.amount for l in matched_lines if not l.is_credit)
    recon.reconciled_balance = quantize_amount(matched_credits - matched_debits)
    
    # Difference between statement and reconciled ledger
    recon.difference = quantize_amount(recon.statement_balance - (recon.book_balance + recon.reconciled_balance))
