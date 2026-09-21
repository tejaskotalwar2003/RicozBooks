from typing import Generator, Optional, List, Set
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User
from app.models.company import Company, Entity
from app.models.audit import AuditLog

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Inclusive role hierarchy mapping for backward compatibility
PERMITTED_ROLES_MAP = {
    "ADMIN": {"ADMIN", "ORG_ADMIN"},
    "ORG_ADMIN": {"ADMIN", "ORG_ADMIN"},
    "MANAGER": {"ADMIN", "ORG_ADMIN", "MANAGER"},
    "REVIEWER": {"ADMIN", "ORG_ADMIN", "MANAGER", "REVIEWER"},
    "ACCOUNTANT": {"ADMIN", "ORG_ADMIN", "MANAGER", "ACCOUNTANT"},
}

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="User account is deactivated"
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
            
        user_role_names = set(role.name for role in current_user.roles)
        
        # Build union of acceptable user roles based on hierarchy
        acceptable_roles: Set[str] = set()
        for r in allowed_roles:
            acceptable_roles.add(r)
            if r in PERMITTED_ROLES_MAP:
                acceptable_roles.update(PERMITTED_ROLES_MAP[r])

        if not user_role_names.intersection(acceptable_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for roles: {list(user_role_names)}. Required one of: {allowed_roles}"
            )
        return current_user
    return role_checker

def get_current_tenant_id(current_user: User = Depends(get_current_user)) -> Optional[int]:
    if current_user.default_company_id:
        return current_user.default_company_id
    if current_user.companies:
        return current_user.companies[0].id
    if current_user.entities and current_user.entities[0].company_id:
        return current_user.entities[0].company_id
    if current_user.is_superuser:
        return None
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User is not associated with any organization tenant."
    )

def get_tenant_entity_ids(current_user: User, db: Session) -> List[int]:
    if current_user.is_superuser and not current_user.default_company_id:
        return [e[0] for e in db.query(Entity.id).filter(Entity.is_active == True).all()]
    
    tenant_id = current_user.default_company_id
    if not tenant_id and current_user.companies:
        tenant_id = current_user.companies[0].id
        
    if not tenant_id:
        return [e.id for e in current_user.entities if e.is_active]
        
    return [e[0] for e in db.query(Entity.id).filter(Entity.company_id == tenant_id, Entity.is_active == True).all()]

def verify_entity_access(entity_id: int, current_user: User, db: Session) -> Entity:
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )
    
    if current_user.is_superuser and not current_user.default_company_id:
        return entity
        
    tenant_id = current_user.default_company_id or (current_user.companies[0].id if current_user.companies else None)
    if tenant_id and entity.company_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Entity does not belong to your organization tenant."
        )
        
    return entity

def log_audit(
    db: Session,
    action: str,
    record_type: str,
    record_id: Optional[str] = None,
    user: Optional[User] = None,
    entity_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    try:
        import json
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else details
        audit_entry = AuditLog(
            action=action,
            record_type=record_type,
            record_id=str(record_id) if record_id else None,
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            entity_id=entity_id if entity_id else (user.default_entity_id if user else None),
            details=details_str,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to record audit log: {e}")
