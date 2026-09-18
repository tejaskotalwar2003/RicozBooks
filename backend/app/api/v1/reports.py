from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_roles, log_audit
from app.schemas.report import (
    TrialBalanceResponse,
    ProfitLossResponse,
    BalanceSheetResponse
)
from app.services.reporting_engine import (
    generate_trial_balance,
    generate_profit_and_loss,
    generate_balance_sheet,
    export_trial_balance_csv,
    export_profit_loss_csv,
    export_balance_sheet_csv
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

# =========================================================================
# 1. TRIAL BALANCE
# =========================================================================
@router.get("/reports/trial-balance", response_model=TrialBalanceResponse)
def get_trial_balance_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False, description="Preview unposted submitted/approved vouchers"),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT", "VIEWER"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    report = generate_trial_balance(
        db=db,
        entity_id=entity_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )
    return report

@router.get("/reports/trial-balance/export")
def export_trial_balance_csv_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    report = generate_trial_balance(
        db=db,
        entity_id=entity_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )

    csv_data = export_trial_balance_csv(report)
    filename = f"trial_balance_{report.entity_name.replace(' ', '_')}_{s_date}_{e_date}.csv"

    log_audit(
        db=db,
        action="REPORT_EXPORTED",
        record_type="TrialBalance",
        record_id=f"Entity-{entity_id}",
        user=current_user,
        entity_id=entity_id,
        details=f"Exported Trial Balance for {report.entity_name} ({s_date} to {e_date})"
    )

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

# =========================================================================
# 2. PROFIT & LOSS (INCOME STATEMENT)
# =========================================================================
@router.get("/reports/profit-loss", response_model=ProfitLossResponse)
def get_profit_and_loss_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False, description="Preview unposted submitted/approved vouchers"),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT", "VIEWER"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    report = generate_profit_and_loss(
        db=db,
        entity_id=entity_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )
    return report

@router.get("/reports/profit-loss/export")
def export_profit_loss_csv_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    s_date, e_date = get_default_dates(start_date, end_date)
    report = generate_profit_and_loss(
        db=db,
        entity_id=entity_id,
        start_date=s_date,
        end_date=e_date,
        include_unposted=include_unposted
    )

    csv_data = export_profit_loss_csv(report)
    filename = f"profit_and_loss_{report.entity_name.replace(' ', '_')}_{s_date}_{e_date}.csv"

    log_audit(
        db=db,
        action="REPORT_EXPORTED",
        record_type="ProfitAndLoss",
        record_id=f"Entity-{entity_id}",
        user=current_user,
        entity_id=entity_id,
        details=f"Exported Profit & Loss for {report.entity_name} ({s_date} to {e_date})"
    )

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

# =========================================================================
# 3. BALANCE SHEET (FINANCIAL POSITION)
# =========================================================================
@router.get("/reports/balance-sheet", response_model=BalanceSheetResponse)
def get_balance_sheet_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    as_of_date: Optional[date] = Query(None, description="As of date (defaults to today)"),
    include_unposted: bool = Query(False, description="Preview unposted submitted/approved vouchers"),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT", "VIEWER"])),
    db: Session = Depends(get_db)
):
    target_date = as_of_date or date.today()
    report = generate_balance_sheet(
        db=db,
        entity_id=entity_id,
        as_of_date=target_date,
        include_unposted=include_unposted
    )
    return report

@router.get("/reports/balance-sheet/export")
def export_balance_sheet_csv_report(
    entity_id: int = Query(..., description="Legal Entity ID"),
    as_of_date: Optional[date] = Query(None),
    include_unposted: bool = Query(False),
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    target_date = as_of_date or date.today()
    report = generate_balance_sheet(
        db=db,
        entity_id=entity_id,
        as_of_date=target_date,
        include_unposted=include_unposted
    )

    csv_data = export_balance_sheet_csv(report)
    filename = f"balance_sheet_{report.entity_name.replace(' ', '_')}_{target_date}.csv"

    log_audit(
        db=db,
        action="REPORT_EXPORTED",
        record_type="BalanceSheet",
        record_id=f"Entity-{entity_id}",
        user=current_user,
        entity_id=entity_id,
        details=f"Exported Balance Sheet for {report.entity_name} as of {target_date}"
    )

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

