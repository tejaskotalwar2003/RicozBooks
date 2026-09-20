from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.user import User
from app.models.account import Account, AccountType, NormalBalance
from app.schemas.account import AccountResponse, AccountCreate, AccountUpdate
from app.api.deps import get_current_user, require_roles, log_audit, verify_entity_access, get_tenant_entity_ids

router = APIRouter()

@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(
    entity_id: Optional[int] = Query(None),
    account_type: Optional[AccountType] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Account)
    
    tenant_entity_ids = get_tenant_entity_ids(current_user, db)
    if entity_id:
        verify_entity_access(entity_id, current_user, db)
        query = query.filter(Account.entity_id == entity_id)
    elif tenant_entity_ids:
        query = query.filter(Account.entity_id.in_(tenant_entity_ids))
    elif current_user.default_entity_id:
        query = query.filter(Account.entity_id == current_user.default_entity_id)

    if account_type:
        query = query.filter(Account.account_type == account_type)

    if is_active is not None:
        query = query.filter(Account.is_active == is_active)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Account.code.ilike(term), Account.name.ilike(term)))

    return query.order_by(Account.code).all()

@router.get("/accounts/{id}", response_model=AccountResponse)
def get_account_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    verify_entity_access(account.entity_id, current_user, db)
    return account

@router.post("/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    verify_entity_access(account_in.entity_id, current_user, db)
    # Check if code already exists in this entity
    existing = db.query(Account).filter(
        Account.entity_id == account_in.entity_id,
        Account.code == account_in.code.strip()
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account code '{account_in.code}' already exists in this entity."
        )

    account = Account(
        entity_id=account_in.entity_id,
        code=account_in.code.strip(),
        name=account_in.name.strip(),
        account_type=account_in.account_type,
        normal_balance=account_in.normal_balance,
        parent_id=account_in.parent_id,
        description=account_in.description,
        currency=account_in.currency,
        is_active=account_in.is_active
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    log_audit(
        db=db,
        action="ACCOUNT_CREATED",
        record_type="Account",
        record_id=account.code,
        user=current_user,
        entity_id=account.entity_id,
        details=f"Created account {account.code} - {account.name} ({account.account_type.value})"
    )

    return account

@router.put("/accounts/{id}", response_model=AccountResponse)
def update_account(
    id: int,
    account_in: AccountUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "ACCOUNTANT"])),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    verify_entity_access(account.entity_id, current_user, db)

    if account_in.name is not None:
        account.name = account_in.name.strip()
    if account_in.description is not None:
        account.description = account_in.description
    if account_in.parent_id is not None:
        account.parent_id = account_in.parent_id
    if account_in.is_active is not None:
        account.is_active = account_in.is_active

    db.commit()
    db.refresh(account)

    log_audit(
        db=db,
        action="ACCOUNT_UPDATED",
        record_type="Account",
        record_id=account.code,
        user=current_user,
        entity_id=account.entity_id,
        details=f"Updated account {account.code} - {account.name}"
    )

    return account

