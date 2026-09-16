from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_roles, log_audit
from app.schemas.ledger import AccountLedgerResponse, LedgerSummaryResponse
from app.services.ledger_engine import (
    get_account_ledger,
    get_entity_ledger_summary,
    export_ledger_csv
)

router = APIRouter()

def get_default_dates(start_date: Optional[date], end_date: Optional[date]):
    today = date.today()
    if not end_date:
        end_date = today
    if not start_date:
        # Default to start of current financial year (April 1st) or 30 days ago
        if today.month >= 4:
            start_date = date(today.year, 4, 1)
        else:
            start_date = date(today.year - 1, 4, 1)
        if start_date > end_date:
            start_date = end_date - timedelta(days=30)
    return start_date, end_date

@router.get("/ledger/summary", response_model=LedgerSummaryResponse)
def get_ledger_summary(
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False, description="Preview unposted submitted/approved vouchers"),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT", "VIEWER"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    return get_entity_ledger_summary(
        db=db,
        entity_id=entity_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )

@router.get("/ledger/account/{account_id}", response_model=AccountLedgerResponse)
def get_account_ledger_details(
    account_id: int,
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False, description="Preview unposted submitted/approved vouchers"),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT", "VIEWER"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    return get_account_ledger(
        db=db,
        entity_id=entity_id,
        account_id=account_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )

@router.get("/ledger/account/{account_id}/export")
def export_account_ledger_csv(
    account_id: int,
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    ledger = get_account_ledger(
        db=db,
        entity_id=entity_id,
        account_id=account_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )

    csv_content = export_ledger_csv(ledger)
    filename = f"ledger_{ledger.account_code}_{s_date}_{e_date}.csv"

    log_audit(
        db=db,
        action="LEDGER_EXPORTED",
        record_type="GeneralLedger",
        record_id=f"Account-{ledger.account_code}",
        user=current_user,
        entity_id=entity_id,
        details=f"Exported General Ledger for {ledger.account_code} ({s_date} to {e_date})"
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

