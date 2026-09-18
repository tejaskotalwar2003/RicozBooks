from datetime import datetime, date
from decimal import Decimal
from typing import List, Tuple, Union
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.journal import JournalEntry, JournalEntryLine, Approval, JournalStatus
from app.models.company import FiscalPeriod, Entity
from app.models.account import Account
from app.models.user import User
from app.schemas.journal import JournalLineCreate
from app.api.deps import log_audit

def validate_journal_balance(lines: List[Union[JournalLineCreate, JournalEntryLine]]) -> Tuple[Decimal, Decimal]:
    """
    Strict double-entry validation:
    1. Total Debit must equal Total Credit.
    2. Total must be strictly positive (> 0).
    3. At least 2 lines required.
    4. Each line cannot have both Debit and Credit > 0.
    """
    if len(lines) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Double-entry rule violation: A journal entry must have at least 2 lines."
        )

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for idx, line in enumerate(lines, start=1):
        dr = Decimal(str(line.debit or 0))
        cr = Decimal(str(line.credit or 0))

        if dr < 0 or cr < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Line {idx}: Negative amounts are not allowed. Debit: {dr}, Credit: {cr}"
            )

        if dr > 0 and cr > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Line {idx}: A single line cannot have both Debit and Credit amounts."
            )

        if dr == 0 and cr == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Line {idx}: Either Debit or Credit must be greater than zero."
            )

        total_debit += dr
        total_credit += cr

    diff = abs(total_debit - total_credit)
    if diff > Decimal("0.001"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Double-entry balance violation: Total Debit ({total_debit:.2f}) does not equal "
                f"Total Credit ({total_credit:.2f}). Difference is {diff:.2f}. "
                "The journal cannot be submitted or posted."
            )
        )

    if total_debit <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal total must be greater than zero."
        )

    return total_debit, total_credit

def validate_period_open(db: Session, entity_id: int, entry_date: date):
    """
    Ensures the entry date does not fall within a locked or closed fiscal period.
    """
    closed_period = db.query(FiscalPeriod).filter(
        FiscalPeriod.entity_id == entity_id,
        FiscalPeriod.start_date <= entry_date,
        FiscalPeriod.end_date >= entry_date,
        FiscalPeriod.is_closed == True
    ).first()

    if closed_period:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Posting forbidden: The fiscal period '{closed_period.name}' covering {entry_date} is permanently closed."
        )

    from app.models.close import ClosePeriod
    closed_close = db.query(ClosePeriod).filter(
        ClosePeriod.entity_id == entity_id,
        ClosePeriod.month == entry_date.month,
        ClosePeriod.status == "CLOSED"
    ).first()

    if closed_close:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Posting forbidden: The accounting period '{closed_close.period_name}' is locked and closed by management."
        )

def generate_entry_number(db: Session, entity_id: int, prefix: str = "JE") -> str:
    """
    Generates sequential journal entry numbers (e.g. JE-2026-0001).
    """
    year = date.today().year
    count = db.query(JournalEntry).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_number.like(f"{prefix}-{year}-%")
    ).count()
    return f"{prefix}-{year}-{(count + 1):04d}"

def submit_journal_for_review(db: Session, journal_id: int, user: User) -> JournalEntry:
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    if journal.status not in [JournalStatus.DRAFT, JournalStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit journal with status '{journal.status.value}'. Only DRAFT or REJECTED journals can be submitted."
        )

    # Validate balance and period
    validate_journal_balance(journal.lines)
    validate_period_open(db, journal.entity_id, journal.entry_date)

    journal.status = JournalStatus.SUBMITTED
    journal.rejection_reason = None
    
    approval = Approval(
        journal_entry_id=journal.id,
        reviewer_id=user.id,
        action="SUBMITTED",
        comments="Submitted for supervisory review"
    )
    db.add(approval)
    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_SUBMITTED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=user,
        entity_id=journal.entity_id,
        details=f"Journal {journal.entry_number} submitted for review ({journal.total_debit:.2f} {journal.currency})"
    )
    return journal

def approve_journal_entry(db: Session, journal_id: int, reviewer: User, comments: str = None) -> JournalEntry:
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    if journal.status not in [JournalStatus.SUBMITTED, JournalStatus.UNDER_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve journal with status '{journal.status.value}'. Must be SUBMITTED or UNDER_REVIEW."
        )

    validate_journal_balance(journal.lines)
    validate_period_open(db, journal.entity_id, journal.entry_date)

    journal.status = JournalStatus.APPROVED
    
    approval = Approval(
        journal_entry_id=journal.id,
        reviewer_id=reviewer.id,
        action="APPROVED",
        comments=comments or "Approved for posting"
    )
    db.add(approval)
    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_APPROVED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=reviewer,
        entity_id=journal.entity_id,
        details=f"Journal {journal.entry_number} approved by {reviewer.email}"
    )
    return journal

def reject_journal_entry(db: Session, journal_id: int, reviewer: User, reason: str) -> JournalEntry:
    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A specific rejection reason is mandatory when rejecting a journal entry."
        )

    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    if journal.status not in [JournalStatus.SUBMITTED, JournalStatus.UNDER_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject journal with status '{journal.status.value}'. Must be SUBMITTED or UNDER_REVIEW."
        )

    journal.status = JournalStatus.REJECTED
    journal.rejection_reason = reason.strip()

    approval = Approval(
        journal_entry_id=journal.id,
        reviewer_id=reviewer.id,
        action="REJECTED",
        comments=reason.strip()
    )
    db.add(approval)
    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_REJECTED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=reviewer,
        entity_id=journal.entity_id,
        details=f"Journal {journal.entry_number} rejected. Reason: {reason.strip()}"
    )
    return journal

def post_journal_to_ledger(db: Session, journal_id: int, user: User) -> JournalEntry:
    """
    Commits an approved journal to the general ledger within an atomic database transaction.
    """
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).with_for_update().first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    if journal.status == JournalStatus.POSTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Journal is already posted.")

    user_roles = [r.name for r in user.roles]
    # Reviewer or Admin can post APPROVED journals. Admin can also post directly.
    if journal.status != JournalStatus.APPROVED and "ADMIN" not in user_roles and not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot post journal with status '{journal.status.value}'. Entry must be APPROVED first."
        )

    validate_journal_balance(journal.lines)
    validate_period_open(db, journal.entity_id, journal.entry_date)

    journal.status = JournalStatus.POSTED
    journal.posted_by_id = user.id
    journal.posted_at = datetime.utcnow()

    approval = Approval(
        journal_entry_id=journal.id,
        reviewer_id=user.id,
        action="POSTED",
        comments="Posted to General Ledger"
    )
    db.add(approval)
    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_POSTED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=user,
        entity_id=journal.entity_id,
        details=f"Journal {journal.entry_number} posted to General Ledger ({journal.total_debit:.2f} {journal.currency})"
    )
    return journal

def reverse_posted_journal(db: Session, journal_id: int, user: User, reason: str = None) -> JournalEntry:
    """
    Generates an exact reversing journal entry with debits and credits inverted.
    """
    original = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original journal entry not found")

    if original.status != JournalStatus.POSTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only POSTED journals can be reversed. Current status: '{original.status.value}'"
        )

    validate_period_open(db, original.entity_id, date.today())

    reversal_number = generate_entry_number(db, original.entity_id, prefix="REV")
    reversal_desc = f"Reversal of {original.entry_number}: {reason or 'Accounting adjustment'}"

    reversal_entry = JournalEntry(
        entry_number=reversal_number,
        entity_id=original.entity_id,
        entry_date=date.today(),
        reference=f"REV-{original.entry_number}",
        description=reversal_desc,
        currency=original.currency,
        exchange_rate=original.exchange_rate,
        status=JournalStatus.POSTED,
        total_debit=original.total_credit,
        total_credit=original.total_debit,
        created_by_id=user.id,
        posted_by_id=user.id,
        posted_at=datetime.utcnow(),
        reversal_of_id=original.id
    )
    db.add(reversal_entry)
    db.flush()

    # Invert lines: original debit becomes credit, original credit becomes debit
    for line in original.lines:
        inv_line = JournalEntryLine(
            journal_entry_id=reversal_entry.id,
            line_number=line.line_number,
            account_id=line.account_id,
            description=f"Reversal: {line.description or original.description}",
            debit=line.credit,
            credit=line.debit,
            base_debit=line.base_credit,
            base_credit=line.base_debit
        )
        db.add(inv_line)

    # Mark original as REVERSED
    original.status = JournalStatus.REVERSED

    db.commit()
    db.refresh(reversal_entry)
    db.refresh(original)

    log_audit(
        db=db,
        action="JOURNAL_REVERSED",
        record_type="JournalEntry",
        record_id=original.entry_number,
        user=user,
        entity_id=original.entity_id,
        details=f"Journal {original.entry_number} reversed by {reversal_entry.entry_number}"
    )

    return reversal_entry

