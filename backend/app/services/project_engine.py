from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.projects import Project, ProjectTask, Timesheet, ProjectBillingType, ProjectStatus
from app.models.sales import Customer, Invoice
from app.models.expenses import Expense
from app.schemas.projects import ProjectProfitabilityResponse

def calculate_project_profitability(project_id: int, db: Session) -> ProjectProfitabilityResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with ID {project_id} not found")

    timesheets = db.query(Timesheet).filter(Timesheet.project_id == project_id).all()
    
    total_billable_hours = Decimal("0.00")
    total_non_billable_hours = Decimal("0.00")
    total_labor_cost = Decimal("0.00")
    unbilled_revenue = Decimal("0.00")
    invoiced_revenue = Decimal("0.00")

    for ts in timesheets:
        hrs = Decimal(str(ts.hours or 0))
        cost_rate = Decimal(str(ts.hourly_cost_rate or 0))
        bill_rate = Decimal(str(ts.hourly_billable_rate or 0))

        total_labor_cost += hrs * cost_rate

        if ts.is_billable:
            total_billable_hours += hrs
            if ts.is_invoiced:
                invoiced_revenue += hrs * bill_rate
            else:
                unbilled_revenue += hrs * bill_rate
        else:
            total_non_billable_hours += hrs

    # If FIXED_COST billing, the recognized revenue is either the fixed budget or invoiced amount
    if project.billing_type == ProjectBillingType.FIXED_COST.value:
        total_recognized_revenue = Decimal(str(project.budget_amount or 0))
    else:
        total_recognized_revenue = invoiced_revenue + unbilled_revenue

    total_hours_logged = total_billable_hours + total_non_billable_hours
    total_direct_expenses = Decimal("0.00")  # can be extended with project expenses
    total_project_cost = total_labor_cost + total_direct_expenses

    gross_profit = total_recognized_revenue - total_project_cost
    gross_margin_pct = Decimal("0.00")
    if total_recognized_revenue > 0:
        gross_margin_pct = round((gross_profit / total_recognized_revenue) * Decimal("100.00"), 2)

    budget_amount = Decimal(str(project.budget_amount or 0))
    budget_consumed_pct = Decimal("0.00")
    if budget_amount > 0:
        budget_consumed_pct = round((total_project_cost / budget_amount) * Decimal("100.00"), 2)

    return ProjectProfitabilityResponse(
        project_id=project.id,
        project_name=project.name,
        project_code=project.code,
        billing_type=project.billing_type,
        status=project.status,
        budget_amount=budget_amount,
        total_billable_hours=total_billable_hours,
        total_non_billable_hours=total_non_billable_hours,
        total_hours_logged=total_hours_logged,
        total_invoiced_revenue=invoiced_revenue,
        unbilled_revenue=unbilled_revenue,
        total_recognized_revenue=total_recognized_revenue,
        total_labor_cost=total_labor_cost,
        total_direct_expenses=total_direct_expenses,
        total_project_cost=total_project_cost,
        gross_profit=gross_profit,
        gross_margin_pct=gross_margin_pct,
        budget_consumed_pct=budget_consumed_pct
    )
