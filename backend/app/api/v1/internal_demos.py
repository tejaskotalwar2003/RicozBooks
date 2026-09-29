from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_

from app.database.session import get_db
from app.core.security import verify_password, create_access_token, decode_access_token
from app.models.demo import DemoAdminUser, DemoRequest, DemoScheduleHistory
from app.schemas.demo import (
    DemoRequestPublicCreate,
    DemoRequestPublicResponse,
    InternalLoginRequest,
    InternalTokenResponse,
    InternalUserResponse,
    DemoRequestDetailResponse,
    DemoScheduleHistoryResponse,
    DemoListResponse,
    DemoStatusUpdateRequest,
    DemoScheduleRequest,
    DemoRescheduleRequest,
    DemoAssignRequest,
    DemoUpdateRequest,
    DashboardStatsResponse
)

router = APIRouter()

# -------------------------------------------------------------
# Dependency: Get Current Internal User
# -------------------------------------------------------------
def get_current_internal_user(
    request: Request,
    db: Session = Depends(get_db)
) -> DemoAdminUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired internal credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise credentials_exception

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("internal_user_id") or payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(DemoAdminUser).filter(DemoAdminUser.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def generate_reference_code(db: Session) -> str:
    """Generate a unique reference code such as DEMO-482731"""
    while True:
        code = f"DEMO-{random.randint(100000, 999999)}"
        exists = db.query(DemoRequest).filter(DemoRequest.reference_code == code).first()
        if not exists:
            return code


def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def serialize_demo(demo: DemoRequest) -> DemoRequestDetailResponse:
    history_items = [
        DemoScheduleHistoryResponse(
            id=h.id,
            demo_request_id=h.demo_request_id,
            old_date=h.old_date,
            old_time=h.old_time,
            new_date=h.new_date,
            new_time=h.new_time,
            changed_by_name=h.changed_by_user.name if h.changed_by_user else None,
            reason=h.reason,
            created_at=h.created_at
        )
        for h in demo.history
    ]
    return DemoRequestDetailResponse(
        id=demo.id,
        reference_code=demo.reference_code,
        full_name=demo.full_name,
        work_email=demo.work_email,
        phone=demo.phone,
        company=demo.company,
        role=demo.role,
        entities_count=demo.entities_count or "1",
        interest_area=demo.interest_area or "Complete Platform Demo",
        preferred_date=demo.preferred_date,
        preferred_time=demo.preferred_time,
        confirmed_date=demo.confirmed_date,
        confirmed_time=demo.confirmed_time,
        duration=demo.duration,
        meeting_link=demo.meeting_link,
        status=demo.status,
        assigned_to=demo.assigned_to,
        assigned_user_name=demo.assigned_user.name if demo.assigned_user else None,
        internal_notes=demo.internal_notes,
        created_at=demo.created_at,
        updated_at=demo.updated_at,
        history=history_items
    )


# =============================================================
# 1. PUBLIC DEMO BOOKING (No Customer Account Needed)
# =============================================================
@router.post("/demos", response_model=DemoRequestPublicResponse)
def submit_public_demo_request(
    lead_in: DemoRequestPublicCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public customer demo booking endpoint.
    Saves directly to PostgreSQL and returns a unique DEMO-XXXXXX reference code.
    """
    ref_code = generate_reference_code(db)
    client_ip = request.client.host if request.client else None
    pref_date = parse_date(lead_in.preferred_date)

    demo = DemoRequest(
        reference_code=ref_code,
        full_name=lead_in.full_name.strip(),
        work_email=lead_in.work_email.strip().lower(),
        phone=lead_in.phone.strip(),
        company=lead_in.company.strip(),
        role=lead_in.role.strip(),
        entities_count=lead_in.entities_count or "1",
        interest_area=lead_in.interest_area or "Complete Platform Demo",
        preferred_date=pref_date,
        preferred_time=lead_in.preferred_time,
        status="NEW",
        ip_address=client_ip
    )
    db.add(demo)
    db.commit()
    db.refresh(demo)

    return DemoRequestPublicResponse(
        reference_code=ref_code,
        status="NEW",
        message="Thank you for your interest in RicozBooks. Our team will review your request and confirm the demo schedule.",
        customer_name=demo.full_name,
        company=demo.company,
        preferred_date=lead_in.preferred_date,
        preferred_time=lead_in.preferred_time
    )


# =============================================================
# 2. INTERNAL AUTHENTICATION
# =============================================================
@router.post("/internal/auth/login", response_model=InternalTokenResponse)
def internal_login(
    login_data: InternalLoginRequest,
    db: Session = Depends(get_db)
):
    """Internal team login. Returns JWT token."""
    user = db.query(DemoAdminUser).filter(DemoAdminUser.email == login_data.email.strip().lower()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Internal account is deactivated"
        )

    # 12 hours token for internal team session
    token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(hours=12)
    )

    assigned_count = db.query(DemoRequest).filter(
        DemoRequest.assigned_to == user.id,
        DemoRequest.status.notin_(["COMPLETED", "CANCELLED", "REJECTED"])
    ).count()

    return InternalTokenResponse(
        access_token=token,
        token_type="bearer",
        user=InternalUserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            assigned_count=assigned_count
        )
    )


@router.post("/internal/auth/logout")
def internal_logout(current_user: DemoAdminUser = Depends(get_current_internal_user)):
    """Acknowledge logout for internal user."""
    return {"message": "Logged out successfully"}


@router.get("/internal/auth/me", response_model=InternalUserResponse)
def get_internal_me(
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Get logged in internal user details and current active load."""
    assigned_count = db.query(DemoRequest).filter(
        DemoRequest.assigned_to == current_user.id,
        DemoRequest.status.notin_(["COMPLETED", "CANCELLED", "REJECTED"])
    ).count()
    return InternalUserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        assigned_count=assigned_count
    )


# =============================================================
# 3. INTERNAL DASHBOARD STATS & OVERVIEWS
# =============================================================
@router.get("/internal/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Aggregate live metrics directly from PostgreSQL."""
    today = date.today()

    new_requests = db.query(DemoRequest).filter(DemoRequest.status == "NEW").count()
    pending_requests = db.query(DemoRequest).filter(DemoRequest.status.in_(["NEW", "UNDER REVIEW"])).count()
    scheduled_demos = db.query(DemoRequest).filter(DemoRequest.status.in_(["SCHEDULED", "CONFIRMED"])).count()
    today_demos = db.query(DemoRequest).filter(DemoRequest.confirmed_date == today).count()
    completed_demos = db.query(DemoRequest).filter(DemoRequest.status == "COMPLETED").count()
    cancelled_demos = db.query(DemoRequest).filter(DemoRequest.status.in_(["CANCELLED", "REJECTED"])).count()
    total_requests = db.query(DemoRequest).count()

    # Status distribution
    status_counts = db.query(
        DemoRequest.status, func.count(DemoRequest.id)
    ).group_by(DemoRequest.status).all()
    status_distribution = {s: count for s, count in status_counts}

    # Requests over past 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
    daily_stats = []
    for i in range(7):
        day_date = (seven_days_ago + timedelta(days=i)).date()
        start_dt = datetime.combine(day_date, datetime.min.time())
        end_dt = datetime.combine(day_date, datetime.max.time())
        cnt = db.query(DemoRequest).filter(DemoRequest.created_at >= start_dt, DemoRequest.created_at <= end_dt).count()
        daily_stats.append({
            "date": day_date.strftime("%b %d"),
            "count": cnt
        })

    return DashboardStatsResponse(
        new_requests=new_requests,
        pending_requests=pending_requests,
        scheduled_demos=scheduled_demos,
        today_demos=today_demos,
        completed_demos=completed_demos,
        cancelled_demos=cancelled_demos,
        total_requests=total_requests,
        status_distribution=status_distribution,
        requests_over_time=daily_stats
    )


@router.get("/internal/dashboard/recent-demos", response_model=List[DemoRequestDetailResponse])
def get_recent_demos(
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Top 5 most recent demo requests."""
    demos = db.query(DemoRequest).order_by(desc(DemoRequest.created_at)).limit(5).all()
    return [serialize_demo(d) for d in demos]


@router.get("/internal/dashboard/upcoming-demos", response_model=List[DemoRequestDetailResponse])
def get_upcoming_demos(
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Upcoming demos scheduled for today or future."""
    today = date.today()
    demos = db.query(DemoRequest).filter(
        DemoRequest.confirmed_date >= today,
        DemoRequest.status.in_(["SCHEDULED", "CONFIRMED", "RESCHEDULED"])
    ).order_by(asc(DemoRequest.confirmed_date)).limit(5).all()
    return [serialize_demo(d) for d in demos]


# =============================================================
# 4. DEMO REQUESTS TABLE & FILTERING
# =============================================================
@router.get("/internal/demos", response_model=DemoListResponse)
def list_demos(
    search: Optional[str] = Query(None, description="Search by ref, customer name, company, email, phone"),
    status: Optional[str] = Query(None, description="Filter by status"),
    interest_area: Optional[str] = Query(None, description="Filter by interest area"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned team member ID"),
    from_date: Optional[str] = Query(None, description="Filter requests from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Filter requests to date (YYYY-MM-DD)"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_dir: Optional[str] = Query("desc", description="Sort direction (asc/desc)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """List customer demo requests with search, filters, sorting, and pagination."""
    query = db.query(DemoRequest)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                DemoRequest.reference_code.ilike(term),
                DemoRequest.full_name.ilike(term),
                DemoRequest.company.ilike(term),
                DemoRequest.work_email.ilike(term),
                DemoRequest.phone.ilike(term)
            )
        )

    if status and status != "ALL":
        query = query.filter(DemoRequest.status == status.strip())

    if interest_area and interest_area != "ALL":
        query = query.filter(DemoRequest.interest_area == interest_area.strip())

    if assigned_to:
        query = query.filter(DemoRequest.assigned_to == assigned_to)

    if from_date:
        d = parse_date(from_date)
        if d:
            query = query.filter(DemoRequest.preferred_date >= d)

    if to_date:
        d = parse_date(to_date)
        if d:
            query = query.filter(DemoRequest.preferred_date <= d)

    # Sorting
    sort_column = getattr(DemoRequest, sort_by, DemoRequest.created_at)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return DemoListResponse(
        total=total,
        page=page,
        limit=limit,
        items=[serialize_demo(d) for d in items]
    )


# =============================================================
# 5. DEMO DETAILS & MANAGEMENT ACTIONS
# =============================================================
@router.get("/internal/demos/{id}", response_model=DemoRequestDetailResponse)
def get_demo_detail(
    id: int,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Get single demo request with complete scheduling history."""
    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")
    return serialize_demo(demo)


@router.patch("/internal/demos/{id}", response_model=DemoRequestDetailResponse)
def update_demo_fields(
    id: int,
    payload: DemoUpdateRequest,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Update general fields such as internal notes or meeting link."""
    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")

    if payload.internal_notes is not None:
        demo.internal_notes = payload.internal_notes
    if payload.meeting_link is not None:
        demo.meeting_link = payload.meeting_link
    if payload.phone is not None:
        demo.phone = payload.phone
    if payload.company is not None:
        demo.company = payload.company

    db.commit()
    db.refresh(demo)
    return serialize_demo(demo)


@router.patch("/internal/demos/{id}/status", response_model=DemoRequestDetailResponse)
def update_demo_status(
    id: int,
    payload: DemoStatusUpdateRequest,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Update demo status (NEW, UNDER REVIEW, SCHEDULED, CONFIRMED, COMPLETED, RESCHEDULED, CANCELLED, REJECTED)."""
    valid_statuses = [
        "NEW", "UNDER REVIEW", "SCHEDULED", "CONFIRMED", 
        "COMPLETED", "RESCHEDULED", "CANCELLED", "REJECTED"
    ]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")

    demo.status = payload.status
    db.commit()
    db.refresh(demo)
    return serialize_demo(demo)


@router.patch("/internal/demos/{id}/schedule", response_model=DemoRequestDetailResponse)
def schedule_demo(
    id: int,
    payload: DemoScheduleRequest,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """
    Schedule demo with confirmed date, time, duration, and meeting link.
    Automatically transitions status to SCHEDULED.
    """
    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")

    conf_date = parse_date(payload.confirmed_date)
    if not conf_date:
        raise HTTPException(status_code=400, detail="Invalid confirmed_date format. Use YYYY-MM-DD.")

    # Record history if date/time was previously set
    if demo.confirmed_date or demo.confirmed_time:
        history = DemoScheduleHistory(
            demo_request_id=demo.id,
            old_date=demo.confirmed_date,
            old_time=demo.confirmed_time,
            new_date=conf_date,
            new_time=payload.confirmed_time,
            changed_by=current_user.id,
            reason="Initial schedule confirmed"
        )
        db.add(history)

    demo.confirmed_date = conf_date
    demo.confirmed_time = payload.confirmed_time
    demo.duration = payload.duration or "45 mins"
    demo.status = "SCHEDULED"
    if payload.meeting_link:
        demo.meeting_link = payload.meeting_link
    if payload.assigned_to:
        demo.assigned_to = payload.assigned_to
    elif not demo.assigned_to:
        demo.assigned_to = current_user.id
    if payload.internal_notes:
        demo.internal_notes = payload.internal_notes

    db.commit()
    db.refresh(demo)
    return serialize_demo(demo)


@router.patch("/internal/demos/{id}/reschedule", response_model=DemoRequestDetailResponse)
def reschedule_demo(
    id: int,
    payload: DemoRescheduleRequest,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """
    Reschedule a demo to a new date and time.
    Logs previous schedule in demo_schedule_history and transitions status to RESCHEDULED.
    """
    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")

    new_d = parse_date(payload.new_date)
    if not new_d:
        raise HTTPException(status_code=400, detail="Invalid new_date format. Use YYYY-MM-DD.")

    # Log schedule change history
    history = DemoScheduleHistory(
        demo_request_id=demo.id,
        old_date=demo.confirmed_date or demo.preferred_date,
        old_time=demo.confirmed_time or demo.preferred_time,
        new_date=new_d,
        new_time=payload.new_time,
        changed_by=current_user.id,
        reason=payload.reason
    )
    db.add(history)

    demo.confirmed_date = new_d
    demo.confirmed_time = payload.new_time
    demo.status = "RESCHEDULED"
    if payload.meeting_link:
        demo.meeting_link = payload.meeting_link
    if payload.assigned_to:
        demo.assigned_to = payload.assigned_to

    db.commit()
    db.refresh(demo)
    return serialize_demo(demo)


@router.patch("/internal/demos/{id}/assign", response_model=DemoRequestDetailResponse)
def assign_demo(
    id: int,
    payload: DemoAssignRequest,
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """Assign demo request to a team member."""
    demo = db.query(DemoRequest).filter(DemoRequest.id == id).first()
    if not demo:
        raise HTTPException(status_code=404, detail="Demo request not found")

    assignee = db.query(DemoAdminUser).filter(DemoAdminUser.id == payload.assigned_to).first()
    if not assignee or not assignee.is_active:
        raise HTTPException(status_code=400, detail="Assignee not found or inactive")

    demo.assigned_to = assignee.id
    db.commit()
    db.refresh(demo)
    return serialize_demo(demo)


# =============================================================
# 6. INTERNAL TEAM MEMBERS
# =============================================================
@router.get("/internal/team", response_model=List[InternalUserResponse])
def get_internal_team(
    current_user: DemoAdminUser = Depends(get_current_internal_user),
    db: Session = Depends(get_db)
):
    """List team members and their active demo count."""
    users = db.query(DemoAdminUser).filter(DemoAdminUser.is_active == True).all()
    results = []
    for u in users:
        count = db.query(DemoRequest).filter(
            DemoRequest.assigned_to == u.id,
            DemoRequest.status.notin_(["COMPLETED", "CANCELLED", "REJECTED"])
        ).count()
        results.append(InternalUserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            assigned_count=count
        ))
    return results
