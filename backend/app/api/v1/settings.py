from typing import List, Optional
from datetime import date, datetime
import calendar
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, Role, Permission
from app.models.company import Company, Entity, Currency, ExchangeRate, FiscalPeriod
from app.schemas.settings import (
    CurrencyCreate,
    CurrencyResponse,
    ExchangeRateCreate,
    ExchangeRateUpdate,
    ExchangeRateResponse,
    FiscalPeriodCreate,
    FiscalPeriodUpdate,
    FiscalPeriodResponse,
    FiscalYearGenerateRequest,
    PermissionResponse,
    RoleDetailResponse,
    RolePermissionMatrixResponse,
    RolePermissionUpdateRequest,
    EntityTaxProfileResponse,
    EntityTaxProfileUpdate,
)
from app.api.deps import get_current_user, require_roles, log_audit

router = APIRouter()

# ==========================================
# 1. Multi-Currency & Exchange Rates
# ==========================================

@router.get("/exchange-rates", response_model=List[ExchangeRateResponse])
def get_exchange_rates(
    from_currency: Optional[str] = None,
    to_currency: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ExchangeRate)
    if from_currency:
        query = query.filter(ExchangeRate.from_currency == from_currency.upper())
    if to_currency:
        query = query.filter(ExchangeRate.to_currency == to_currency.upper())
    
    return query.order_by(ExchangeRate.effective_date.desc(), ExchangeRate.from_currency.asc()).all()

@router.post("/exchange-rates", response_model=ExchangeRateResponse, status_code=status.HTTP_201_CREATED)
def upsert_exchange_rate(
    rate_in: ExchangeRateCreate,
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    from_curr = rate_in.from_currency.upper().strip()
    to_curr = rate_in.to_currency.upper().strip()
    eff_date = rate_in.effective_date or date.today()

    # Validate currencies exist
    if not db.query(Currency).filter(Currency.code == from_curr).first():
        raise HTTPException(status_code=400, detail=f"Currency '{from_curr}' is not configured.")
    if not db.query(Currency).filter(Currency.code == to_curr).first():
        raise HTTPException(status_code=400, detail=f"Currency '{to_curr}' is not configured.")

    existing = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == from_curr,
        ExchangeRate.to_currency == to_curr,
        ExchangeRate.effective_date == eff_date
    ).first()

    if existing:
        existing.rate = rate_in.rate
        db.commit()
        db.refresh(existing)
        target_record = existing
        action = "EXCHANGE_RATE_UPDATED"
    else:
        new_rate = ExchangeRate(
            from_currency=from_curr,
            to_currency=to_curr,
            rate=rate_in.rate,
            effective_date=eff_date
        )
        db.add(new_rate)
        db.commit()
        db.refresh(new_rate)
        target_record = new_rate
        action = "EXCHANGE_RATE_CREATED"

    log_audit(
        db=db,
        action=action,
        record_type="ExchangeRate",
        record_id=str(target_record.id),
        user=current_user,
        details=f"{action}: 1 {from_curr} = {rate_in.rate} {to_curr} as of {eff_date}"
    )

    return target_record

@router.put("/exchange-rates/{rate_id}", response_model=ExchangeRateResponse)
def update_exchange_rate(
    rate_id: int,
    rate_in: ExchangeRateUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "REVIEWER"])),
    db: Session = Depends(get_db)
):
    rate_obj = db.query(ExchangeRate).filter(ExchangeRate.id == rate_id).first()
    if not rate_obj:
        raise HTTPException(status_code=404, detail="Exchange rate record not found.")

    rate_obj.rate = rate_in.rate
    if rate_in.effective_date:
        rate_obj.effective_date = rate_in.effective_date

    db.commit()
    db.refresh(rate_obj)

    log_audit(
        db=db,
        action="EXCHANGE_RATE_MODIFIED",
        record_type="ExchangeRate",
        record_id=str(rate_obj.id),
        user=current_user,
        details=f"Modified FX rate: 1 {rate_obj.from_currency} = {rate_obj.rate} {rate_obj.to_currency}"
    )

    return rate_obj

# ==========================================
# 2. Fiscal Calendar & Periods
# ==========================================

@router.get("/fiscal-periods", response_model=List[FiscalPeriodResponse])
def get_fiscal_periods(
    entity_id: Optional[int] = None,
    fiscal_year: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FiscalPeriod)
    if entity_id:
        query = query.filter(FiscalPeriod.entity_id == entity_id)
    if fiscal_year:
        query = query.filter(FiscalPeriod.fiscal_year == fiscal_year)

    return query.order_by(FiscalPeriod.fiscal_year.desc(), FiscalPeriod.period_number.asc()).all()

@router.post("/fiscal-periods/generate-year", response_model=List[FiscalPeriodResponse])
def generate_fiscal_year_periods(
    gen_in: FiscalYearGenerateRequest,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = db.query(Entity).filter(Entity.id == gen_in.entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity with ID {gen_in.entity_id} not found.")

    # Parse years from string (e.g., "2026-27" -> 2026, 2027)
    fy_str = gen_in.fiscal_year.strip()
    try:
        if "-" in fy_str:
            parts = fy_str.split("-")
            start_year = int(parts[0])
        else:
            start_year = int(fy_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid fiscal year format. Use YYYY or YYYY-YY (e.g. 2026-27).")

    created_periods = []
    month_cursor = gen_in.start_month
    year_cursor = start_year

    for period_num in range(1, 13):
        # Calculate start and end date for this month
        _, last_day = calendar.monthrange(year_cursor, month_cursor)
        p_start = date(year_cursor, month_cursor, 1)
        p_end = date(year_cursor, month_cursor, last_day)
        p_name = f"{calendar.month_name[month_cursor]} {year_cursor}"

        # Check if already exists
        existing = db.query(FiscalPeriod).filter(
            FiscalPeriod.entity_id == entity.id,
            FiscalPeriod.fiscal_year == fy_str,
            FiscalPeriod.period_number == period_num
        ).first()

        if not existing:
            new_period = FiscalPeriod(
                entity_id=entity.id,
                fiscal_year=fy_str,
                period_number=period_num,
                name=p_name,
                start_date=p_start,
                end_date=p_end,
                is_closed=False
            )
            db.add(new_period)
            created_periods.append(new_period)
        else:
            created_periods.append(existing)

        # Advance month
        month_cursor += 1
        if month_cursor > 12:
            month_cursor = 1
            year_cursor += 1

    db.commit()
    for p in created_periods:
        db.refresh(p)

    log_audit(
        db=db,
        action="FISCAL_YEAR_GENERATED",
        record_type="FiscalPeriod",
        record_id=str(entity.id),
        user=current_user,
        entity_id=entity.id,
        details=f"Generated 12 fiscal periods for FY {fy_str} ({entity.name})"
    )

    return created_periods

# ==========================================
# 3. RBAC Permissions Matrix
# ==========================================

@router.get("/roles-matrix", response_model=RolePermissionMatrixResponse)
def get_roles_matrix(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).order_by(Role.name.asc()).all()
    all_perms = db.query(Permission).order_by(Permission.module.asc(), Permission.code.asc()).all()

    return RolePermissionMatrixResponse(
        roles=roles,
        all_permissions=all_perms
    )

@router.put("/roles-matrix", response_model=RoleDetailResponse)
def update_role_permissions(
    update_in: RolePermissionUpdateRequest,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(Role.name == update_in.role_name.upper().strip()).first()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{update_in.role_name}' not found.")

    if role.name == "ADMIN" and len(update_in.permission_codes) == 0:
        raise HTTPException(status_code=400, detail="Cannot revoke all permissions from the ADMIN role.")

    # Match permission codes
    perms = db.query(Permission).filter(Permission.code.in_(update_in.permission_codes)).all()
    role.permissions = perms
    db.commit()
    db.refresh(role)

    log_audit(
        db=db,
        action="ROLE_PERMISSIONS_UPDATED",
        record_type="Role",
        record_id=str(role.id),
        user=current_user,
        details=f"Updated permissions for role '{role.name}': {len(perms)} active permissions"
    )

    return role

# ==========================================
# 4. Entity Tax & Statutory Preferences
# ==========================================

@router.get("/entity-profile/{entity_id}", response_model=EntityTaxProfileResponse)
def get_entity_tax_profile(
    entity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found.")

    return entity

@router.put("/entity-profile/{entity_id}", response_model=EntityTaxProfileResponse)
def update_entity_tax_profile(
    entity_id: int,
    profile_in: EntityTaxProfileUpdate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found.")

    update_dict = profile_in.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(entity, field, val)

    # Sync tax_identifier if gstin was updated
    if profile_in.gstin and not entity.tax_identifier:
        entity.tax_identifier = profile_in.gstin

    db.commit()
    db.refresh(entity)

    log_audit(
        db=db,
        action="ENTITY_TAX_PROFILE_UPDATED",
        record_type="Entity",
        record_id=str(entity.id),
        user=current_user,
        entity_id=entity.id,
        details=f"Updated statutory tax and profile settings for {entity.name}"
    )

    return entity

