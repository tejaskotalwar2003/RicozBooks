from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

class ProjectBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    customer_id: Optional[int] = None
    billing_type: str = "TIME_AND_MATERIALS"
    status: str = "IN_PROGRESS"
    budget_amount: Decimal = Decimal("0.00")
    default_hourly_rate: Decimal = Decimal("0.00")
    start_date: date
    end_date: Optional[date] = None

class ProjectCreate(ProjectBase):
    entity_id: int

class ProjectTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    estimated_hours: Decimal = Decimal("0.00")
    status: str = "TODO"

class ProjectTaskCreate(ProjectTaskBase):
    project_id: int

class ProjectTaskResponse(ProjectTaskBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TimesheetCreate(BaseModel):
    entity_id: int
    project_id: int
    task_id: Optional[int] = None
    entry_date: date
    hours: Decimal
    hourly_billable_rate: Optional[Decimal] = None
    hourly_cost_rate: Optional[Decimal] = None
    is_billable: bool = True
    notes: Optional[str] = None

class TimesheetResponse(BaseModel):
    id: int
    entity_id: int
    project_id: int
    task_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    entry_date: date
    hours: Decimal
    hourly_billable_rate: Decimal
    hourly_cost_rate: Decimal
    total_billable_amount: Decimal
    total_cost_amount: Decimal
    is_billable: bool
    is_invoiced: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectProfitabilityResponse(BaseModel):
    project_id: int
    project_name: str
    project_code: str
    billing_type: str
    status: str
    budget_amount: Decimal
    total_billable_hours: Decimal
    total_non_billable_hours: Decimal
    total_hours_logged: Decimal
    total_invoiced_revenue: Decimal
    unbilled_revenue: Decimal
    total_recognized_revenue: Decimal
    total_labor_cost: Decimal
    total_direct_expenses: Decimal
    total_project_cost: Decimal
    gross_profit: Decimal
    gross_margin_pct: Decimal
    budget_consumed_pct: Decimal

class ProjectResponse(ProjectBase):
    id: int
    entity_id: int
    customer_name: Optional[str] = None
    created_at: datetime
    tasks_count: int = 0
    total_hours_logged: Decimal = Decimal("0.00")
    profitability: Optional[ProjectProfitabilityResponse] = None

    class Config:
        from_attributes = True
