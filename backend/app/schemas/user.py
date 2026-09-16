from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    is_active: bool = True
    default_company_id: Optional[int] = None
    default_entity_id: Optional[int] = None

class UserCreate(UserBase):
    password: str
    role_ids: List[int] = []
    entity_ids: List[int] = []

class UserResponse(UserBase):
    id: int
    is_superuser: bool
    roles: List[RoleResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

