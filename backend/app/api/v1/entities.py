from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.company import Company, Entity, Currency
from app.schemas.entity import (
    EntityResponse, 
    EntityCreate, 
    EntityUpdate,
    EntityUserAssignRequest,
    EntityUserResponse,
    CompanyResponse, 
    CurrencyResponse
)
from app.api.deps import get_current_user, require_roles, log_audit, verify_entity_access, get_tenant_entity_ids

router = APIRouter()

@router.get("/entities", response_model=List[EntityResponse])
def get_user_entities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    tenant_id = current_user.default_company_id or (current_user.companies[0].id if current_user.companies else None)
    
    # Superuser with no specific tenant sees all
    if current_user.is_superuser and not tenant_id:
        return db.query(Entity).filter(Entity.is_active == True).order_by(Entity.id.asc()).all()

    # Admin / Org Admin sees all active entities belonging to their company tenant
    if any(r in ["ADMIN", "ORG_ADMIN"] for r in user_roles):
        if tenant_id:
            return db.query(Entity).filter(Entity.company_id == tenant_id, Entity.is_active == True).order_by(Entity.id.asc()).all()
        return db.query(Entity).filter(Entity.is_active == True).order_by(Entity.id.asc()).all()
        
    # Standard user sees assigned entities within tenant
    return sorted([
        e for e in current_user.entities 
        if e.is_active and (not tenant_id or e.company_id == tenant_id)
    ], key=lambda x: x.id)

@router.get("/entities/{entity_id}", response_model=EntityResponse)
def get_entity_detail(
    entity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)
    user_roles = [r.name for r in current_user.roles]
    if not current_user.is_superuser and not any(r in ["ADMIN", "ORG_ADMIN"] for r in user_roles):
        assigned_ids = [e.id for e in current_user.entities]
        if entity.id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to view this entity."
            )
    return entity

@router.post("/entities", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
def create_entity(
    entity_in: EntityCreate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Entity).filter(Entity.code == entity_in.code.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Entity with code {entity_in.code} already exists"
        )
        
    tax_id = entity_in.gstin or entity_in.tax_identifier
    entity = Entity(
        company_id=entity_in.company_id,
        name=entity_in.name,
        code=entity_in.code.upper().strip(),
        legal_name=entity_in.legal_name or entity_in.name,
        country=entity_in.country,
        jurisdiction=entity_in.jurisdiction,
        tax_identifier=tax_id,
        gstin=entity_in.gstin or tax_id,
        pan=entity_in.pan,
        address=entity_in.address,
        city=entity_in.city,
        state=entity_in.state,
        financial_year=entity_in.financial_year,
        status=entity_in.status,
        base_currency=entity_in.base_currency,
        is_active=entity_in.is_active
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    
    log_audit(
        db=db,
        action="ENTITY_CREATED",
        record_type="Entity",
        record_id=str(entity.id),
        user=current_user,
        entity_id=entity.id,
        details=f"Created entity {entity.name} ({entity.code})"
    )
    
    return entity

@router.put("/entities/{entity_id}", response_model=EntityResponse)
def update_entity(
    entity_id: int,
    entity_update: EntityUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)

    update_data = entity_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entity, field, value)

    # Sync tax_identifier and gstin if updated
    if "gstin" in update_data and not entity.tax_identifier:
        entity.tax_identifier = update_data["gstin"]

    db.commit()
    db.refresh(entity)

    log_audit(
        db=db,
        action="ENTITY_UPDATED",
        record_type="Entity",
        record_id=str(entity.id),
        user=current_user,
        entity_id=entity.id,
        details=f"Updated entity {entity.name} metadata"
    )

    return entity

@router.delete("/entities/{entity_id}")
def delete_entity(
    entity_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)

    # Soft-delete to preserve immutable accounting history
    entity.is_active = False
    entity.status = "INACTIVE"
    db.commit()

    log_audit(
        db=db,
        action="ENTITY_DEACTIVATED",
        record_type="Entity",
        record_id=str(entity.id),
        user=current_user,
        entity_id=entity.id,
        details=f"Deactivated entity {entity.name} ({entity.code})"
    )

    return {"message": f"Entity '{entity.name}' successfully deactivated."}

# ==========================================
# User-Entity Assignment Endpoints
# ==========================================

@router.get("/entities/{entity_id}/users", response_model=List[EntityUserResponse])
def get_entity_users(
    entity_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN", "REVIEWER", "MANAGER"])),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)

    return [
        EntityUserResponse(
            user_id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            primary_role=u.primary_role
        )
        for u in entity.authorized_users
    ]

@router.post("/entities/{entity_id}/users", response_model=List[EntityUserResponse])
def assign_user_to_entity(
    entity_id: int,
    assign_in: EntityUserAssignRequest,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)

    user = db.query(User).filter(User.id == assign_in.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {assign_in.user_id} not found."
        )

    if user not in entity.authorized_users:
        entity.authorized_users.append(user)
        db.commit()

        log_audit(
            db=db,
            action="USER_ASSIGNED_TO_ENTITY",
            record_type="Entity",
            record_id=str(entity.id),
            user=current_user,
            entity_id=entity.id,
            details=f"Assigned user {user.email} to entity {entity.name}"
        )

    return [
        EntityUserResponse(
            user_id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            primary_role=u.primary_role
        )
        for u in entity.authorized_users
    ]

@router.delete("/entities/{entity_id}/users/{user_id}")
def unassign_user_from_entity(
    entity_id: int,
    user_id: int,
    current_user: User = Depends(require_roles(["ADMIN", "ORG_ADMIN"])),
    db: Session = Depends(get_db)
):
    entity = verify_entity_access(entity_id, current_user, db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    if user in entity.authorized_users:
        entity.authorized_users.remove(user)
        db.commit()

        log_audit(
            db=db,
            action="USER_UNASSIGNED_FROM_ENTITY",
            record_type="Entity",
            record_id=str(entity.id),
            user=current_user,
            entity_id=entity.id,
            details=f"Unassigned user {user.email} from entity {entity.name}"
        )

    return {"message": f"User {user.email} unassigned from entity '{entity.name}'."}

# ==========================================
# Companies and Currencies Read Endpoints
# ==========================================

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenant_id = current_user.default_company_id or (current_user.companies[0].id if current_user.companies else None)
    if current_user.is_superuser and not tenant_id:
        return db.query(Company).all()
    if tenant_id:
        return db.query(Company).filter(Company.id == tenant_id).all()
    return db.query(Company).all()

@router.get("/currencies", response_model=List[CurrencyResponse])
def get_currencies(
    db: Session = Depends(get_db)
):
    currencies = db.query(Currency).filter(Currency.is_active == True).all()
    return currencies
