from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.company import Company, Entity, Currency
from app.schemas.entity import EntityResponse, EntityCreate, CompanyResponse, CurrencyResponse
from app.api.deps import get_current_user, require_roles, log_audit

router = APIRouter()

@router.get("/entities", response_model=List[EntityResponse])
def get_user_entities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Admin / Superuser has access to all entities
    user_roles = [r.name for r in current_user.roles]
    if current_user.is_superuser or "ADMIN" in user_roles:
        entities = db.query(Entity).filter(Entity.is_active == True).all()
        return entities
        
    # Return user-specific assigned entities
    return [e for e in current_user.entities if e.is_active]

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    companies = db.query(Company).all()
    return companies

@router.get("/currencies", response_model=List[CurrencyResponse])
def get_currencies(
    db: Session = Depends(get_db)
):
    currencies = db.query(Currency).filter(Currency.is_active == True).all()
    return currencies

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
        
    entity = Entity(
        company_id=entity_in.company_id,
        name=entity_in.name,
        code=entity_in.code.upper().strip(),
        legal_name=entity_in.legal_name or entity_in.name,
        country=entity_in.country,
        jurisdiction=entity_in.jurisdiction,
        tax_identifier=entity_in.tax_identifier,
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

