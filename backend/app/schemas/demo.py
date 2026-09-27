from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict

# Public Demo Request
class DemoRequestPublicCreate(BaseModel):
    full_name: str
    work_email: EmailStr
    phone: str
    company: str
    role: str
    entities_count: Optional[str] = "1"
    interest_area: Optional[str] = "Complete Platform Demo"
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

class DemoRequestPublicResponse(BaseModel):
    reference_code: str
    status: str
    message: str
    customer_name: str
    company: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

# Internal Auth
class InternalLoginRequest(BaseModel):
    email: EmailStr
    password: str

class InternalUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    is_active: bool
    assigned_count: Optional[int] = 0

class InternalTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: InternalUserResponse

# Demo History & Details
class DemoScheduleHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    demo_request_id: int
    old_date: Optional[date] = None
    old_time: Optional[str] = None
    new_date: Optional[date] = None
    new_time: Optional[str] = None
    changed_by_name: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

class DemoRequestDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_code: str
    full_name: str
    work_email: str
    phone: str
    company: str
    role: str
    entities_count: str
    interest_area: str
    preferred_date: Optional[date] = None
    preferred_time: Optional[str] = None
    confirmed_date: Optional[date] = None
    confirmed_time: Optional[str] = None
    duration: Optional[str] = None
    meeting_link: Optional[str] = None
    status: str
    assigned_to: Optional[int] = None
    assigned_user_name: Optional[str] = None
    internal_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[DemoScheduleHistoryResponse] = []

class DemoListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[DemoRequestDetailResponse]

# Action Request Bodies
class DemoStatusUpdateRequest(BaseModel):
    status: str

class DemoScheduleRequest(BaseModel):
    confirmed_date: str
    confirmed_time: str
    duration: Optional[str] = "45 mins"
    meeting_link: Optional[str] = None
    assigned_to: Optional[int] = None
    internal_notes: Optional[str] = None

class DemoRescheduleRequest(BaseModel):
    new_date: str
    new_time: str
    reason: str
    meeting_link: Optional[str] = None
    assigned_to: Optional[int] = None

class DemoAssignRequest(BaseModel):
    assigned_to: int

class DemoUpdateRequest(BaseModel):
    internal_notes: Optional[str] = None
    meeting_link: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None

# Dashboard Stats
class DashboardStatsResponse(BaseModel):
    new_requests: int
    pending_requests: int
    scheduled_demos: int
    today_demos: int
    completed_demos: int
    cancelled_demos: int
    total_requests: int
    status_distribution: Dict[str, int]
    requests_over_time: List[Dict[str, Any]]
