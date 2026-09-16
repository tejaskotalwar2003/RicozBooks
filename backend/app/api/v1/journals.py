from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.models.user import User
from app.models.journal import JournalEntry, JournalEntryLine, Approval, JournalStatus
from app.models.account import Account
from app.schemas.journal import (
    JournalEntryCreate, 
    JournalEntryUpdate, 
    JournalEntryResponse, 
    JournalEntryDetailResponse, 
    JournalLineResponse, 
    ApprovalResponse, 
    JournalActionRequest
)
from app.services.accounting_engine import (
    validate_journal_balance, 
    validate_period_open, 
    generate_entry_number,
    submit_journal_for_review,
    approve_journal_entry,
    reject_journal_entry,
    post_journal_to_ledger,
    reverse_posted_journal
)
from app.api.deps import get_current_user, require_roles, log_audit

router = APIRouter()

def _enrich_journal_response(journal: JournalEntry) -> JournalEntryResponse:
    res = JournalEntryResponse.model_validate(journal, from_attributes=True)
    if journal.created_by:
        res.created_by_name = journal.created_by.full_name
    if journal.entity:
        res.entity_name = journal.entity.name
    return res

def _enrich_journal_detail(journal: JournalEntry) -> JournalEntryDetailResponse:
    res = JournalEntryDetailResponse.model_validate(journal, from_attributes=True)
    if journal.created_by:
        res.created_by_name = journal.created_by.full_name
    if journal.entity:
        res.entity_name = journal.entity.name
    
    # Enrich lines with account details
    enriched_lines = []
    for line in journal.lines:
        line_res = JournalLineResponse.model_validate(line, from_attributes=True)
        if line.account:
            line_res.account_name = line.account.name
            line_res.account_code = line.account.code
        enriched_lines.append(line_res)
    res.lines = enriched_lines

    # Enrich approvals with reviewer name
    enriched_approvals = []
    for app in journal.approvals:
        app_res = ApprovalResponse.model_validate(app, from_attributes=True)
        if app.reviewer:
            app_res.reviewer_name = app.reviewer.full_name
        enriched_approvals.append(app_res)
    res.approvals = enriched_approvals

    return res

@router.get("/journal-entries", response_model=List[JournalEntryResponse])
def get_journal_entries(
    entity_id: Optional[int] = Query(None),
    status: Optional[JournalStatus] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(JournalEntry).options(
        joinedload(JournalEntry.created_by),
        joinedload(JournalEntry.entity)
    )

    if entity_id:
        query = query.filter(JournalEntry.entity_id == entity_id)
    elif current_user.default_entity_id:
        query = query.filter(JournalEntry.entity_id == current_user.default_entity_id)

    if status:
        query = query.filter(JournalEntry.status == status)

    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)

    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                JournalEntry.entry_number.ilike(term),
                JournalEntry.description.ilike(term),
                JournalEntry.reference.ilike(term)
            )
        )

    journals = query.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id)).limit(limit).all()
    return [_enrich_journal_response(j) for j in journals]

@router.get("/journal-entries/{id}", response_model=JournalEntryDetailResponse)
def get_journal_entry_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    journal = db.query(JournalEntry).options(
        joinedload(JournalEntry.created_by),
        joinedload(JournalEntry.entity),
        joinedload(JournalEntry.lines).joinedload(JournalEntryLine.account),
        joinedload(JournalEntry.approvals).joinedload(Approval.reviewer)
    ).filter(JournalEntry.id == id).first()

    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    return _enrich_journal_detail(journal)

@router.post("/journal-entries", response_model=JournalEntryDetailResponse, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    entry_in: JournalEntryCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    # Strict validation of double-entry rules
    total_dr, total_cr = validate_journal_balance(entry_in.lines)
    validate_period_open(db, entry_in.entity_id, entry_in.entry_date)

    # Verify all accounts belong to this entity and are active
    account_ids = [line.account_id for line in entry_in.lines]
    db_accounts = db.query(Account).filter(Account.id.in_(account_ids)).all()
    if len(db_accounts) != len(set(account_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more accounts not found.")
    for acc in db_accounts:
        if acc.entity_id != entry_in.entity_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Account {acc.code} does not belong to the selected entity."
            )
        if not acc.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Account {acc.code} is inactive and cannot be posted to."
            )

    entry_number = generate_entry_number(db, entry_in.entity_id)
    initial_status = JournalStatus.DRAFT if entry_in.save_as_draft else JournalStatus.SUBMITTED

    journal = JournalEntry(
        entry_number=entry_number,
        entity_id=entry_in.entity_id,
        entry_date=entry_in.entry_date,
        reference=entry_in.reference,
        description=entry_in.description.strip(),
        currency=entry_in.currency,
        exchange_rate=entry_in.exchange_rate,
        status=initial_status,
        total_debit=total_dr,
        total_credit=total_cr,
        created_by_id=current_user.id
    )
    db.add(journal)
    db.flush()

    rate = Decimal(str(entry_in.exchange_rate))
    for idx, line in enumerate(entry_in.lines, start=1):
        dr = Decimal(str(line.debit or 0))
        cr = Decimal(str(line.credit or 0))
        db_line = JournalEntryLine(
            journal_entry_id=journal.id,
            line_number=idx,
            account_id=line.account_id,
            description=line.description,
            debit=dr,
            credit=cr,
            base_debit=dr * rate,
            base_credit=cr * rate
        )
        db.add(db_line)

    # If submitted directly, add approval action
    if not entry_in.save_as_draft:
        approval = Approval(
            journal_entry_id=journal.id,
            reviewer_id=current_user.id,
            action="SUBMITTED",
            comments="Submitted directly upon creation"
        )
        db.add(approval)

    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_CREATED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=current_user,
        entity_id=journal.entity_id,
        details=f"Created journal {journal.entry_number} ({journal.status.value}, {total_dr:.2f} {journal.currency})"
    )

    return get_journal_entry_detail(journal.id, current_user, db)

@router.put("/journal-entries/{id}", response_model=JournalEntryDetailResponse)
def update_draft_journal_entry(
    id: int,
    entry_in: JournalEntryUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    journal = db.query(JournalEntry).filter(JournalEntry.id == id).first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    if journal.status not in [JournalStatus.DRAFT, JournalStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit journal with status '{journal.status.value}'. Only DRAFT or REJECTED journals can be edited."
        )

    # If lines provided, validate new balance and replace lines
    if entry_in.lines is not None:
        total_dr, total_cr = validate_journal_balance(entry_in.lines)
        journal.total_debit = total_dr
        journal.total_credit = total_cr

        # Delete existing lines
        db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id == journal.id).delete()
        db.flush()

        rate = Decimal(str(entry_in.exchange_rate or journal.exchange_rate))
        for idx, line in enumerate(entry_in.lines, start=1):
            dr = Decimal(str(line.debit or 0))
            cr = Decimal(str(line.credit or 0))
            db_line = JournalEntryLine(
                journal_entry_id=journal.id,
                line_number=idx,
                account_id=line.account_id,
                description=line.description,
                debit=dr,
                credit=cr,
                base_debit=dr * rate,
                base_credit=cr * rate
            )
            db.add(db_line)

    if entry_in.entry_date is not None:
        validate_period_open(db, journal.entity_id, entry_in.entry_date)
        journal.entry_date = entry_in.entry_date
    if entry_in.reference is not None:
        journal.reference = entry_in.reference
    if entry_in.description is not None:
        journal.description = entry_in.description.strip()
    if entry_in.currency is not None:
        journal.currency = entry_in.currency
    if entry_in.exchange_rate is not None:
        journal.exchange_rate = entry_in.exchange_rate

    # If it was REJECTED, editing it resets it back to DRAFT
    if journal.status == JournalStatus.REJECTED:
        journal.status = JournalStatus.DRAFT
        journal.rejection_reason = None

    db.commit()
    db.refresh(journal)

    log_audit(
        db=db,
        action="JOURNAL_UPDATED",
        record_type="JournalEntry",
        record_id=journal.entry_number,
        user=current_user,
        entity_id=journal.entity_id,
        details=f"Updated draft journal {journal.entry_number}"
    )

    return get_journal_entry_detail(journal.id, current_user, db)

@router.post("/journal-entries/{id}/submit", response_model=JournalEntryDetailResponse)
def submit_journal(
    id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    journal = submit_journal_for_review(db, id, current_user)
    return get_journal_entry_detail(journal.id, current_user, db)

@router.post("/journal-entries/{id}/approve", response_model=JournalEntryDetailResponse)
def approve_journal(
    id: int,
    action_in: Optional[JournalActionRequest] = None,
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    comments = action_in.comments if action_in else None
    journal = approve_journal_entry(db, id, current_user, comments)
    return get_journal_entry_detail(journal.id, current_user, db)

@router.post("/journal-entries/{id}/reject", response_model=JournalEntryDetailResponse)
def reject_journal(
    id: int,
    action_in: JournalActionRequest,
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    reason = action_in.reason or action_in.comments
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A rejection reason is mandatory when rejecting a journal entry."
        )
    journal = reject_journal_entry(db, id, current_user, reason)
    return get_journal_entry_detail(journal.id, current_user, db)

@router.post("/journal-entries/{id}/post", response_model=JournalEntryDetailResponse)
def post_journal(
    id: int,
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    journal = post_journal_to_ledger(db, id, current_user)
    return get_journal_entry_detail(journal.id, current_user, db)

@router.post("/journal-entries/{id}/reverse", response_model=JournalEntryDetailResponse)
def reverse_journal(
    id: int,
    action_in: Optional[JournalActionRequest] = None,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    reason = action_in.reason or (action_in.comments if action_in else None)
    reversal_entry = reverse_posted_journal(db, id, current_user, reason)
    return get_journal_entry_detail(reversal_entry.id, current_user, db)
