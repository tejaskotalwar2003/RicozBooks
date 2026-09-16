import io
import csv
from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.account import Account, NormalBalance
from app.models.company import Entity
from app.schemas.ledger import (
    LedgerLineItem,
    AccountLedgerResponse,
    LedgerSummaryItem,
    LedgerSummaryResponse
)

def get_allowed_statuses(include_unposted: bool) -> List[JournalStatus]:
    if include_unposted:
        return [JournalStatus.POSTED, JournalStatus.APPROVED, JournalStatus.SUBMITTED]
    return [JournalStatus.POSTED]

def calculate_opening_balance(
    db: Session,
    account: Account,
    entity_id: int,
    before_date: date,
    include_unposted: bool = False
) -> Tuple[Decimal, str, Decimal]:
    """
    Computes the opening balance for an account before the given date.
    Returns:
        (opening_balance_magnitude, opening_balance_type, signed_balance)
    """
    allowed_statuses = get_allowed_statuses(include_unposted)
    
    result = db.query(
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("sum_debit"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("sum_credit")
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntryLine.account_id == account.id,
        JournalEntry.entry_date < before_date,
        JournalEntry.status.in_(allowed_statuses)
    ).first()

    sum_dr = Decimal(str(result.sum_debit or 0))
    sum_cr = Decimal(str(result.sum_credit or 0))

    if account.normal_balance == NormalBalance.DEBIT:
        signed_balance = sum_dr - sum_cr
        b_type = "DR" if signed_balance >= 0 else "CR"
    else:
        signed_balance = sum_cr - sum_dr
        b_type = "CR" if signed_balance >= 0 else "DR"

    return abs(signed_balance), b_type, signed_balance

def get_account_ledger(
    db: Session,
    entity_id: int,
    account_id: int,
    start_date: date,
    end_date: date,
    include_unposted: bool = False
) -> AccountLedgerResponse:
    """
    Computes the full ledger statement for a single account over a date range.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with ID {account_id} not found."
        )

    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )

    opening_mag, opening_type, current_signed = calculate_opening_balance(
        db=db,
        account=account,
        entity_id=entity_id,
        before_date=start_date,
        include_unposted=include_unposted
    )

    allowed_statuses = get_allowed_statuses(include_unposted)

    query_lines = db.query(
        JournalEntryLine,
        JournalEntry.entry_number,
        JournalEntry.entry_date,
        JournalEntry.reference,
        JournalEntry.description.label("journal_desc"),
        JournalEntry.status,
        JournalEntry.currency
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntryLine.account_id == account_id,
        JournalEntry.entry_date >= start_date,
        JournalEntry.entry_date <= end_date,
        JournalEntry.status.in_(allowed_statuses)
    ).order_by(
        JournalEntry.entry_date.asc(),
        JournalEntry.id.asc(),
        JournalEntryLine.line_number.asc()
    ).all()

    ledger_lines: List[LedgerLineItem] = []
    period_debit = Decimal("0.00")
    period_credit = Decimal("0.00")

    for line_data in query_lines:
        line = line_data[0]
        entry_number = line_data[1]
        entry_date = line_data[2]
        reference = line_data[3]
        journal_desc = line_data[4]
        je_status = line_data[5]
        currency = line_data[6]

        dr = Decimal(str(line.debit or 0))
        cr = Decimal(str(line.credit or 0))

        period_debit += dr
        period_credit += cr

        if account.normal_balance == NormalBalance.DEBIT:
            current_signed += (dr - cr)
            b_type = "DR" if current_signed >= 0 else "CR"
        else:
            current_signed += (cr - dr)
            b_type = "CR" if current_signed >= 0 else "DR"

        ledger_lines.append(
            LedgerLineItem(
                id=line.id,
                journal_entry_id=line.journal_entry_id,
                entry_number=entry_number,
                entry_date=entry_date,
                reference=reference,
                description=line.description,
                journal_description=journal_desc,
                debit=dr,
                credit=cr,
                running_balance=abs(current_signed),
                balance_type=b_type,
                status=je_status.value,
                currency=currency
            )
        )

    if account.normal_balance == NormalBalance.DEBIT:
        net_movement = period_debit - period_credit
        closing_type = "DR" if current_signed >= 0 else "CR"
    else:
        net_movement = period_credit - period_debit
        closing_type = "CR" if current_signed >= 0 else "DR"

    return AccountLedgerResponse(
        account_id=account.id,
        account_code=account.code,
        account_name=account.name,
        account_type=account.account_type.value,
        normal_balance=account.normal_balance.value,
        currency=entity.base_currency,
        start_date=start_date,
        end_date=end_date,
        opening_balance=opening_mag,
        opening_balance_type=opening_type,
        period_debit=period_debit,
        period_credit=period_credit,
        net_movement=net_movement,
        closing_balance=abs(current_signed),
        closing_balance_type=closing_type,
        lines=ledger_lines
    )

def get_entity_ledger_summary(
    db: Session,
    entity_id: int,
    start_date: date,
    end_date: date,
    include_unposted: bool = False
) -> LedgerSummaryResponse:
    """
    Computes the high-level ledger summary matrix for all active accounts in an entity.
    """
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )

    accounts = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.is_active == True
    ).order_by(Account.code.asc()).all()

    allowed_statuses = get_allowed_statuses(include_unposted)

    # Fetch period sums for all accounts in a single grouped query
    period_sums = db.query(
        JournalEntryLine.account_id,
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("period_dr"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("period_cr")
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_date >= start_date,
        JournalEntry.entry_date <= end_date,
        JournalEntry.status.in_(allowed_statuses)
    ).group_by(JournalEntryLine.account_id).all()

    period_map = {row[0]: (Decimal(str(row[1])), Decimal(str(row[2]))) for row in period_sums}

    summary_items: List[LedgerSummaryItem] = []
    tot_open_dr = Decimal("0.00")
    tot_open_cr = Decimal("0.00")
    tot_per_dr = Decimal("0.00")
    tot_per_cr = Decimal("0.00")
    tot_close_dr = Decimal("0.00")
    tot_close_cr = Decimal("0.00")

    for acc in accounts:
        open_mag, open_type, open_signed = calculate_opening_balance(
            db=db,
            account=acc,
            entity_id=entity_id,
            before_date=start_date,
            include_unposted=include_unposted
        )

        p_dr, p_cr = period_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        if acc.normal_balance == NormalBalance.DEBIT:
            closing_signed = open_signed + (p_dr - p_cr)
            close_type = "DR" if closing_signed >= 0 else "CR"
        else:
            closing_signed = open_signed + (p_cr - p_dr)
            close_type = "CR" if closing_signed >= 0 else "DR"

        close_mag = abs(closing_signed)

        # Track totals
        if open_type == "DR":
            tot_open_dr += open_mag
        else:
            tot_open_cr += open_mag

        tot_per_dr += p_dr
        tot_per_cr += p_cr

        if close_type == "DR":
            tot_close_dr += close_mag
        else:
            tot_close_cr += close_mag

        summary_items.append(
            LedgerSummaryItem(
                account_id=acc.id,
                account_code=acc.code,
                account_name=acc.name,
                account_type=acc.account_type.value,
                normal_balance=acc.normal_balance.value,
                currency=entity.base_currency,
                opening_balance=open_mag,
                opening_balance_type=open_type,
                period_debit=p_dr,
                period_credit=p_cr,
                closing_balance=close_mag,
                closing_balance_type=close_type
            )
        )

    return LedgerSummaryResponse(
        entity_id=entity_id,
        start_date=start_date,
        end_date=end_date,
        currency=entity.base_currency,
        accounts=summary_items,
        total_opening_debit=tot_open_dr,
        total_opening_credit=tot_open_cr,
        total_period_debit=tot_per_dr,
        total_period_credit=tot_per_cr,
        total_closing_debit=tot_close_dr,
        total_closing_credit=tot_close_cr
    )

def export_ledger_csv(ledger: AccountLedgerResponse) -> str:
    """
    Renders an account ledger as a structured CSV string.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["RicozBooks - General Ledger Statement"])
    writer.writerow(["Account Code", ledger.account_code])
    writer.writerow(["Account Name", ledger.account_name])
    writer.writerow(["Account Type", ledger.account_type])
    writer.writerow(["Normal Balance", ledger.normal_balance])
    writer.writerow(["Base Currency", ledger.currency])
    writer.writerow(["Date Range", f"{ledger.start_date} to {ledger.end_date}"])
    writer.writerow(["Opening Balance", f"{ledger.opening_balance:.2f} ({ledger.opening_balance_type})"])
    writer.writerow([])

    writer.writerow([
        "Date",
        "Voucher #",
        "Reference",
        "Description",
        "Debit",
        "Credit",
        "Running Balance",
        "Type",
        "Status"
    ])

    for line in ledger.lines:
        writer.writerow([
            str(line.entry_date),
            line.entry_number,
            line.reference or "",
            line.description or line.journal_description or "",
            f"{line.debit:.2f}",
            f"{line.credit:.2f}",
            f"{line.running_balance:.2f}",
            line.balance_type,
            line.status
        ])

    writer.writerow([])
    writer.writerow(["Period Total Debit", f"{ledger.period_debit:.2f}"])
    writer.writerow(["Period Total Credit", f"{ledger.period_credit:.2f}"])
    writer.writerow(["Net Movement", f"{ledger.net_movement:.2f}"])
    writer.writerow(["Closing Balance", f"{ledger.closing_balance:.2f} ({ledger.closing_balance_type})"])

    return output.getvalue()
