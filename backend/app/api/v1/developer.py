import secrets
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_, and_

from app.database.session import get_db
from app.models.user import User, Role, Permission, user_roles, UserSession
from app.models.department import Department
from app.models.company import Company, OrganizationInvitation, InvitationStatus
from app.models.audit import AuditLog
from app.api.deps import require_developer_admin, require_developer_or_dept_head, log_audit
from app.api.v1.tenants import build_invitation_url
from app.services.email_service import send_invitation_email
from app.schemas.developer import (
    DepartmentResponse,
    DepartmentHeadSummary,
    DepartmentMemberSummary,
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    AssignDepartmentHeadRequest,
    DashboardStatsResponse,
    CandidateUserResponse,
    UserDetailResponse,
    UserListResponse,
    UserDepartmentUpdateRequest,
    UserRoleUpdateRequest,
    DepartmentInvitationCreateRequest,
    InvitationDetailResponse,
    InvitationListResponse,
    PermissionItemResponse,
    RoleDetailResponse,
    RolePermissionMatrixResponse,
    RolePermissionsUpdateRequest,
    AuditLogItemResponse,
    AuditLogListResponse
)

router = APIRouter()


# -------------------------------------------------------------
# 1. Verification & Platform Status
# -------------------------------------------------------------

@router.get("/verify")
def verify_developer_access(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verifies that the current user has authenticated Developer / Super Admin privileges.
    Guarantees that unauthorized users cannot access Developer Console APIs.
    """
    role_names = [r.name for r in current_user.roles]
    return {
        "status": "authorized",
        "verified": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_superuser": True,
            "roles": role_names,
            "job_title": current_user.job_title
        },
        "console": "RicozBooks Developer Console",
        "version": "1.0.0"
    }


@router.get("/status")
def get_platform_status(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Platform health and status indicator for Developer Console.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "platform": "RicozBooks Enterprise Platform",
        "environment": "production" if "postgresql" in str(db.bind.url) else "development",
        "database": db_status,
        "security": {
            "rbac_mode": "enforced",
            "developer_console_access": "restricted",
            "portal_separation": "active"
        }
    }


# -------------------------------------------------------------
# 2. Real Database-Backed Dashboard Metrics
# -------------------------------------------------------------

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Calculates verified live platform statistics directly from database records.
    Never uses hardcoded or fabricated numbers.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    suspended_users = db.query(func.count(User.id)).filter(User.is_active == False).scalar() or 0

    total_departments = db.query(func.count(Department.id)).scalar() or 0
    active_departments = db.query(func.count(Department.id)).filter(Department.is_active == True).scalar() or 0

    total_department_members = db.query(func.count(User.id)).filter(
        User.department_id.isnot(None),
        User.is_active == True
    ).scalar() or 0

    assigned_heads_count = db.query(func.count(Department.id)).filter(
        Department.head_user_id.isnot(None),
        Department.is_active == True
    ).scalar() or 0

    unassigned_heads_count = db.query(func.count(Department.id)).filter(
        Department.head_user_id.is_(None),
        Department.is_active == True
    ).scalar() or 0

    # Pending tenant/platform invitations
    try:
        pending_invitations = db.query(func.count(OrganizationInvitation.id)).filter(
            OrganizationInvitation.status == InvitationStatus.PENDING
        ).scalar() or 0
    except Exception:
        pending_invitations = 0

    platform_health = {
        "api_status": "online",
        "database_status": db_status,
        "security_policy": "RBAC Enforced",
        "timestamp": datetime.utcnow().isoformat()
    }

    return DashboardStatsResponse(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        total_departments=total_departments,
        active_departments=active_departments,
        total_department_members=total_department_members,
        assigned_heads_count=assigned_heads_count,
        unassigned_heads_count=unassigned_heads_count,
        pending_invitations=pending_invitations,
        platform_health=platform_health
    )


# -------------------------------------------------------------
# 3. Department Management Endpoints
# -------------------------------------------------------------

def _build_department_response(dept: Department, db: Session) -> DepartmentResponse:
    member_count = db.query(func.count(User.id)).filter(User.department_id == dept.id).scalar() or 0
    active_member_count = db.query(func.count(User.id)).filter(
        User.department_id == dept.id,
        User.is_active == True
    ).scalar() or 0

    head_summary = None
    if dept.head_user_id:
        head_user = db.query(User).filter(User.id == dept.head_user_id).first()
        if head_user:
            head_summary = DepartmentHeadSummary(
                id=head_user.id,
                email=head_user.email,
                full_name=head_user.full_name,
                job_title=head_user.job_title
            )

    return DepartmentResponse(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        description=dept.description,
        head_user_id=dept.head_user_id,
        head=head_summary,
        is_active=dept.is_active,
        member_count=member_count,
        active_member_count=active_member_count,
        created_at=dept.created_at,
        updated_at=dept.updated_at
    )


@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Lists all departments with live calculated member counts and department head details.
    """
    depts = db.query(Department).order_by(Department.id.asc()).all()
    return [_build_department_response(dept, db) for dept in depts]


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
def get_department_details(
    department_id: int,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details for a single department.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found."
        )
    return _build_department_response(dept, db)


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreateRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Creates a new department with unique stable code.
    """
    code_clean = dept_in.code.strip().upper()
    existing = db.query(Department).filter(Department.code == code_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with code '{code_clean}' already exists."
        )

    # Validate head_user_id if provided
    head_user = None
    if dept_in.head_user_id is not None:
        head_user = db.query(User).filter(User.id == dept_in.head_user_id).first()
        if not head_user or not head_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected department head user does not exist or is inactive."
            )

    dept = Department(
        code=code_clean,
        name=dept_in.name.strip(),
        description=dept_in.description.strip() if dept_in.description else None,
        head_user_id=dept_in.head_user_id,
        is_active=True
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    # If head user is assigned, ensure they belong to this department
    if head_user and head_user.department_id != dept.id:
        head_user.department_id = dept.id
        db.commit()

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")
    log_audit(
        db=db,
        action="DEPARTMENT_CREATED",
        record_type="Department",
        record_id=str(dept.id),
        user=current_user,
        details=f"Created department '{dept.name}' ({dept.code})",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_department_response(dept, db)


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_in: DepartmentUpdateRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Updates department name, description, or active status.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found."
        )

    changes = []
    if dept_in.name is not None and dept_in.name.strip():
        old_name = dept.name
        dept.name = dept_in.name.strip()
        changes.append(f"name: '{old_name}' -> '{dept.name}'")

    if dept_in.description is not None:
        dept.description = dept_in.description.strip() or None
        changes.append("description updated")

    if dept_in.is_active is not None and dept_in.is_active != dept.is_active:
        dept.is_active = dept_in.is_active
        changes.append(f"is_active: {dept.is_active}")

    dept.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dept)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")
    log_audit(
        db=db,
        action="DEPARTMENT_UPDATED",
        record_type="Department",
        record_id=str(dept.id),
        user=current_user,
        details=f"Updated department '{dept.code}': {', '.join(changes)}",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_department_response(dept, db)


@router.put("/departments/{department_id}/head", response_model=DepartmentResponse)
def assign_department_head(
    department_id: int,
    assign_in: AssignDepartmentHeadRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Assigns, replaces, or unassigns a Department Head.
    Validates user active status and maintains auditability.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found."
        )

    old_head_id = dept.head_user_id
    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    if assign_in.user_id is None:
        # Unassign head
        dept.head_user_id = None
        dept.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(dept)

        log_audit(
            db=db,
            action="DEPARTMENT_HEAD_UNASSIGNED",
            record_type="Department",
            record_id=str(dept.id),
            user=current_user,
            details=f"Unassigned head of department '{dept.name}' ({dept.code}). Previous head user ID: {old_head_id}",
            ip_address=client_ip,
            user_agent=ua_str[:255] if ua_str else None
        )
        return _build_department_response(dept, db)

    # Validate candidate user
    candidate = db.query(User).filter(User.id == assign_in.user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {assign_in.user_id} not found."
        )
    if not candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive user as Department Head."
        )

    dept.head_user_id = candidate.id
    dept.updated_at = datetime.utcnow()

    # Automatically set candidate's department_id to this department
    if candidate.department_id != dept.id:
        candidate.department_id = dept.id

    db.commit()
    db.refresh(dept)

    log_audit(
        db=db,
        action="DEPARTMENT_HEAD_ASSIGNED",
        record_type="Department",
        record_id=str(dept.id),
        user=current_user,
        details=f"Assigned user '{candidate.email}' (ID: {candidate.id}) as head of '{dept.name}' ({dept.code}).",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_department_response(dept, db)


@router.post("/departments/{department_id}/toggle-status", response_model=DepartmentResponse)
def toggle_department_status(
    department_id: int,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Safely toggles active/inactive status of a department.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found."
        )

    dept.is_active = not dept.is_active
    dept.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dept)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")
    status_label = "activated" if dept.is_active else "deactivated"
    log_audit(
        db=db,
        action="DEPARTMENT_STATUS_TOGGLED",
        record_type="Department",
        record_id=str(dept.id),
        user=current_user,
        details=f"Department '{dept.name}' ({dept.code}) {status_label}.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_department_response(dept, db)


@router.get("/departments/{department_id}/members", response_model=List[DepartmentMemberSummary])
def list_department_members(
    department_id: int,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Lists all members belonging to a department with their active status and whether they are the head.
    """
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found."
        )

    members = db.query(User).filter(User.department_id == department_id).order_by(User.first_name.asc()).all()
    
    return [
        DepartmentMemberSummary(
            id=m.id,
            email=m.email,
            full_name=m.full_name,
            job_title=m.job_title,
            is_active=m.is_active,
            is_head=(m.id == dept.head_user_id),
            created_at=m.created_at
        )
        for m in members
    ]


@router.get("/users/candidates", response_model=List[CandidateUserResponse])
def list_candidate_users(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Lists active users available for departmental assignment or head appointment.
    """
    users = db.query(User).filter(User.is_active == True).order_by(User.first_name.asc()).all()
    dept_map = {d.id: d.name for d in db.query(Department).all()}

    return [
        CandidateUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            job_title=u.job_title,
            department_id=u.department_id,
            department_name=dept_map.get(u.department_id),
            is_active=u.is_active
        )
        for u in users
    ]


# -------------------------------------------------------------
# 4. Helper Builders for User & Invitation Responses
# -------------------------------------------------------------

def _build_user_detail_response(user: User, db: Session) -> UserDetailResponse:
    dept = user.department
    dept_code = dept.code if dept else None
    dept_name = dept.name if dept else None
    is_head = bool(dept and dept.head_user_id == user.id)

    roles = [r.name for r in user.roles]

    comp_name = None
    if user.default_company_id:
        comp = db.query(Company).filter(Company.id == user.default_company_id).first()
        comp_name = comp.name if comp else None

    # Get latest session for last_active_at
    latest_session = db.query(UserSession).filter(
        UserSession.user_id == user.id
    ).order_by(UserSession.last_active_at.desc()).first()
    last_active = latest_session.last_active_at if latest_session else user.updated_at

    return UserDetailResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        full_name=user.full_name,
        job_title=user.job_title,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        department_id=user.department_id,
        department_code=dept_code,
        department_name=dept_name,
        is_department_head=is_head,
        roles=roles,
        default_company_id=user.default_company_id,
        default_company_name=comp_name,
        default_entity_id=user.default_entity_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_active_at=last_active
    )


def _build_invitation_detail_response(
    inv: OrganizationInvitation,
    request: Optional[Request],
    db: Session
) -> InvitationDetailResponse:
    dept = inv.department
    comp = inv.company
    invited_by_name = inv.invited_by.full_name if inv.invited_by else None
    invite_url = build_invitation_url(inv.token, request) if request else None

    status_val = inv.status.value if hasattr(inv.status, "value") else str(inv.status)

    return InvitationDetailResponse(
        id=inv.id,
        email=inv.email,
        role=inv.role,
        department_id=inv.department_id,
        department_code=dept.code if dept else None,
        department_name=dept.name if dept else None,
        is_department_head=inv.is_department_head,
        company_id=inv.company_id,
        company_name=comp.name if comp else None,
        status=status_val,
        invited_by_id=inv.invited_by_id,
        invited_by_name=invited_by_name,
        expires_at=inv.expires_at,
        accepted_at=inv.accepted_at,
        email_status=inv.email_status,
        email_sent_at=inv.email_sent_at,
        email_error=inv.email_error,
        created_at=inv.created_at,
        invite_url=invite_url
    )


# -------------------------------------------------------------
# 5. Central User Directory & Lifecycle Management
# -------------------------------------------------------------

@router.get("/users", response_model=UserListResponse)
def list_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    role: Optional[str] = Query(None, description="Filter by role name"),
    status: Optional[str] = Query(None, description="Filter by account status (active, suspended)"),
    is_head: Optional[bool] = Query(None, description="Filter department heads"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Searchable and filterable user directory for the Central Developer Console.
    Never exposes passwords, password hashes, or confidential security keys.
    """
    query = db.query(User)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.email).like(term),
                func.lower(User.first_name).like(term),
                func.lower(User.last_name).like(term),
                func.lower(User.job_title).like(term)
            )
        )

    if department_id is not None:
        query = query.filter(User.department_id == department_id)

    if status:
        status_clean = status.strip().lower()
        if status_clean in ("active", "true"):
            query = query.filter(User.is_active == True)
        elif status_clean in ("suspended", "inactive", "false"):
            query = query.filter(User.is_active == False)

    if role and role.strip():
        role_term = role.strip().upper()
        query = query.filter(User.roles.any(Role.name == role_term))

    if is_head is not None:
        headed_subq = db.query(Department.head_user_id).filter(Department.head_user_id.isnot(None))
        if is_head:
            query = query.filter(User.id.in_(headed_subq))
        else:
            query = query.filter(~User.id.in_(headed_subq))

    total = query.count()
    users = query.order_by(User.first_name.asc(), User.last_name.asc()).offset((page - 1) * limit).limit(limit).all()

    import math
    pages = max(1, math.ceil(total / limit))

    items = [_build_user_detail_response(u, db) for u in users]

    return UserListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
def get_user_detail(
    user_id: int,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves full profile details and assignments for a specific user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return _build_user_detail_response(user, db)


@router.put("/users/{user_id}/department", response_model=UserDetailResponse)
def update_user_department(
    user_id: int,
    payload: UserDepartmentUpdateRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Assigns or updates a user's department.
    If the user was the head of another department, their head status on the former department is safely detached.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    old_dept_id = user.department_id
    new_dept_id = payload.department_id

    new_dept = None
    if new_dept_id is not None:
        new_dept = db.query(Department).filter(Department.id == new_dept_id).first()
        if not new_dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target department with ID {new_dept_id} not found."
            )

    # If user was head of a department different from new_dept_id, clear old head status
    if old_dept_id and old_dept_id != new_dept_id:
        former_headed = db.query(Department).filter(
            Department.id == old_dept_id,
            Department.head_user_id == user.id
        ).first()
        if former_headed:
            former_headed.head_user_id = None
            former_headed.updated_at = datetime.utcnow()

    user.department_id = new_dept_id
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    dept_label = new_dept.name if new_dept else "None"
    log_audit(
        db=db,
        action="USER_DEPARTMENT_UPDATED",
        record_type="User",
        record_id=str(user.id),
        user=current_user,
        details=f"Assigned user '{user.email}' to department: {dept_label}.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_user_detail_response(user, db)


@router.put("/users/{user_id}/role", response_model=UserDetailResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Updates a user's role assignment.
    Prevents unauthorized role escalation and validates against system roles.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    target_role_name = payload.role.strip().upper()
    valid_roles = ["SUPER_ADMIN", "DEVELOPER", "DEPARTMENT_HEAD", "TEAM_MEMBER", "ORG_ADMIN", "MANAGER", "ACCOUNTANT", "REVIEWER", "ADMIN"]
    if target_role_name not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{target_role_name}'. Allowed roles: {valid_roles}"
        )

    # Security check: assigning SUPER_ADMIN requires the actor to be is_superuser
    if target_role_name == "SUPER_ADMIN" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an existing Platform Super Admin can grant the SUPER_ADMIN role."
        )

    role_obj = db.query(Role).filter(Role.name == target_role_name).first()
    if not role_obj:
        role_obj = Role(name=target_role_name, description=f"{target_role_name} Role")
        db.add(role_obj)
        db.flush()

    # If assigning SUPER_ADMIN, also update is_superuser flag
    if target_role_name in ("SUPER_ADMIN", "DEVELOPER"):
        user.is_superuser = True
    elif user.is_superuser and target_role_name not in ("SUPER_ADMIN", "DEVELOPER"):
        # Prevent demoting the last active superadmin
        active_superadmins = db.query(User).filter(User.is_superuser == True, User.is_active == True).count()
        if active_superadmins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active Super Admin account."
            )
        user.is_superuser = False

    # Replace roles with the target role
    user.roles = [role_obj]
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="USER_ROLE_UPDATED",
        record_type="User",
        record_id=str(user.id),
        user=current_user,
        details=f"Updated role for '{user.email}' to {target_role_name}.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_user_detail_response(user, db)


@router.post("/users/{user_id}/suspend", response_model=UserDetailResponse)
def suspend_user_account(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Suspends a user account.
    Prevents suspending the last active Super Admin.
    Immediately terminates all active sessions for this user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own administrative account."
        )

    if user.is_superuser:
        active_superadmins = db.query(User).filter(
            User.is_superuser == True,
            User.is_active == True
        ).count()
        if active_superadmins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot suspend the last active Super Admin account."
            )

    user.is_active = False
    user.updated_at = datetime.utcnow()

    # Invalidate active sessions
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_active": False})

    db.commit()
    db.refresh(user)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="ACCOUNT_SUSPENDED",
        record_type="User",
        record_id=str(user.id),
        user=current_user,
        details=f"Account '{user.email}' was suspended by {current_user.email}.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_user_detail_response(user, db)


@router.post("/users/{user_id}/reactivate", response_model=UserDetailResponse)
def reactivate_user_account(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Reactivates a suspended user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    user.is_active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="ACCOUNT_REACTIVATED",
        record_type="User",
        record_id=str(user.id),
        user=current_user,
        details=f"Account '{user.email}' was reactivated by {current_user.email}.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_user_detail_response(user, db)


# -------------------------------------------------------------
# 6. Secure Departmental & Platform Invitation Management
# -------------------------------------------------------------

@router.get("/invitations", response_model=InvitationListResponse)
def list_invitations(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, ACCEPTED, EXPIRED, REVOKED)"),
    search: Optional[str] = Query(None, description="Search by recipient email"),
    request: Request = None,
    current_user: User = Depends(require_developer_or_dept_head),
    db: Session = Depends(get_db)
):
    """
    Lists invitations.
    Platform Super Admins can view all invitations across all departments.
    Department Heads are strictly scoped to invitations within their authorized departments.
    """
    is_dev = bool(current_user.is_superuser) or any(r.name in ["SUPER_ADMIN", "DEVELOPER"] for r in current_user.roles)

    query = db.query(OrganizationInvitation)

    if not is_dev:
        # Caller is a department head: strictly limit to their departments
        headed_depts = db.query(Department.id).filter(
            Department.head_user_id == current_user.id,
            Department.is_active == True
        ).all()
        headed_dept_ids = [d[0] for d in headed_depts]
        if not headed_dept_ids:
            return InvitationListResponse(items=[], total=0)
        query = query.filter(OrganizationInvitation.department_id.in_(headed_dept_ids))
    elif department_id is not None:
        query = query.filter(OrganizationInvitation.department_id == department_id)

    if status and status.strip():
        status_clean = status.strip().upper()
        query = query.filter(OrganizationInvitation.status == status_clean)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(func.lower(OrganizationInvitation.email).like(term))

    total = query.count()
    invs = query.order_by(OrganizationInvitation.created_at.desc()).all()

    items = [_build_invitation_detail_response(inv, request, db) for inv in invs]
    return InvitationListResponse(items=items, total=total)


@router.post("/invitations", response_model=InvitationDetailResponse, status_code=status.HTTP_201_CREATED)
def create_department_invitation(
    payload: DepartmentInvitationCreateRequest,
    request: Request,
    current_user: User = Depends(require_developer_or_dept_head),
    db: Session = Depends(get_db)
):
    """
    Creates an invitation for a department head or department member.
    Super Admins can invite into any department and appoint department heads.
    Department Heads can only invite team members into their authorized department with permitted roles.
    """
    is_dev = bool(current_user.is_superuser) or any(r.name in ["SUPER_ADMIN", "DEVELOPER"] for r in current_user.roles)

    clean_email = payload.email.lower().strip()
    if "@" not in clean_email or "." not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recipient email address format."
        )

    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {payload.department_id} not found."
        )

    target_role = payload.role.strip().upper()

    # Scope validation for non-superadmin (Department Heads)
    if not is_dev:
        if dept.head_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not authorized to invite members to '{dept.name}'."
            )
        if payload.is_department_head:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department Heads cannot appoint other Department Heads. Only Super Admin has this privilege."
            )
        allowed_member_roles = ["TEAM_MEMBER", "ACCOUNTANT", "REVIEWER", "MANAGER"]
        if target_role not in allowed_member_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Department Heads can only assign team roles: {allowed_member_roles}."
            )
    else:
        # Super admin valid roles
        valid_platform_roles = [
            "SUPER_ADMIN", "DEVELOPER", "DEPARTMENT_HEAD", "TEAM_MEMBER",
            "ORG_ADMIN", "MANAGER", "ACCOUNTANT", "REVIEWER", "ADMIN"
        ]
        if target_role not in valid_platform_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{target_role}'. Allowed: {valid_platform_roles}"
            )

    # Check if user already exists and is active in this department
    existing_user = db.query(User).filter(
        func.lower(User.email) == clean_email,
        User.department_id == dept.id,
        User.is_active == True
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{clean_email}' is already an active member of '{dept.name}'."
        )

    now = datetime.utcnow()
    expires_at = now + timedelta(days=7)

    # Check for existing pending/expired invitation for this recipient in this department
    existing_inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.department_id == dept.id,
        func.lower(OrganizationInvitation.email) == clean_email,
        OrganizationInvitation.status.in_([InvitationStatus.PENDING, InvitationStatus.EXPIRED])
    ).first()

    is_refresh = False
    if existing_inv:
        invitation = existing_inv
        invitation.token = secrets.token_urlsafe(32)
        invitation.role = target_role
        invitation.is_department_head = payload.is_department_head
        invitation.status = InvitationStatus.PENDING
        invitation.expires_at = expires_at
        invitation.invited_by_id = current_user.id
        invitation.created_at = now
        is_refresh = True
    else:
        token = secrets.token_urlsafe(32)
        invitation = OrganizationInvitation(
            company_id=current_user.default_company_id or (db.query(Company).first().id if db.query(Company).first() else None),
            department_id=dept.id,
            is_department_head=payload.is_department_head,
            email=clean_email,
            role=target_role,
            token=token,
            invited_by_id=current_user.id,
            status=InvitationStatus.PENDING,
            expires_at=expires_at,
            email_status="PENDING"
        )
        db.add(invitation)

    db.flush()

    invite_url = build_invitation_url(invitation.token, request)
    role_display = f"{target_role} ({'Department Head' if payload.is_department_head else 'Team Member'})"

    email_success, email_status_code, email_msg = send_invitation_email(
        recipient_email=clean_email,
        invitation_url=invite_url,
        company_name=f"RicozBooks — {dept.name}",
        role_name=role_display,
        inviter_name=current_user.full_name,
        expires_at=expires_at
    )

    invitation.email_status = email_status_code
    if email_success:
        invitation.email_sent_at = datetime.utcnow()
        invitation.email_error = None
    else:
        invitation.email_error = email_msg if email_status_code == "FAILED" else None

    db.commit()
    db.refresh(invitation)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="INVITATION_REFRESHED" if is_refresh else "INVITATION_CREATED",
        record_type="OrganizationInvitation",
        record_id=str(invitation.id),
        user=current_user,
        details=f"{'Refreshed' if is_refresh else 'Created'} invitation for '{clean_email}' in '{dept.name}' as {role_display} (Email: {email_status_code}).",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_invitation_detail_response(invitation, request, db)


@router.post("/departments/{department_id}/invitations", response_model=InvitationDetailResponse, status_code=status.HTTP_201_CREATED)
def invite_department_member(
    department_id: int,
    payload: DepartmentInvitationCreateRequest,
    request: Request,
    current_user: User = Depends(require_developer_or_dept_head),
    db: Session = Depends(get_db)
):
    """
    Dedicated endpoint for department heads to invite team members into their specific department.
    """
    payload.department_id = department_id
    return create_department_invitation(payload, request, current_user, db)


@router.post("/invitations/{invitation_id}/resend", response_model=InvitationDetailResponse)
def resend_department_invitation(
    invitation_id: int,
    request: Request,
    current_user: User = Depends(require_developer_or_dept_head),
    db: Session = Depends(get_db)
):
    """
    Resends an invitation with refreshed expiration and sends email if configured.
    """
    is_dev = bool(current_user.is_superuser) or any(r.name in ["SUPER_ADMIN", "DEVELOPER"] for r in current_user.roles)

    inv = db.query(OrganizationInvitation).filter(OrganizationInvitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invitation with ID {invitation_id} not found."
        )

    if not is_dev:
        # Check if caller is head of the invitation's department
        if not inv.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        dept = db.query(Department).filter(Department.id == inv.department_id).first()
        if not dept or dept.head_user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend an invitation that has already been accepted."
        )

    now = datetime.utcnow()
    inv.expires_at = now + timedelta(days=7)
    inv.status = InvitationStatus.PENDING

    invite_url = build_invitation_url(inv.token, request)
    dept_name = inv.department.name if inv.department else "Platform"

    email_success, email_status_code, email_msg = send_invitation_email(
        recipient_email=inv.email,
        invitation_url=invite_url,
        company_name=f"RicozBooks — {dept_name}",
        role_name=inv.role,
        inviter_name=current_user.full_name,
        expires_at=inv.expires_at
    )

    inv.email_status = email_status_code
    if email_success:
        inv.email_sent_at = datetime.utcnow()
        inv.email_error = None
    else:
        inv.email_error = email_msg if email_status_code == "FAILED" else None

    db.commit()
    db.refresh(inv)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="INVITATION_RESENT",
        record_type="OrganizationInvitation",
        record_id=str(inv.id),
        user=current_user,
        details=f"Resent invitation to '{inv.email}' for '{dept_name}' (Email: {email_status_code}).",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_invitation_detail_response(inv, request, db)


@router.post("/invitations/{invitation_id}/revoke", response_model=InvitationDetailResponse)
def revoke_department_invitation(
    invitation_id: int,
    request: Request,
    current_user: User = Depends(require_developer_or_dept_head),
    db: Session = Depends(get_db)
):
    """
    Revokes an active or expired invitation.
    """
    is_dev = bool(current_user.is_superuser) or any(r.name in ["SUPER_ADMIN", "DEVELOPER"] for r in current_user.roles)

    inv = db.query(OrganizationInvitation).filter(OrganizationInvitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invitation with ID {invitation_id} not found."
        )

    if not is_dev:
        if not inv.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        dept = db.query(Department).filter(Department.id == inv.department_id).first()
        if not dept or dept.head_user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke an invitation that has already been accepted."
        )

    inv.status = InvitationStatus.REVOKED
    db.commit()
    db.refresh(inv)

    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="INVITATION_REVOKED",
        record_type="OrganizationInvitation",
        record_id=str(inv.id),
        user=current_user,
        details=f"Revoked invitation for '{inv.email}'.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_invitation_detail_response(inv, request, db)


# -------------------------------------------------------------
# 8. Role & Permission Management Endpoints (Phase 4)
# -------------------------------------------------------------

MANDATORY_SUPER_ADMIN_PERMISSIONS = {
    "developer:administer",
    "roles:manage",
    "audit:read",
    "users:manage"
}


def _build_role_detail_response(role: Role, db: Session) -> RoleDetailResponse:
    member_count = db.query(func.count(user_roles.c.user_id)).filter(user_roles.c.role_id == role.id).scalar() or 0
    sorted_perms = sorted(role.permissions, key=lambda p: (p.module, p.code))
    perm_responses = [
        PermissionItemResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            module=p.module,
            description=p.description,
            created_at=p.created_at
        ) for p in sorted_perms
    ]
    
    is_protected = (role.name == "SUPER_ADMIN")
    is_system_role = role.name in ["SUPER_ADMIN", "DEVELOPER", "DEPARTMENT_HEAD", "TEAM_MEMBER", "ORG_ADMIN", "ADMIN"]

    return RoleDetailResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        created_at=role.created_at,
        permissions=perm_responses,
        member_count=member_count,
        is_system_role=is_system_role,
        is_protected=is_protected
    )


@router.get("/roles", response_model=List[RoleDetailResponse])
def get_all_roles(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Returns all platform and tenant roles with their assigned permissions and active user counts.
    """
    roles = db.query(Role).order_by(Role.id.asc()).all()
    return [_build_role_detail_response(r, db) for r in roles]


@router.get("/permissions", response_model=List[PermissionItemResponse])
def get_all_permissions(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Returns all permissions cataloged in the system, ordered by module and identifier code.
    """
    perms = db.query(Permission).order_by(Permission.module.asc(), Permission.code.asc()).all()
    return [
        PermissionItemResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            module=p.module,
            description=p.description,
            created_at=p.created_at
        ) for p in perms
    ]


@router.get("/roles/matrix", response_model=RolePermissionMatrixResponse)
def get_role_permission_matrix(
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Returns the complete Role-Permission Matrix, listing all roles, system permissions,
    modules, and permission IDs mapped per role.
    """
    roles = db.query(Role).order_by(Role.id.asc()).all()
    perms = db.query(Permission).order_by(Permission.module.asc(), Permission.code.asc()).all()
    
    role_details = [_build_role_detail_response(r, db) for r in roles]
    perm_responses = [
        PermissionItemResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            module=p.module,
            description=p.description,
            created_at=p.created_at
        ) for p in perms
    ]
    
    modules = sorted(list(set(p.module for p in perms)))
    
    matrix: Dict[str, List[int]] = {}
    for r in roles:
        matrix[str(r.id)] = [p.id for p in r.permissions]

    return RolePermissionMatrixResponse(
        roles=role_details,
        permissions=perm_responses,
        modules=modules,
        matrix=matrix
    )


@router.put("/roles/{role_id}/permissions", response_model=RoleDetailResponse)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionsUpdateRequest,
    request: Request,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Updates the permissions assigned to a role.
    - Strictly prevents revoking core mandatory security permissions from SUPER_ADMIN.
    - Validates that all requested permission IDs are valid.
    - Records consequential audit log with before/after permission counts and deltas.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found."
        )

    # Fetch all requested permissions
    target_permissions = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all() if payload.permission_ids else []
    found_ids = set(p.id for p in target_permissions)
    
    # Check if any requested ID was invalid
    missing_ids = set(payload.permission_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permission IDs requested: {sorted(list(missing_ids))}"
        )

    target_codes = set(p.code for p in target_permissions)

    # Mandatory security protection: Cannot revoke core platform security permissions from SUPER_ADMIN
    if role.name == "SUPER_ADMIN":
        missing_mandatory = MANDATORY_SUPER_ADMIN_PERMISSIONS - target_codes
        if missing_mandatory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot remove mandatory platform security permissions ({', '.join(sorted(missing_mandatory))}) from SUPER_ADMIN."
            )

    # Calculate differences for audit trail
    current_codes = set(p.code for p in role.permissions)
    added_codes = target_codes - current_codes
    removed_codes = current_codes - target_codes

    # Update role permissions
    role.permissions = target_permissions
    db.commit()
    db.refresh(role)

    # Consequential audit log
    from app.core.session_utils import get_client_ip
    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")

    log_audit(
        db=db,
        action="ROLE_PERMISSIONS_UPDATED",
        record_type="Role",
        record_id=str(role.id),
        user=current_user,
        details=f"Updated permissions for role '{role.name}'. Total assigned: {len(target_permissions)}. Added: {len(added_codes)} ({', '.join(sorted(added_codes)) if added_codes else 'none'}). Removed: {len(removed_codes)} ({', '.join(sorted(removed_codes)) if removed_codes else 'none'}).",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    return _build_role_detail_response(role, db)


# -------------------------------------------------------------
# 9. Central Administrative Audit Trail Endpoints (Phase 4)
# -------------------------------------------------------------

def _sanitize_audit_details(details_str: Optional[str]) -> Optional[str]:
    """Ensures secrets, hashes, or sensitive tokens are not exposed in audit log details."""
    if not details_str:
        return details_str
    import re
    cleaned = re.sub(r'("password"|"token"|"secret"|"hashed_password")\s*:\s*"[^"]+"', r'\1: "[REDACTED]"', details_str, flags=re.IGNORECASE)
    return cleaned


@router.get("/audit-logs", response_model=AuditLogListResponse)
def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Page size limit"),
    search: Optional[str] = Query(None, description="Free text search on action, target, actor, or details"),
    action: Optional[str] = Query(None, description="Exact action filter"),
    record_type: Optional[str] = Query(None, description="Record type filter"),
    actor_email: Optional[str] = Query(None, description="Actor email filter"),
    date_from: Optional[datetime] = Query(None, description="Filter logs starting at UTC datetime"),
    date_to: Optional[datetime] = Query(None, description="Filter logs ending at UTC datetime"),
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Searchable, filterable, and paginated Central Audit Trail.
    Excludes sensitive credentials and tokens while providing complete administrative traceability.
    """
    query = db.query(AuditLog)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(s),
                AuditLog.record_type.ilike(s),
                AuditLog.record_id.ilike(s),
                AuditLog.user_email.ilike(s),
                AuditLog.details.ilike(s)
            )
        )

    if action:
        query = query.filter(AuditLog.action == action.strip())

    if record_type:
        query = query.filter(AuditLog.record_type == record_type.strip())

    if actor_email:
        query = query.filter(AuditLog.user_email.ilike(f"%{actor_email.strip()}%"))

    if date_from:
        query = query.filter(AuditLog.timestamp >= date_from)

    if date_to:
        query = query.filter(AuditLog.timestamp <= date_to)

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    records = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).offset(offset).limit(limit).all()

    items = [
        AuditLogItemResponse(
            id=r.id,
            timestamp=r.timestamp,
            action=r.action,
            record_type=r.record_type,
            record_id=r.record_id,
            user_id=r.user_id,
            user_email=r.user_email,
            entity_id=r.entity_id,
            details=_sanitize_audit_details(r.details),
            ip_address=r.ip_address,
            user_agent=r.user_agent
        ) for r in records
    ]

    try:
        available_actions = [
            a[0] for a in db.query(AuditLog.action).distinct().order_by(AuditLog.action.asc()).limit(50).all() if a[0]
        ]
        available_record_types = [
            rt[0] for rt in db.query(AuditLog.record_type).distinct().order_by(AuditLog.record_type.asc()).limit(30).all() if rt[0]
        ]
    except Exception:
        available_actions = []
        available_record_types = []

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        available_actions=available_actions,
        available_record_types=available_record_types
    )


@router.get("/audit-logs/{audit_id}", response_model=AuditLogItemResponse)
def get_audit_log_detail(
    audit_id: int,
    current_user: User = Depends(require_developer_admin),
    db: Session = Depends(get_db)
):
    """
    Returns single audit log entry with detailed metadata.
    """
    log_entry = db.query(AuditLog).filter(AuditLog.id == audit_id).first()
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit record with ID {audit_id} not found."
        )

    return AuditLogItemResponse(
        id=log_entry.id,
        timestamp=log_entry.timestamp,
        action=log_entry.action,
        record_type=log_entry.record_type,
        record_id=log_entry.record_id,
        user_id=log_entry.user_id,
        user_email=log_entry.user_email,
        entity_id=log_entry.entity_id,
        details=_sanitize_audit_details(log_entry.details),
        ip_address=log_entry.ip_address,
        user_agent=log_entry.user_agent
    )

