from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.sales import Customer
from app.models.projects import (
    Project, ProjectTask, Timesheet, ProjectBillingType, ProjectStatus, TaskStatus
)
from app.schemas.projects import (
    ProjectCreate, ProjectResponse, ProjectTaskCreate, ProjectTaskResponse,
    ProjectCreate, ProjectResponse, ProjectTaskBase, ProjectTaskCreate, ProjectTaskResponse,
    TimesheetCreate, TimesheetResponse, ProjectProfitabilityResponse
)
from app.services.project_engine import calculate_project_profitability
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access, log_audit
)

router = APIRouter()

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    entity_id: int = Query(...),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    query = db.query(Project).filter(Project.entity_id == entity_id)
    if status_filter and status_filter != "ALL":
        query = query.filter(Project.status == status_filter)

    projects = query.order_by(desc(Project.created_at)).all()
    results = []
    for p in projects:
        cust_name = p.customer.name if p.customer else None
        tasks_cnt = len(p.tasks)
        hrs = sum((ts.hours for ts in p.timesheets), Decimal("0.00"))
        
        prof = None
        try:
            prof = calculate_project_profitability(p.id, db)
        except Exception:
            pass

        results.append(ProjectResponse(
            id=p.id,
            entity_id=p.entity_id,
            customer_id=p.customer_id,
            customer_name=cust_name,
            name=p.name,
            code=p.code,
            description=p.description,
            billing_type=p.billing_type,
            status=p.status,
            budget_amount=p.budget_amount,
            default_hourly_rate=p.default_hourly_rate,
            start_date=p.start_date,
            end_date=p.end_date,
            created_at=p.created_at,
            tasks_count=tasks_cnt,
            total_hours_logged=hrs,
            profitability=prof
        ))
    return results

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(data.entity_id, current_user, db)
    
    # Check duplicate code
    existing = db.query(Project).filter(
        Project.entity_id == data.entity_id,
        Project.code == data.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with code '{data.code}' already exists in this entity"
        )

    project = Project(
        entity_id=data.entity_id,
        customer_id=data.customer_id,
        name=data.name,
        code=data.code,
        description=data.description,
        billing_type=data.billing_type,
        status=data.status,
        budget_amount=data.budget_amount,
        default_hourly_rate=data.default_hourly_rate,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    log_audit(
        db,
        action="CREATE_PROJECT",
        record_type="PROJECT",
        record_id=project.id,
        user=current_user,
        entity_id=data.entity_id,
        details={"code": project.code, "name": project.name}
    )

    prof = calculate_project_profitability(project.id, db)
    return ProjectResponse(
        id=project.id,
        entity_id=project.entity_id,
        customer_id=project.customer_id,
        customer_name=project.customer.name if project.customer else None,
        name=project.name,
        code=project.code,
        description=project.description,
        billing_type=project.billing_type,
        status=project.status,
        budget_amount=project.budget_amount,
        default_hourly_rate=project.default_hourly_rate,
        start_date=project.start_date,
        end_date=project.end_date,
        created_at=project.created_at,
        tasks_count=0,
        total_hours_logged=Decimal("0.00"),
        profitability=prof
    )

@router.get("/{project_id}/profitability", response_model=ProjectProfitabilityResponse)
def get_project_profitability(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    verify_entity_access(project.entity_id, current_user, db)
    return calculate_project_profitability(project_id, db)

@router.post("/{project_id}/tasks", response_model=ProjectTaskResponse, status_code=status.HTTP_201_CREATED)
def create_project_task(
    project_id: int,
    data: ProjectTaskBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    verify_entity_access(project.entity_id, current_user, db)

    task = ProjectTask(
        project_id=project_id,
        name=data.name,
        description=data.description,
        estimated_hours=data.estimated_hours,
        status=data.status
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/{project_id}/timesheets", response_model=List[TimesheetResponse])
def get_project_timesheets(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    verify_entity_access(project.entity_id, current_user, db)

    timesheets = db.query(Timesheet).filter(
        Timesheet.project_id == project_id
    ).order_by(desc(Timesheet.entry_date)).all()

    results = []
    for ts in timesheets:
        u_name = f"{ts.user.first_name} {ts.user.last_name}" if ts.user else "Staff"
        bill_tot = ts.hours * ts.hourly_billable_rate
        cost_tot = ts.hours * ts.hourly_cost_rate
        results.append(TimesheetResponse(
            id=ts.id,
            entity_id=ts.entity_id,
            project_id=ts.project_id,
            task_id=ts.task_id,
            user_id=ts.user_id,
            user_name=u_name,
            entry_date=ts.entry_date,
            hours=ts.hours,
            hourly_billable_rate=ts.hourly_billable_rate,
            hourly_cost_rate=ts.hourly_cost_rate,
            total_billable_amount=bill_tot,
            total_cost_amount=cost_tot,
            is_billable=ts.is_billable,
            is_invoiced=ts.is_invoiced,
            notes=ts.notes,
            created_at=ts.created_at
        ))
    return results

@router.post("/timesheets", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def log_timesheet(
    data: TimesheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(data.entity_id, current_user, db)
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bill_rate = data.hourly_billable_rate if data.hourly_billable_rate is not None else project.default_hourly_rate
    cost_rate = data.hourly_cost_rate if data.hourly_cost_rate is not None else Decimal("25.00")

    ts = Timesheet(
        entity_id=data.entity_id,
        project_id=data.project_id,
        task_id=data.task_id,
        user_id=current_user.id,
        entry_date=data.entry_date,
        hours=data.hours,
        hourly_billable_rate=bill_rate,
        hourly_cost_rate=cost_rate,
        is_billable=data.is_billable,
        notes=data.notes
    )
    db.add(ts)
    db.commit()
    db.refresh(ts)

    u_name = f"{current_user.first_name} {current_user.last_name}"
    return TimesheetResponse(
        id=ts.id,
        entity_id=ts.entity_id,
        project_id=ts.project_id,
        task_id=ts.task_id,
        user_id=ts.user_id,
        user_name=u_name,
        entry_date=ts.entry_date,
        hours=ts.hours,
        hourly_billable_rate=ts.hourly_billable_rate,
        hourly_cost_rate=ts.hourly_cost_rate,
        total_billable_amount=ts.hours * ts.hourly_billable_rate,
        total_cost_amount=ts.hours * ts.hourly_cost_rate,
        is_billable=ts.is_billable,
        is_invoiced=ts.is_invoiced,
        notes=ts.notes,
        created_at=ts.created_at
    )
