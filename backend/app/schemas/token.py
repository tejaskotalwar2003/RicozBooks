from typing import Optional, List
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    entity_id: Optional[int] = None

class UserAuthSummary(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []
    default_company_id: Optional[int] = None
    default_entity_id: Optional[int] = None
    active_entity_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthSummary

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

