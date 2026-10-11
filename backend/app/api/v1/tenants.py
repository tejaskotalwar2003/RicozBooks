import re
import secrets
import calendar
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database.session import get_db
from app.core.security import get_password_hash, create_access_token, verify_password
from app.core.config import settings
from app.models.user import User, Role, user_roles, user_entities, user_companies
from app.models.company import Company, Entity, FiscalPeriod, OrganizationInvitation, InvitationStatus
from app.models.account import Account, AccountType, NormalBalance
from app.services.email_service import send_invitation_email, is_smtp_configured
from app.schemas.tenant import (
    CompanyRegistrationRequest,
    CompanyRegistrationResponse,
    InvitationCreateRequest,
    InvitationResponse,
    InvitationPublicInfoResponse,
    InvitationAcceptRequest,
    CompanyMemberResponse
)
from app.schemas.token import UserAuthSummary, Token
from app.api.deps import get_current_user, require_roles, get_current_tenant_id, log_audit

router = APIRouter()

def _slugify_code(name: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9]', '_', name.upper()).strip('_')
    cleaned = re.sub(r'_+', '_', cleaned)
    return cleaned[:20] if cleaned else "CORP"

def _provision_company_workspace(db: Session, company: Company, entity: Entity):
    """Provision standard GAAP/IFRS Chart of Accounts and 12-month fiscal schedule."""
    standard_accounts = [
        ("1000", "Cash on Hand", AccountType.ASSET, NormalBalance.DEBIT, "Liquid petty cash and vault reserves"),
        ("1100", "Operating Bank Account", AccountType.ASSET, NormalBalance.DEBIT, "Primary corporate checking account"),
        ("1200", "Accounts Receivable (AR)", AccountType.ASSET, NormalBalance.DEBIT, "Customer trade receivables"),
        ("1300", "Merchandise Inventory", AccountType.ASSET, NormalBalance.DEBIT, "Current trading inventory asset"),
        ("2000", "Accounts Payable (AP)", AccountType.LIABILITY, NormalBalance.CREDIT, "Trade payables to suppliers"),
        ("2100", "Statutory Tax / GST Output", AccountType.LIABILITY, NormalBalance.CREDIT, "Statutory tax and GST liability"),
        ("3000", "Paid-in Share Capital", AccountType.EQUITY, NormalBalance.CREDIT, "Common stock paid-in capital"),
        ("3100", "Retained Earnings", AccountType.EQUITY, NormalBalance.CREDIT, "Accumulated operational profits"),
        ("4000", "Operating Sales Revenue", AccountType.REVENUE, NormalBalance.CREDIT, "Primary operating software and service income"),
        ("5000", "Salary & Payroll Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "Wages and employee payroll expense"),
        ("5100", "Office Rent Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "Commercial real estate lease expense"),
        ("5200", "Utilities & Software Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "Cloud infrastructure, SaaS, and utilities"),
        ("5700", "Cost of Goods Sold (COGS)", AccountType.EXPENSE, NormalBalance.DEBIT, "Cost of inventory and merchandise sold"),
    ]
    for code, name, acc_type, norm_bal, desc in standard_accounts:
        acc = Account(
            entity_id=entity.id,
            code=code,
            name=name,
            account_type=acc_type,
            normal_balance=norm_bal,
            currency=entity.base_currency,
            description=desc,
            is_active=True
        )
        db.add(acc)

    # Provision 12-month fiscal calendar
    current_year = date.today().year
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    for m in range(1, 13):
        last_day = calendar.monthrange(current_year, m)[1]
        fp = FiscalPeriod(
            entity_id=entity.id,
            fiscal_year=f"{current_year}",
            period_number=m,
            name=f"{month_names[m-1]} {current_year}",
            start_date=date(current_year, m, 1),
            end_date=date(current_year, m, last_day),
            is_closed=False
        )
        db.add(fp)

    db.flush()

@router.post("/register-company", response_model=CompanyRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_company(
    reg_in: CompanyRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public self-serve onboarding:
    Registers a new Organization / Tenant, creates primary operating Entity,
    provisions GAAP/IFRS Chart of Accounts & 12-month fiscal calendar,
    and sets up the initial User as Organization Admin (ORG_ADMIN).
    """
    # 1. Check if admin email already exists
    existing_user = db.query(User).filter(User.email == reg_in.admin_email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{reg_in.admin_email}' already exists. Please sign in instead."
        )

    # 2. Check if company name already exists
    existing_company = db.query(Company).filter(Company.name.ilike(reg_in.company_name.strip())).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An organization with name '{reg_in.company_name}' is already registered."
        )

    # 3. Generate unique company & entity codes
    base_code = _slugify_code(reg_in.company_name)
    company_code = base_code
    counter = 1
    while db.query(Company).filter(Company.code == company_code).first():
        company_code = f"{base_code}_{counter}"
        counter += 1

    # 4. Create Company
    company = Company(
        name=reg_in.company_name.strip(),
        code=company_code,
        legal_name=reg_in.legal_name.strip() if reg_in.legal_name else reg_in.company_name.strip(),
        tax_identifier=reg_in.tax_identifier.strip() if reg_in.tax_identifier else None,
        base_currency=reg_in.base_currency.upper().strip(),
        business_email=reg_in.business_email.lower().strip(),
        phone_number=reg_in.phone_number.strip() if reg_in.phone_number else None,
        country=reg_in.country.strip(),
        address=reg_in.address.strip() if reg_in.address else None,
        city=reg_in.city.strip() if reg_in.city else None,
        state=reg_in.state.strip() if reg_in.state else None,
        postal_code=reg_in.postal_code.strip() if reg_in.postal_code else None,
        timezone=reg_in.timezone.strip()
    )
    db.add(company)
    db.flush()

    # 5. Create primary operating Entity
    entity_code = f"{company_code}_HQ"
    entity = Entity(
        company_id=company.id,
        name=f"{company.name} - Head Office",
        code=entity_code,
        legal_name=company.legal_name,
        country=company.country,
        address=company.address,
        city=company.city,
        state=company.state,
        base_currency=company.base_currency,
        tax_identifier=company.tax_identifier,
        financial_year=f"{date.today().year}",
        status="ACTIVE",
        is_active=True
    )
    db.add(entity)
    db.flush()

    # 6. Provision Chart of Accounts & Fiscal Periods
    _provision_company_workspace(db, company, entity)

    # 7. Create Organization Admin User
    name_parts = reg_in.admin_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    admin_user = User(
        email=reg_in.admin_email.lower().strip(),
        hashed_password=get_password_hash(reg_in.password),
        first_name=first_name,
        last_name=last_name,
        job_title="Organization Admin / Finance Head",
        is_active=True,
        is_superuser=False,
        default_company_id=company.id,
        default_entity_id=entity.id
    )
    db.add(admin_user)
    db.flush()

    # Assign ORG_ADMIN and ADMIN roles
    org_admin_role = db.query(Role).filter(Role.name == "ORG_ADMIN").first()
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if org_admin_role:
        admin_user.roles.append(org_admin_role)
    if admin_role and admin_role not in admin_user.roles:
        admin_user.roles.append(admin_role)

    # Link user to entity and company
    admin_user.entities.append(entity)
    admin_user.companies.append(company)

    db.commit()
    db.refresh(admin_user)
    db.refresh(company)
    db.refresh(entity)

    # 8. Generate JWT session token
    access_token = create_access_token(subject=admin_user.id)

    # Audit log
    client_ip = request.client.host if request.client else None
    log_audit(
        db=db,
        action="COMPANY_REGISTERED",
        record_type="Company",
        record_id=str(company.id),
        user=admin_user,
        entity_id=entity.id,
        details=f"New organization '{company.name}' registered by {admin_user.email}",
        ip_address=client_ip
    )

    all_perms = set()
    for r in admin_user.roles:
        for p in r.permissions:
            all_perms.add(p.code)

    user_summary = UserAuthSummary(
        id=admin_user.id,
        email=admin_user.email,
        first_name=admin_user.first_name,
        last_name=admin_user.last_name,
        job_title=admin_user.job_title,
        roles=[r.name for r in admin_user.roles],
        permissions=list(all_perms),
        default_company_id=company.id,
        default_entity_id=entity.id,
        active_entity_id=entity.id
    )

    return CompanyRegistrationResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_summary,
        company_id=company.id,
        company_name=company.name,
        company_code=company.code,
        entity_id=entity.id,
        entity_name=entity.name
    )

@router.get("/company", response_model=dict)
def get_tenant_organization_details(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the current user's organization profile."""
    company_id = get_current_tenant_id(current_user)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    
    return {
        "id": company.id,
        "name": company.name,
        "code": company.code,
        "legal_name": company.legal_name,
        "tax_identifier": company.tax_identifier,
        "base_currency": company.base_currency,
        "business_email": company.business_email,
        "phone_number": company.phone_number,
        "country": company.country,
        "address": company.address,
        "city": company.city,
        "state": company.state,
        "postal_code": company.postal_code,
        "timezone": company.timezone,
        "entities_count": len(company.entities),
        "members_count": len(company.members)
    }

@router.get("/members", response_model=List[CompanyMemberResponse])
def list_company_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all authorized employees/members in the organization workspace."""
    company_id = get_current_tenant_id(current_user)
    
    # Query users belonging to company
    users = db.query(User).filter(
        or_(
            User.default_company_id == company_id,
            User.companies.any(id=company_id)
        )
    ).all()

    members: List[CompanyMemberResponse] = []
    for u in users:
        members.append(CompanyMemberResponse(
            id=u.id,
            first_name=u.first_name,
            last_name=u.last_name,
            full_name=u.full_name,
            email=u.email,
            job_title=u.job_title,
            roles=[r.name for r in u.roles],
            is_active=u.is_active,
            created_at=u.created_at
        ))
    return members

def build_invitation_url(token: str, request: Optional[Request] = None) -> str:
    """Builds a full, absolute invitation URL conforming to configured frontend routing."""
    base = settings.FRONTEND_URL.strip().rstrip('/')
    if request:
        origin = request.headers.get("origin")
        if origin and origin.strip():
            origin_clean = origin.strip().rstrip('/')
            if "localhost" in origin_clean or "127.0.0.1" in origin_clean or origin_clean.endswith(".onrender.com"):
                base = origin_clean
    return f"{base}/invite/{token.strip()}"


@router.post("/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_organization_invitation(
    invite_in: InvitationCreateRequest,
    request: Request,
    current_user: User = Depends(require_roles(["ORG_ADMIN", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Organization Admin invites an employee to join the company workspace.
    Generates a secure cryptographic invitation link and sends an email if configured.
    """
    company_id = get_current_tenant_id(current_user)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    clean_email = invite_in.email.lower().strip()
    target_role = invite_in.role.upper().strip()

    valid_roles = ["ORG_ADMIN", "MANAGER", "ACCOUNTANT", "REVIEWER"]
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{target_role}'. Allowed roles: {valid_roles}"
        )

    # Check if user is already an active member of this organization
    existing_user = db.query(User).filter(
        func.lower(User.email) == clean_email,
        User.is_active == True,
        or_(User.default_company_id == company_id, User.companies.any(id=company_id))
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already an active member of this organization."
        )

    now = datetime.utcnow()
    expires_at = now + timedelta(days=7)

    # Check for existing pending/expired invitation for this recipient in this company
    existing_inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.company_id == company_id,
        func.lower(OrganizationInvitation.email) == clean_email,
        OrganizationInvitation.status.in_([InvitationStatus.PENDING, InvitationStatus.EXPIRED])
    ).first()

    is_refresh = False
    if existing_inv:
        if existing_inv.status == InvitationStatus.PENDING and existing_inv.expires_at > now:
            invitation = existing_inv
            invitation.role = target_role
            invitation.expires_at = expires_at
            invitation.invited_by_id = current_user.id
            is_refresh = True
        else:
            invitation = existing_inv
            invitation.token = secrets.token_urlsafe(32)
            invitation.role = target_role
            invitation.status = InvitationStatus.PENDING
            invitation.expires_at = expires_at
            invitation.invited_by_id = current_user.id
            invitation.created_at = now
            is_refresh = True
    else:
        token = secrets.token_urlsafe(32)
        invitation = OrganizationInvitation(
            company_id=company_id,
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

    email_success, email_status_code, email_msg = send_invitation_email(
        recipient_email=clean_email,
        invitation_url=invite_url,
        company_name=company.name,
        role_name=target_role,
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

    log_audit(
        db=db,
        action="INVITATION_REFRESHED" if is_refresh else "INVITATION_CREATED",
        record_type="OrganizationInvitation",
        record_id=str(invitation.id),
        user=current_user,
        details=f"{'Refreshed' if is_refresh else 'Created'} invitation for '{clean_email}' as {target_role} (Email: {email_status_code})"
    )

    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status.value,
        token=invitation.token,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        invited_by_name=current_user.full_name,
        email_status=invitation.email_status,
        email_sent_at=invitation.email_sent_at,
        email_error=invitation.email_error,
        email_message=email_msg,
        is_existing=is_refresh
    )


@router.get("/invitations", response_model=List[InvitationResponse])
def list_organization_invitations(
    request: Request,
    current_user: User = Depends(require_roles(["ORG_ADMIN", "ADMIN", "MANAGER"])),
    db: Session = Depends(get_db)
):
    """List outstanding and historical team invitations for current company."""
    company_id = get_current_tenant_id(current_user)
    invitations = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.company_id == company_id
    ).order_by(OrganizationInvitation.created_at.desc()).all()

    now = datetime.utcnow()
    res = []
    has_updates = False
    for inv in invitations:
        inv_status = inv.status.value
        if inv.status == InvitationStatus.PENDING and inv.expires_at < now:
            inv.status = InvitationStatus.EXPIRED
            inv_status = "EXPIRED"
            has_updates = True

        invite_url = build_invitation_url(inv.token, request)

        res.append(InvitationResponse(
            id=inv.id,
            email=inv.email,
            role=inv.role,
            status=inv_status,
            token=inv.token,
            invite_url=invite_url,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
            invited_by_name=inv.invited_by.full_name if inv.invited_by else None,
            email_status=inv.email_status or "PENDING",
            email_sent_at=inv.email_sent_at,
            email_error=inv.email_error
        ))

    if has_updates:
        db.commit()

    return res


@router.delete("/invitations/{invitation_id}", response_model=dict)
@router.post("/invitations/{invitation_id}/revoke", response_model=dict)
def revoke_invitation(
    invitation_id: int,
    current_user: User = Depends(require_roles(["ORG_ADMIN", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Revoke a pending team invitation."""
    company_id = get_current_tenant_id(current_user)
    inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.id == invitation_id,
        OrganizationInvitation.company_id == company_id
    ).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke an invitation that has already been accepted."
        )

    if inv.status == InvitationStatus.REVOKED:
        return {"message": "Invitation is already revoked", "status": "REVOKED"}

    inv.status = InvitationStatus.REVOKED
    db.commit()

    log_audit(
        db=db,
        action="INVITATION_REVOKED",
        record_type="OrganizationInvitation",
        record_id=str(inv.id),
        user=current_user,
        details=f"Revoked invitation for '{inv.email}'"
    )

    return {"message": f"Invitation for '{inv.email}' revoked successfully.", "status": "REVOKED"}


@router.post("/invitations/{invitation_id}/resend", response_model=InvitationResponse)
def resend_invitation(
    invitation_id: int,
    request: Request,
    current_user: User = Depends(require_roles(["ORG_ADMIN", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """Resend an invitation email for an eligible pending or expired invitation."""
    company_id = get_current_tenant_id(current_user)
    inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.id == invitation_id,
        OrganizationInvitation.company_id == company_id
    ).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend an invitation that has already been accepted."
        )

    if inv.status == InvitationStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resend a revoked invitation. Please create a new invitation instead."
        )

    now = datetime.utcnow()
    # Rate limit: allow resending at most once per 60 seconds
    last_attempt = inv.email_sent_at or inv.created_at
    if last_attempt and (now - last_attempt).total_seconds() < 60:
        remaining = max(1, int(60 - (now - last_attempt).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting another email resend."
        )

    # If expired, refresh expiry date and reactivate
    if inv.expires_at < now or inv.status == InvitationStatus.EXPIRED:
        inv.expires_at = now + timedelta(days=7)
        inv.status = InvitationStatus.PENDING

    company = inv.company
    invite_url = build_invitation_url(inv.token, request)

    email_success, email_status_code, email_msg = send_invitation_email(
        recipient_email=inv.email,
        invitation_url=invite_url,
        company_name=company.name if company else "RicozBooks",
        role_name=inv.role,
        inviter_name=current_user.full_name,
        expires_at=inv.expires_at
    )

    inv.email_status = email_status_code
    inv.email_sent_at = now
    if email_success:
        inv.email_error = None
    else:
        inv.email_error = email_msg if email_status_code == "FAILED" else None

    db.commit()
    db.refresh(inv)

    log_audit(
        db=db,
        action="INVITATION_RESENT",
        record_type="OrganizationInvitation",
        record_id=str(inv.id),
        user=current_user,
        details=f"Resent invitation to '{inv.email}' (Email: {email_status_code})"
    )

    return InvitationResponse(
        id=inv.id,
        email=inv.email,
        role=inv.role,
        status=inv.status.value,
        token=inv.token,
        invite_url=invite_url,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        invited_by_name=current_user.full_name,
        email_status=inv.email_status,
        email_sent_at=inv.email_sent_at,
        email_error=inv.email_error,
        email_message=email_msg
    )


@router.get("/invitations/validate/{token}", response_model=InvitationPublicInfoResponse)
def validate_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Public endpoint to validate an invite token and return organization details."""
    inv = db.query(OrganizationInvitation).filter(OrganizationInvitation.token == token.strip()).first()
    if not inv:
        return InvitationPublicInfoResponse(
            token=token,
            email="",
            role="",
            company_name="",
            company_currency="",
            is_valid=False,
            message="Invitation link not found or invalid.",
            user_exists=False
        )

    # Check if a user account already exists with this email
    existing_user = db.query(User).filter(User.email == inv.email.lower().strip()).first()
    user_exists = bool(existing_user)

    if inv.status == InvitationStatus.REVOKED:
        return InvitationPublicInfoResponse(
            token=token,
            email=inv.email,
            role=inv.role,
            company_name=inv.company.name if inv.company else "",
            company_currency=inv.company.base_currency if inv.company else "INR",
            is_valid=False,
            message="This invitation has been revoked by your administrator.",
            user_exists=user_exists
        )

    if inv.status == InvitationStatus.ACCEPTED:
        return InvitationPublicInfoResponse(
            token=token,
            email=inv.email,
            role=inv.role,
            company_name=inv.company.name if inv.company else "",
            company_currency=inv.company.base_currency if inv.company else "INR",
            is_valid=False,
            message="This invitation has already been accepted.",
            user_exists=user_exists
        )

    if inv.status != InvitationStatus.PENDING:
        return InvitationPublicInfoResponse(
            token=token,
            email=inv.email,
            role=inv.role,
            company_name=inv.company.name if inv.company else "",
            company_currency=inv.company.base_currency if inv.company else "INR",
            is_valid=False,
            message=f"This invitation is no longer active ({inv.status.value.lower()}).",
            user_exists=user_exists
        )

    if inv.expires_at < datetime.utcnow():
        inv.status = InvitationStatus.EXPIRED
        db.commit()
        return InvitationPublicInfoResponse(
            token=token,
            email=inv.email,
            role=inv.role,
            company_name=inv.company.name if inv.company else "",
            company_currency=inv.company.base_currency if inv.company else "INR",
            is_valid=False,
            message="This invitation link has expired. Please ask your administrator to send a new invitation.",
            user_exists=user_exists
        )

    return InvitationPublicInfoResponse(
        token=inv.token,
        email=inv.email,
        role=inv.role,
        company_name=inv.company.name if inv.company else "Company Workspace",
        company_currency=inv.company.base_currency if inv.company else "INR",
        inviter_name=inv.invited_by.full_name if inv.invited_by else "Your Administrator",
        is_valid=True,
        user_exists=user_exists
    )


@router.post("/invitations/accept", response_model=Token)
def accept_invitation(
    accept_in: InvitationAcceptRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Accept an invitation to join an existing organization tenant.
    Sets up credentials and logs the user into their authorized workspace.
    Safe against concurrent double-acceptance using database row-level locking.
    """
    inv = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.token == accept_in.token.strip()
    ).with_for_update().first()

    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invitation token.")

    if inv.status == InvitationStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has been revoked and cannot be accepted."
        )

    if inv.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been accepted."
        )

    if inv.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This invitation is no longer active ({inv.status.value})."
        )

    if inv.expires_at < datetime.utcnow():
        inv.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation link has expired."
        )

    company = inv.company
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated company not found.")

    # Find or create user
    user = db.query(User).filter(User.email == inv.email.lower().strip()).first()
    if not user:
        if not accept_in.first_name or not accept_in.first_name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First name is required.")
        user = User(
            email=inv.email.lower().strip(),
            hashed_password=get_password_hash(accept_in.password),
            first_name=accept_in.first_name.strip(),
            last_name=accept_in.last_name.strip() if accept_in.last_name else "",
            job_title=f"{inv.role.replace('_', ' ').title()} - Finance",
            is_active=True,
            is_superuser=False,
            default_company_id=company.id
        )
        db.add(user)
        db.flush()
    else:
        # Existing user: verify credentials
        if user.hashed_password:
            if not verify_password(accept_in.password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect password for your existing account. Please enter your existing password to accept this invitation."
                )
        else:
            user.hashed_password = get_password_hash(accept_in.password)

        if accept_in.first_name and accept_in.first_name.strip():
            user.first_name = accept_in.first_name.strip()
        if accept_in.last_name and accept_in.last_name.strip():
            user.last_name = accept_in.last_name.strip()
        user.is_active = True
        if not user.default_company_id:
            user.default_company_id = company.id

    # Assign primary entity
    primary_entity = company.entities[0] if company.entities else None
    if primary_entity:
        if not user.default_entity_id:
            user.default_entity_id = primary_entity.id
        if primary_entity not in user.entities:
            user.entities.append(primary_entity)

    # Link user to company membership
    if company not in user.companies:
        user.companies.append(company)

    # Assign invited role
    role_obj = db.query(Role).filter(Role.name == inv.role).first()
    if role_obj and role_obj not in user.roles:
        user.roles.append(role_obj)

    # Mark invitation accepted
    inv.status = InvitationStatus.ACCEPTED
    inv.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    # Create session token
    access_token = create_access_token(subject=user.id)

    client_ip = request.client.host if request.client else None
    log_audit(
        db=db,
        action="INVITATION_ACCEPTED",
        record_type="User",
        record_id=str(user.id),
        user=user,
        entity_id=user.default_entity_id,
        details=f"User '{user.email}' joined '{company.name}' as {inv.role}",
        ip_address=client_ip
    )

    all_perms = set()
    for r in user.roles:
        for p in r.permissions:
            all_perms.add(p.code)

    user_summary = UserAuthSummary(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        job_title=user.job_title,
        roles=[r.name for r in user.roles],
        permissions=list(all_perms),
        default_company_id=user.default_company_id,
        default_entity_id=user.default_entity_id,
        active_entity_id=user.default_entity_id
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_summary
    )
