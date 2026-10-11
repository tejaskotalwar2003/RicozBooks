from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.schemas.token import UserAuthSummary

class CompanyRegistrationRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=200)
    legal_name: Optional[str] = None
    business_email: EmailStr
    phone_number: Optional[str] = None
    country: str = "India"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    base_currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    tax_identifier: Optional[str] = None
    
    # Admin credentials
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    password: str = Field(..., min_length=6)

class CompanyRegistrationResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthSummary
    company_id: int
    company_name: str
    company_code: str
    entity_id: int
    entity_name: str

class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role: str = "ACCOUNTANT"  # ORG_ADMIN, MANAGER, ACCOUNTANT, REVIEWER

class InvitationResponse(BaseModel):
    id: int
    email: str
    role: str
    status: str
    token: str
    invite_url: str
    expires_at: datetime
    created_at: datetime
    invited_by_name: Optional[str] = None
    email_status: str = "PENDING"
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    email_message: Optional[str] = None
    is_existing: Optional[bool] = False

    class Config:
        from_attributes = True

class InvitationPublicInfoResponse(BaseModel):
    token: str
    email: str
    role: str
    company_name: str
    company_currency: str
    inviter_name: Optional[str] = None
    is_valid: bool
    message: Optional[str] = None
    user_exists: bool = False

class InvitationAcceptRequest(BaseModel):
    token: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: str = Field(..., min_length=6)

class CompanyMemberResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    job_title: Optional[str] = None
    roles: List[str] = []
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
