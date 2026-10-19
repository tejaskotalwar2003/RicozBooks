from typing import Optional, List
from datetime import datetime
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
    profile_photo_url: Optional[str] = None
    is_superuser: bool = False

    class Config:
        from_attributes = True

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    profile_photo_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthSummary

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class UserSessionResponse(BaseModel):
    id: int
    device: str
    browser: str
    os: str
    ip_address: Optional[str] = None
    location: Optional[str] = None
    last_active_at: datetime
    created_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True

class LoginActivityResponse(BaseModel):
    id: int
    timestamp: datetime
    device_browser: str
    location: Optional[str] = None
    status: str
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True
