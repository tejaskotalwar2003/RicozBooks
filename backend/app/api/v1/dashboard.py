from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.close import ClosePeriod, CloseTask, CloseStatus
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    MonthlyTrajectoryItem,
    CloseStatusSummary,
    JournalStatusCounts,
    RecentJournalItem
)
from app.services.reporting_engine import generate_profit_and_loss, generate_balance_sheet
from app.api.deps import get_current_user, verify_entity_access, get_tenant_entity_ids

router = APIRouter()

def get_currency_symbol(currency: str) -> str:
    mapping = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "AED": "AED ",
        "SGD": "S$",
    }
    return mapping.get(currency.upper() if currency else "INR", "₹")

def get_fy_start_date(today: date) -> date:
    # Standard financial year starting April 1st
    if today.month >= 4:
        return date(today.year, 4, 1)
    else:
        return date(today.year - 1, 4, 1)

@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    entity_id: Optional[int] = Query(None, description="Operating Entity ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)
    
    # Resolve target entity
    target_entity_id = entity_id
    if not target_entity_id:
        if current_user.default_entity_id and (current_user.is_superuser or (tenant_entity_ids and current_user.default_entity_id in tenant_entity_ids)):
            target_entity_id = current_user.default_entity_id
        elif tenant_entity_ids:
            target_entity_id = tenant_entity_ids[0]
        else:
            first_entity = db.query(Entity).first()
            if first_entity:
                target_entity_id = first_entity.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active operating entities found."
                )

    verify_entity_access(target_entity_id, current_user, db)

    entity = db.query(Entity).filter(Entity.id == target_entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {target_entity_id} not found."
        )

    today = date.today()
    fy_start = get_fy_start_date(today)

    # 1. P&L Metrics (Revenue, Expenses, Net Profit, Margin)
    pl_report = generate_profit_and_loss(
        db=db,
        entity_id=target_entity_id,
        start_date=fy_start,
        end_date=today,
        include_unposted=False
    )

    # 2. Balance Sheet Metrics (Total Assets, Balance Check)
    bs_report = generate_balance_sheet(
        db=db,
        entity_id=target_entity_id,
        as_of_date=today,
        include_unposted=False
    )

    # 3. Monthly Trajectory (Past 6 months: Apr through Sep or trailing 6 months)
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trajectory_months = []
    
    # Generate sequence of months from April to current month, up to 6 months
    cur_year = today.year
    cur_month = today.month
    
    # If in Indian FY (Apr-Sep), show Apr up to current month (min 6 slots)
    if cur_month >= 4:
        for m in range(4, cur_month + 1):
            trajectory_months.append((cur_year, m, month_names[m - 1]))
    else:
        # Jan-Mar: from Apr last year to current month
        for m in range(4, 13):
            trajectory_months.append((cur_year - 1, m, month_names[m - 1]))
        for m in range(1, cur_month + 1):
            trajectory_months.append((cur_year, m, month_names[m - 1]))

    # Keep the last 6 months
    trajectory_months = trajectory_months[-6:] if len(trajectory_months) >= 6 else trajectory_months
    # If less than 6 months, pad with preceding months
    while len(trajectory_months) < 6:
        first_y, first_m, _ = trajectory_months[0]
        prev_m = 12 if first_m == 1 else first_m - 1
        prev_y = first_y - 1 if first_m == 1 else first_y
        trajectory_months.insert(0, (prev_y, prev_m, month_names[prev_m - 1]))

    # Query posted transaction lines for the trajectory window
    first_slot_y, first_slot_m, _ = trajectory_months[0]
    window_start = date(first_slot_y, first_slot_m, 1)

    posted_lines = db.query(
        JournalEntry.entry_date,
        Account.account_type,
        JournalEntryLine.debit,
        JournalEntryLine.credit
    ).join(
        Account, Account.id == JournalEntryLine.account_id
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == target_entity_id,
        JournalEntry.status == JournalStatus.POSTED,
        JournalEntry.entry_date >= window_start,
        JournalEntry.entry_date <= today,
        Account.account_type.in_([AccountType.REVENUE, AccountType.EXPENSE])
    ).all()

    # Aggregate by (year, month)
    monthly_sums = {}
    for entry_date, acc_type, dr, cr in posted_lines:
        key = (entry_date.year, entry_date.month)
        if key not in monthly_sums:
            monthly_sums[key] = {"rev": Decimal("0.00"), "exp": Decimal("0.00")}
        
        dr_dec = Decimal(str(dr or 0))
        cr_dec = Decimal(str(cr or 0))
        
        if acc_type == AccountType.REVENUE:
            monthly_sums[key]["rev"] += (cr_dec - dr_dec)
        elif acc_type == AccountType.EXPENSE:
            monthly_sums[key]["exp"] += (dr_dec - cr_dec)

    monthly_trajectory: List[MonthlyTrajectoryItem] = []
    for y, m, m_name in trajectory_months:
        sums = monthly_sums.get((y, m), {"rev": Decimal("0.00"), "exp": Decimal("0.00")})
        monthly_trajectory.append(
            MonthlyTrajectoryItem(
                month=m_name,
                month_num=m,
                year=y,
                revenue=max(Decimal("0.00"), sums["rev"]),
                expense=max(Decimal("0.00"), sums["exp"])
            )
        )

    # 4. Period-End Close Status
    latest_period = db.query(ClosePeriod).filter(
        ClosePeriod.entity_id == target_entity_id
    ).order_by(desc(ClosePeriod.created_at)).first()

    if latest_period:
        tasks = db.query(CloseTask).filter(CloseTask.close_period_id == latest_period.id).all()
        completed = sum(1 for t in tasks if getattr(t, "status", "") == CloseStatus.APPROVED or getattr(t, "status", "") == "APPROVED")
        blocked = sum(1 for t in tasks if getattr(t, "status", "") == CloseStatus.BLOCKED or getattr(t, "status", "") == "BLOCKED")
        pending = len(tasks) - completed - blocked

        close_status = CloseStatusSummary(
            has_period=True,
            period_id=latest_period.id,
            period_name=getattr(latest_period, "period_name", "Fiscal Period Close"),
            completion_percentage=latest_period.completion_percentage,
            completed_tasks=completed,
            pending_tasks=max(0, pending),
            blocked_tasks=blocked,
            status=str(latest_period.status)
        )
    else:
        close_status = CloseStatusSummary(
            has_period=False,
            period_id=None,
            period_name=f"{today.strftime('%B %Y')}",
            completion_percentage=0,
            completed_tasks=0,
            pending_tasks=0,
            blocked_tasks=0,
            status="NOT_STARTED"
        )

    # 5. Journal Status Breakdown
    status_counts = db.query(
        JournalEntry.status,
        func.count(JournalEntry.id)
    ).filter(
        JournalEntry.entity_id == target_entity_id
    ).group_by(JournalEntry.status).all()

    count_map = {row[0]: row[1] for row in status_counts}
    
    draft_cnt = count_map.get(JournalStatus.DRAFT, 0)
    pending_cnt = count_map.get(JournalStatus.SUBMITTED, 0) + count_map.get(JournalStatus.UNDER_REVIEW, 0)
    approved_cnt = count_map.get(JournalStatus.APPROVED, 0)
    posted_cnt = count_map.get(JournalStatus.POSTED, 0)
    rejected_cnt = count_map.get(JournalStatus.REJECTED, 0)
    total_cnt = draft_cnt + pending_cnt + approved_cnt + posted_cnt + rejected_cnt

    journal_counts = JournalStatusCounts(
        total=total_cnt,
        draft=draft_cnt,
        pending=pending_cnt,
        approved=approved_cnt,
        posted=posted_cnt,
        rejected=rejected_cnt
    )

    # 6. Recent Journal Entries
    recent_db_journals = db.query(JournalEntry).filter(
        JournalEntry.entity_id == target_entity_id
    ).order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id)).limit(5).all()

    recent_journals: List[RecentJournalItem] = [
        RecentJournalItem(
            id=j.id,
            entry_number=j.entry_number,
            entry_date=j.entry_date,
            description=j.description or "General Journal Entry",
            entity_name=entity.name,
            amount=Decimal(str(j.total_debit or 0)),
            status=j.status.value
        )
        for j in recent_db_journals
    ]

    return DashboardMetricsResponse(
        entity_id=entity.id,
        entity_name=entity.name,
        currency=entity.base_currency,
        currency_symbol=get_currency_symbol(entity.base_currency),
        total_revenue=pl_report.total_revenue,
        total_expense=pl_report.total_expense,
        net_profit=pl_report.net_profit_loss,
        net_margin_pct=pl_report.net_margin_pct,
        total_assets=bs_report.total_assets,
        is_balanced=bs_report.is_balanced,
        monthly_trajectory=monthly_trajectory,
        close_status=close_status,
        journal_counts=journal_counts,
        recent_journals=recent_journals
    )
