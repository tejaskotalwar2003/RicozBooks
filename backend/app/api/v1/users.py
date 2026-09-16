from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, Role
from app.schemas.user import UserResponse, RoleResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

@router.get("/roles", response_model=List[RoleResponse])
def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()
    return roles

