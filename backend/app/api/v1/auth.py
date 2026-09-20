from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.models.company import Entity
from app.schemas.token import Token, LoginRequest, UserAuthSummary
from app.api.deps import get_current_user, log_audit

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login attempt
        client_ip = request.client.host if request.client else None
        log_audit(
            db=db,
            action="LOGIN_FAILED",
            record_type="User",
            record_id=login_data.email,
            details=f"Failed login attempt for {login_data.email}",
            ip_address=client_ip
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
    
    client_ip = request.client.host if request.client else None
    log_audit(
        db=db,
        action="LOGIN_SUCCESS",
        record_type="User",
        record_id=str(user.id),
        user=user,
        entity_id=active_entity_id,
        details=f"User {user.email} logged in successfully",
        ip_address=client_ip
    )

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
        active_entity_id=active_entity_id
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
        active_entity_id=active_entity
    )

from app.schemas.tenant import CompanyRegistrationRequest, CompanyRegistrationResponse
from app.api.v1.tenants import register_company as handle_register_company

@router.post("/register-company", response_model=CompanyRegistrationResponse, status_code=status.HTTP_201_CREATED)
def auth_register_company(
    reg_in: CompanyRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    return handle_register_company(reg_in, request, db)


