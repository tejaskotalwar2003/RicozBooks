from typing import List, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class MonthlyTrajectoryItem(BaseModel):
    month: str
    month_num: int
    year: int
    revenue: Decimal
    expense: Decimal

class CloseStatusSummary(BaseModel):
    has_period: bool
    period_id: Optional[int] = None
    period_name: str
    completion_percentage: int
    completed_tasks: int
    pending_tasks: int
    blocked_tasks: int
    status: str

class JournalStatusCounts(BaseModel):
    total: int
    draft: int
    pending: int
    approved: int
    posted: int
    rejected: int

class RecentJournalItem(BaseModel):
    id: int
    entry_number: str
    entry_date: date
    description: str
    entity_name: str
    amount: Decimal
    status: str

class DashboardMetricsResponse(BaseModel):
    entity_id: int
    entity_name: str
    currency: str
    currency_symbol: str
    total_revenue: Decimal
    total_expense: Decimal
    net_profit: Decimal
    net_margin_pct: Decimal
    total_assets: Decimal
    is_balanced: bool
    monthly_trajectory: List[MonthlyTrajectoryItem]
    close_status: CloseStatusSummary
    journal_counts: JournalStatusCounts
    recent_journals: List[RecentJournalItem]

