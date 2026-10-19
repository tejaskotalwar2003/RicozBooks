from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.session_utils import parse_user_agent, get_client_ip, get_approx_location
from app.models.user import User, UserSession
from app.models.audit import AuditLog
from app.models.company import Entity
from app.schemas.token import (
    Token, 
    LoginRequest, 
    UserAuthSummary, 
    UpdateProfileRequest, 
    ChangePasswordRequest,
    UserSessionResponse,
    LoginActivityResponse
)
from app.api.deps import get_current_user, log_audit, oauth2_scheme

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    
    ua_str = request.headers.get("user-agent", "")
    ua_info = parse_user_agent(ua_str)
    client_ip = get_client_ip(request)
    loc = get_approx_location(request)

    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login attempt
        log_audit(
            db=db,
            action="LOGIN_FAILED",
            record_type="User",
            record_id=login_data.email,
            details=f"Failed login attempt for {login_data.email}",
            ip_address=client_ip,
            user_agent=ua_str[:255] if ua_str else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your system administrator."
        )

    # Determine active entity
    active_entity_id = login_data.entity_id or user.default_entity_id
    if active_entity_id:
        # Check authorization if not superuser
        if not user.is_superuser:
            has_access = any(e.id == active_entity_id for e in user.entities)
            if not has_access and user.entities:
                active_entity_id = user.entities[0].id
    elif user.entities:
        active_entity_id = user.entities[0].id

    # Gather roles & permissions
    role_names = [r.name for r in user.roles]
    all_perms = set()
    for r in user.roles:
        for p in r.permissions:
            all_perms.add(p.code)

    access_token = create_access_token(subject=user.id)
    
    log_audit(
        db=db,
        action="LOGIN_SUCCESS",
        record_type="User",
        record_id=str(user.id),
        user=user,
        entity_id=active_entity_id,
        details=f"User {user.email} logged in successfully",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    # Track active session in database
    new_session = UserSession(
        user_id=user.id,
        session_token=access_token[-24:],
        device=ua_info["device"],
        browser=ua_info["browser"],
        os=ua_info["os"],
        ip_address=client_ip,
        location=loc,
        is_active=True,
        last_active_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()

    user_summary = UserAuthSummary(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        job_title=user.job_title,
        roles=role_names,
        permissions=list(all_perms),
        default_company_id=user.default_company_id,
        default_entity_id=user.default_entity_id,
        active_entity_id=active_entity_id,
        profile_photo_url=getattr(user, 'profile_photo_url', None),
        is_superuser=bool(getattr(user, 'is_superuser', False))
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_summary
    )

@router.get("/me", response_model=UserAuthSummary)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_names = [r.name for r in current_user.roles]
    all_perms = set()
    for r in current_user.roles:
        for p in r.permissions:
            all_perms.add(p.code)
            
    active_entity = current_user.default_entity_id
    if not active_entity and current_user.entities:
        active_entity = current_user.entities[0].id

    return UserAuthSummary(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        job_title=current_user.job_title,
        roles=role_names,
        permissions=list(all_perms),
        default_company_id=current_user.default_company_id,
        default_entity_id=current_user.default_entity_id,
        active_entity_id=active_entity,
        profile_photo_url=getattr(current_user, 'profile_photo_url', None),
        is_superuser=bool(getattr(current_user, 'is_superuser', False))
    )

@router.put("/me", response_model=UserAuthSummary)
def update_current_user_profile(
    profile_in: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.first_name is not None and profile_in.first_name.strip():
        current_user.first_name = profile_in.first_name.strip()
    if profile_in.last_name is not None and profile_in.last_name.strip():
        current_user.last_name = profile_in.last_name.strip()
    if profile_in.job_title is not None:
        current_user.job_title = profile_in.job_title.strip()
    if profile_in.profile_photo_url is not None:
        current_user.profile_photo_url = profile_in.profile_photo_url.strip() or None

    db.commit()
    db.refresh(current_user)

    role_names = [r.name for r in current_user.roles]
    all_perms = set()
    for r in current_user.roles:
        for p in r.permissions:
            all_perms.add(p.code)

    active_entity = current_user.default_entity_id
    if not active_entity and current_user.entities:
        active_entity = current_user.entities[0].id

    return UserAuthSummary(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        job_title=current_user.job_title,
        roles=role_names,
        permissions=list(all_perms),
        default_company_id=current_user.default_company_id,
        default_entity_id=current_user.default_entity_id,
        active_entity_id=active_entity,
        profile_photo_url=getattr(current_user, 'profile_photo_url', None),
        is_superuser=bool(getattr(current_user, 'is_superuser', False))
    )

@router.post("/developer/login", response_model=Token)
def developer_login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Dedicated Developer / Super Admin authentication endpoint.
    Strictly verifies credentials and enforces platform superuser authorization.
    Rejects ordinary users with 403 Forbidden and records audit logging.
    """
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    
    ua_str = request.headers.get("user-agent", "")
    ua_info = parse_user_agent(ua_str)
    client_ip = get_client_ip(request)
    loc = get_approx_location(request)

    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit(
            db=db,
            action="DEVELOPER_LOGIN_FAILED",
            record_type="User",
            record_id=login_data.email,
            details=f"Failed developer login attempt for {login_data.email}",
            ip_address=client_ip,
            user_agent=ua_str[:255] if ua_str else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact the platform owner."
        )

    # Enforce Super Admin / Developer privilege
    is_developer_admin = bool(user.is_superuser) or any(r.name in ["SUPER_ADMIN", "DEVELOPER"] for r in user.roles)
    if not is_developer_admin:
        log_audit(
            db=db,
            action="UNAUTHORIZED_DEVELOPER_ACCESS_ATTEMPT",
            record_type="User",
            record_id=str(user.id),
            user=user,
            details=f"User {user.email} attempted to log in to Developer Console without superuser privileges",
            ip_address=client_ip,
            user_agent=ua_str[:255] if ua_str else None
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Developer Console is restricted to authorized platform administrators."
        )

    role_names = [r.name for r in user.roles]
    all_perms = set()
    for r in user.roles:
        for p in r.permissions:
            all_perms.add(p.code)

    access_token = create_access_token(subject=user.id)
    
    log_audit(
        db=db,
        action="DEVELOPER_LOGIN_SUCCESS",
        record_type="User",
        record_id=str(user.id),
        user=user,
        details=f"Super Admin {user.email} logged into Developer Console successfully",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )

    new_session = UserSession(
        user_id=user.id,
        session_token=access_token[-24:],
        device=ua_info["device"],
        browser=ua_info["browser"],
        os=ua_info["os"],
        ip_address=client_ip,
        location=loc,
        is_active=True,
        last_active_at=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()

    user_summary = UserAuthSummary(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        job_title=user.job_title,
        roles=role_names,
        permissions=list(all_perms),
        default_company_id=user.default_company_id,
        default_entity_id=user.default_entity_id,
        active_entity_id=user.default_entity_id,
        profile_photo_url=getattr(user, 'profile_photo_url', None),
        is_superuser=True
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_summary
    )

@router.post("/change-password")
def change_user_password(
    pwd_in: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(pwd_in.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )
    
    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    
    # Invalidate other active sessions for this user
    curr_token_suffix = token[-24:] if token else ""
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.session_token != curr_token_suffix
    ).update({"is_active": False})
    
    db.commit()

    client_ip = get_client_ip(request)
    ua_str = request.headers.get("user-agent", "")
    log_audit(
        db=db,
        action="PASSWORD_CHANGED",
        record_type="User",
        record_id=str(current_user.id),
        user=current_user,
        details="User changed account password. Other active sessions invalidated.",
        ip_address=client_ip,
        user_agent=ua_str[:255] if ua_str else None
    )
    return {"status": "success", "message": "Password changed successfully"}

@router.get("/sessions", response_model=List[UserSessionResponse])
def get_user_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    curr_token_suffix = token[-24:] if token else ""
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).order_by(UserSession.last_active_at.desc()).all()

    # Ensure current session exists in the records
    has_current = any(s.session_token == curr_token_suffix for s in active_sessions)
    if not has_current:
        ua_str = request.headers.get("user-agent", "")
        ua_info = parse_user_agent(ua_str)
        client_ip = get_client_ip(request)
        loc = get_approx_location(request)
        curr_sess = UserSession(
            user_id=current_user.id,
            session_token=curr_token_suffix,
            device=ua_info["device"],
            browser=ua_info["browser"],
            os=ua_info["os"],
            ip_address=client_ip,
            location=loc,
            is_active=True,
            last_active_at=datetime.utcnow()
        )
        db.add(curr_sess)
        db.commit()
        db.refresh(curr_sess)
        active_sessions.insert(0, curr_sess)

    results = []
    for s in active_sessions:
        is_cur = (s.session_token == curr_token_suffix)
        results.append(
            UserSessionResponse(
                id=s.id,
                device=s.device or "Desktop PC",
                browser=s.browser or "Web Browser",
                os=s.os or "Operating System",
                ip_address=s.ip_address,
                location=s.location or "Current Location",
                last_active_at=s.last_active_at or datetime.utcnow(),
                created_at=s.created_at or datetime.utcnow(),
                is_current=is_cur
            )
        )
    return results

@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    curr_token_suffix = token[-24:] if token else ""
    sess = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    if sess.session_token == curr_token_suffix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot sign out the current active session from here. Please use Sign Out from the account menu."
        )

    sess.is_active = False
    db.commit()
    return {"status": "success", "message": "Session terminated successfully"}

@router.post("/sessions/sign-out-others")
def revoke_other_sessions(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    curr_token_suffix = token[-24:] if token else ""
    updated = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.session_token != curr_token_suffix,
        UserSession.is_active == True
    ).update({"is_active": False})
    db.commit()
    return {
        "status": "success",
        "message": f"Successfully signed out of {updated} other active session(s)",
        "count": updated
    }

@router.get("/login-activity", response_model=List[LoginActivityResponse])
def get_login_activity(
    limit: int = 15,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(
        (AuditLog.user_id == current_user.id) | (AuditLog.record_id == current_user.email),
        AuditLog.action.in_(["LOGIN_SUCCESS", "LOGIN_FAILED", "PASSWORD_CHANGED"])
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    results = []
    for log in logs:
        ua_info = parse_user_agent(log.user_agent or "")
        device_browser = f"{ua_info['browser']} on {ua_info['os']}" if log.user_agent else "Web Browser"
        status_text = "SUCCESS" if log.action in ["LOGIN_SUCCESS", "PASSWORD_CHANGED"] else "FAILED"
        ip = log.ip_address or "127.0.0.1"
        loc = "Bangalore, India" if ip in ("127.0.0.1", "::1", "localhost") or ip.startswith("192.168.") or ip.startswith("10.") else "India (Detected)"
        
        results.append(
            LoginActivityResponse(
                id=log.id,
                timestamp=log.timestamp,
                device_browser=device_browser,
                location=loc,
                status=status_text,
                ip_address=ip
            )
        )
    return results

from app.schemas.tenant import CompanyRegistrationRequest, CompanyRegistrationResponse
from app.api.v1.tenants import register_company as handle_register_company

@router.post("/register-company", response_model=CompanyRegistrationResponse, status_code=status.HTTP_201_CREATED)
def auth_register_company(
    reg_in: CompanyRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    return handle_register_company(reg_in, request, db)


import uuid
from pydantic import BaseModel, EmailStr
from typing import Optional

class DemoLeadRequest(BaseModel):
    full_name: str
    work_email: EmailStr
    phone_number: str
    company_name: str
    role: str
    entities_count: Optional[str] = "1"
    what_to_see: Optional[str] = "Complete Platform Demo"
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

class DemoLeadResponse(BaseModel):
    status: str
    message: str
    reference_id: Optional[str] = None

@router.post("/demo-request", response_model=DemoLeadResponse)
def request_demo(
    lead_in: DemoLeadRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    from app.models.demo import DemoRequest
    from datetime import datetime

    client_ip = request.client.host if request.client else None
    ref_id = f"DEMO-{uuid.uuid4().hex[:8].upper()}"

    parsed_date = None
    if lead_in.preferred_date:
        try:
            parsed_date = datetime.strptime(lead_in.preferred_date.strip(), "%Y-%m-%d").date()
        except Exception:
            parsed_date = None

    demo = DemoRequest(
        reference_code=ref_id,
        full_name=lead_in.full_name.strip(),
        work_email=lead_in.work_email.strip().lower(),
        phone=lead_in.phone_number.strip(),
        company=lead_in.company_name.strip(),
        role=lead_in.role.strip(),
        entities_count=lead_in.entities_count or "1",
        interest_area=lead_in.what_to_see or "Complete Platform Demo",
        preferred_date=parsed_date,
        preferred_time=lead_in.preferred_time,
        status="NEW",
        ip_address=client_ip
    )
    db.add(demo)
    db.commit()
    db.refresh(demo)

    log_audit(
        db=db,
        action="DEMO_REQUEST_SUBMITTED",
        record_type="Lead",
        record_id=lead_in.work_email,
        details=f"Demo requested [{ref_id}] by {lead_in.full_name} ({lead_in.role} at {lead_in.company_name}, Entities: {lead_in.entities_count}, Focus: {lead_in.what_to_see}, Date: {lead_in.preferred_date}, Time: {lead_in.preferred_time}, Phone: {lead_in.phone_number})",
        ip_address=client_ip
    )
    return DemoLeadResponse(
        status="success",
        message="Thank you for your interest in RicozBooks. Our team will contact you shortly to confirm your demo.",
        reference_id=ref_id
    )




