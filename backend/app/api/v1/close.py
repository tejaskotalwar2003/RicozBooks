from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database.session import get_db
from app.api.deps import get_current_user, require_roles, verify_entity_access, get_tenant_entity_ids
from app.models.user import User
from app.models.company import FiscalPeriod, Entity
from app.models.close import ClosePeriod, CloseTask, CloseStatus
from app.models.audit import AuditLog
from app.schemas.close import (
    ClosePeriodResponse,
    ClosePeriodDetailResponse,
    ClosePeriodCreate,
    CloseTaskResponse,
    CloseTaskCreate,
    CloseTaskUpdate,
    PeriodLockRequest,
    PeriodReopenRequest
)

router = APIRouter()

def recalculate_period_progress(db: Session, period: ClosePeriod) -> ClosePeriod:
    tasks = db.query(CloseTask).filter(CloseTask.close_period_id == period.id).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == CloseStatus.APPROVED)
    
    period.completion_percentage = int(round((completed / total) * 100)) if total > 0 else 0
    if period.status != "CLOSED":
        if total > 0 and completed == total:
            period.status = "READY_FOR_REVIEW"
        elif completed > 0:
            period.status = "IN_PROGRESS"
        else:
            period.status = "NOT_STARTED"
    
    db.commit()
    db.refresh(period)
    return period

@router.get("/periods", response_model=List[ClosePeriodResponse])
def get_close_periods(
    entity_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ClosePeriod)
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(ClosePeriod.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(ClosePeriod.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(ClosePeriod.entity_id == current_user.default_entity_id)
    
    periods = query.order_by(desc(ClosePeriod.created_at)).all()
    
    # Enrich with counts and update completion %
    results = []
    for p in periods:
        recalculate_period_progress(db, p)
        total_tasks = db.query(CloseTask).filter(CloseTask.close_period_id == p.id).count()
        completed_tasks = db.query(CloseTask).filter(
            CloseTask.close_period_id == p.id,
            CloseTask.status == CloseStatus.APPROVED
        ).count()
        
        p_dict = ClosePeriodResponse.from_orm(p)
        p_dict.total_tasks = total_tasks
        p_dict.completed_tasks = completed_tasks
        results.append(p_dict)
        
    return results

@router.get("/periods/{period_id}", response_model=ClosePeriodDetailResponse)
def get_close_period_detail(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    period = db.query(ClosePeriod).filter(ClosePeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Close period not found")
    verify_entity_access(period.entity_id, current_user, db)
        
    recalculate_period_progress(db, period)
    tasks = db.query(CloseTask).filter(CloseTask.close_period_id == period.id).order_by(CloseTask.id).all()
    
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == CloseStatus.APPROVED)
    
    task_responses = []
    for t in tasks:
        t_res = CloseTaskResponse.from_orm(t)
        if t.assigned_to_id:
            user = db.query(User).filter(User.id == t.assigned_to_id).first()
            if user:
                t_res.assigned_to_name = f"{user.first_name} {user.last_name}"
        if t.reviewer_id:
            rev = db.query(User).filter(User.id == t.reviewer_id).first()
            if rev:
                t_res.reviewer_name = f"{rev.first_name} {rev.last_name}"
        task_responses.append(t_res)
        
    res = ClosePeriodDetailResponse.from_orm(period)
    res.total_tasks = total_tasks
    res.completed_tasks = completed_tasks
    res.tasks = task_responses
    return res

@router.post("/periods", response_model=ClosePeriodDetailResponse, status_code=status.HTTP_201_CREATED)
def create_close_period(
    payload: ClosePeriodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "ACCOUNTANT"]))
):
    entity = verify_entity_access(payload.entity_id, current_user, db)
        
    existing = db.query(ClosePeriod).filter(
        ClosePeriod.entity_id == payload.entity_id,
        ClosePeriod.fiscal_year == payload.fiscal_year,
        ClosePeriod.month == payload.month
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Close period already exists for this fiscal period")
        
    period = ClosePeriod(
        entity_id=payload.entity_id,
        period_name=payload.period_name,
        fiscal_year=payload.fiscal_year,
        month=payload.month,
        status="IN_PROGRESS",
        completion_percentage=0,
        target_date=payload.target_date
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    
    # Seed standard statutory tasks
    default_tasks = [
        ("Bank Reconciliation", "Reconcile primary operating bank accounts with ledger cash balances", date.today()),
        ("Accrued Expenses & Amortization", "Calculate and post monthly accruals for utilities, SaaS, and unbilled vendor invoices", date.today()),
        ("Fixed Asset Depreciation", "Run and post fixed asset straight-line monthly depreciation schedules", date.today()),
        ("SaaS MRR Revenue Recognition", "Audit and verify monthly recurring software subscription revenue recognition", date.today()),
        ("Intercompany Reconciliation", "Reconcile intercompany transfers and due-to/due-from balances across subsidiaries", date.today()),
        ("GST 2B Input Tax Reconciliation", "Reconcile GST 2B tax credits with eligible input purchase entries", date.today()),
        ("Supervisory Journal Review", "Complete four-eyes maker-checker supervisory review of submitted journal vouchers", date.today()),
        ("Management Final Approval & Lock", "CFO executive authorization and permanent period ledger lock", payload.target_date),
    ]
    
    for name, desc_text, d_date in default_tasks:
        task = CloseTask(
            close_period_id=period.id,
            task_name=name,
            description=desc_text,
            due_date=d_date,
            status=CloseStatus.NOT_STARTED,
            notes="Standard statutory close procedure"
        )
        db.add(task)
        
    db.commit()
    
    # Audit log
    audit = AuditLog(
        action="CLOSE_PERIOD_INITIALIZED",
        record_type="ClosePeriod",
        record_id=str(period.id),
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=payload.entity_id,
        details=f"Initialized close period '{period.period_name}' with standard 8 statutory checklist tasks."
    )
    db.add(audit)
    db.commit()
    
    return get_close_period_detail(period.id, db, current_user)

@router.put("/tasks/{task_id}", response_model=CloseTaskResponse)
def update_close_task(
    task_id: int,
    payload: CloseTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(CloseTask).filter(CloseTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Close task not found")
        
    period = db.query(ClosePeriod).filter(ClosePeriod.id == task.close_period_id).first()
    if period and period.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Cannot modify tasks in a closed and locked accounting period.")
        
    # Update fields
    if payload.task_name is not None:
        task.task_name = payload.task_name
    if payload.description is not None:
        task.description = payload.description
    if payload.notes is not None:
        task.notes = payload.notes
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.assigned_to_id is not None:
        task.assigned_to_id = payload.assigned_to_id
    if payload.reviewer_id is not None:
        task.reviewer_id = payload.reviewer_id
        
    if payload.status is not None:
        task.status = payload.status
        if payload.status == CloseStatus.APPROVED:
            task.completed_at = datetime.utcnow()
            task.reviewer_id = current_user.id
        elif payload.status in [CloseStatus.IN_PROGRESS, CloseStatus.READY_FOR_REVIEW]:
            task.assigned_to_id = current_user.id
        elif payload.status == CloseStatus.NOT_STARTED:
            task.completed_at = None
            
    db.commit()
    db.refresh(task)
    
    # Recalculate parent progress
    recalculate_period_progress(db, period)
    
    # Build response
    res = CloseTaskResponse.from_orm(task)
    if task.assigned_to_id:
        u = db.query(User).filter(User.id == task.assigned_to_id).first()
        if u:
            res.assigned_to_name = f"{u.first_name} {u.last_name}"
    if task.reviewer_id:
        r = db.query(User).filter(User.id == task.reviewer_id).first()
        if r:
            res.reviewer_name = f"{r.first_name} {r.last_name}"
            
    return res

@router.post("/periods/{period_id}/lock", response_model=ClosePeriodResponse)
def lock_close_period(
    period_id: int,
    payload: PeriodLockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"]))
):
    period = db.query(ClosePeriod).filter(ClosePeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Close period not found")
    verify_entity_access(period.entity_id, current_user, db)
        
    if period.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Period is already locked and closed.")
        
    # Mark period as CLOSED
    period.status = "CLOSED"
    period.closed_at = datetime.utcnow()
    period.closed_by_id = current_user.id
    period.completion_percentage = 100
    
    # Mark corresponding FiscalPeriod as permanently closed
    fps = db.query(FiscalPeriod).filter(
        FiscalPeriod.entity_id == period.entity_id
    ).all()
    for fp in fps:
        if fp.start_date.month == period.month or fp.period_number == period.month:
            fp.is_closed = True
        
    db.commit()
    db.refresh(period)
    
    # Audit log
    audit = AuditLog(
        action="PERIOD_LOCKED",
        record_type="ClosePeriod",
        record_id=str(period.id),
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=period.entity_id,
        details=f"CFO finalized and locked accounting period '{period.period_name}'. Hard ledger lock active. Remarks: {payload.notes or 'None'}"
    )
    db.add(audit)
    db.commit()
    
    total = db.query(CloseTask).filter(CloseTask.close_period_id == period.id).count()
    completed = db.query(CloseTask).filter(
        CloseTask.close_period_id == period.id,
        CloseTask.status == CloseStatus.APPROVED
    ).count()
    
    res = ClosePeriodResponse.from_orm(period)
    res.total_tasks = total
    res.completed_tasks = completed
    return res

@router.post("/periods/{period_id}/reopen", response_model=ClosePeriodResponse)
def reopen_close_period(
    period_id: int,
    payload: PeriodReopenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"]))
):
    period = db.query(ClosePeriod).filter(ClosePeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Close period not found")
    verify_entity_access(period.entity_id, current_user, db)
        
    if period.status != "CLOSED":
        raise HTTPException(status_code=400, detail="Period is not currently closed.")
        
    # Reopen period
    period.status = "IN_PROGRESS"
    period.closed_at = None
    period.closed_by_id = None
    
    # Unlock FiscalPeriod
    fps = db.query(FiscalPeriod).filter(
        FiscalPeriod.entity_id == period.entity_id,
        FiscalPeriod.is_closed == True
    ).all()
    for fp in fps:
        if fp.start_date.month == period.month or fp.period_number == period.month:
            fp.is_closed = False
        
    recalculate_period_progress(db, period)
    db.commit()
    db.refresh(period)
    
    # Audit log
    audit = AuditLog(
        action="PERIOD_REOPENED",
        record_type="ClosePeriod",
        record_id=str(period.id),
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=period.entity_id,
        details=f"Emergency period unlock performed on '{period.period_name}'. Reason: {payload.reason}"
    )
    db.add(audit)
    db.commit()
    
    total = db.query(CloseTask).filter(CloseTask.close_period_id == period.id).count()
    completed = db.query(CloseTask).filter(
        CloseTask.close_period_id == period.id,
        CloseTask.status == CloseStatus.APPROVED
    ).count()
    
    res = ClosePeriodResponse.from_orm(period)
    res.total_tasks = total
    res.completed_tasks = completed
    return res
