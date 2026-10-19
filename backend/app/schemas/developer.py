from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DepartmentHeadSummary(BaseModel):
    id: int
    email: str
    full_name: str
    job_title: Optional[str] = None

    class Config:
        from_attributes = True

class DepartmentMemberSummary(BaseModel):
    id: int
    email: str
    full_name: str
    job_title: Optional[str] = None
    is_active: bool
    is_head: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DepartmentResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    head_user_id: Optional[int] = None
    head: Optional[DepartmentHeadSummary] = None
    is_active: bool
    member_count: int = 0
    active_member_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DepartmentCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    head_user_id: Optional[int] = None

class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AssignDepartmentHeadRequest(BaseModel):
    user_id: Optional[int] = None  # None to unassign

class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    total_departments: int
    active_departments: int
    total_department_members: int
    assigned_heads_count: int
    unassigned_heads_count: int
    pending_invitations: int
    platform_health: Dict[str, Any]

class CandidateUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================================
# Phase 3: User Management & Departmental Invitations Schemas
# ============================================================================

class UserDetailResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    job_title: Optional[str] = None
    is_active: bool
    is_superuser: bool
    department_id: Optional[int] = None
    department_code: Optional[str] = None
    department_name: Optional[str] = None
    is_department_head: bool = False
    roles: List[str] = []
    default_company_id: Optional[int] = None
    default_company_name: Optional[str] = None
    default_entity_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    last_active_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserDetailResponse]
    total: int
    page: int
    limit: int
    pages: int


class UserDepartmentUpdateRequest(BaseModel):
    department_id: Optional[int] = None  # None removes user from department


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., min_length=2, max_length=50)


class DepartmentInvitationCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    department_id: int
    role: str = Field(..., min_length=2, max_length=50)
    is_department_head: bool = False


class InvitationDetailResponse(BaseModel):
    id: int
    email: str
    role: str
    department_id: Optional[int] = None
    department_code: Optional[str] = None
    department_name: Optional[str] = None
    is_department_head: bool = False
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    status: str
    invited_by_id: Optional[int] = None
    invited_by_name: Optional[str] = None
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    email_status: str
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    created_at: datetime
    invite_url: Optional[str] = None

    class Config:
        from_attributes = True


class InvitationListResponse(BaseModel):
    items: List[InvitationDetailResponse]
    total: int


# ============================================================================
# Phase 4: Role-Based Access Control, Permissions & Audit Trail Schemas
# ============================================================================

class PermissionItemResponse(BaseModel):
    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    permissions: List[PermissionItemResponse] = []
    member_count: int = 0
    is_system_role: bool = False
    is_protected: bool = False

    class Config:
        from_attributes = True


class RolePermissionMatrixResponse(BaseModel):
    roles: List[RoleDetailResponse]
    permissions: List[PermissionItemResponse]
    modules: List[str]
    matrix: Dict[str, List[int]]


class RolePermissionsUpdateRequest(BaseModel):
    permission_ids: List[int]


class AuditLogItemResponse(BaseModel):
    id: int
    timestamp: datetime
    action: str
    record_type: str
    record_id: Optional[str] = None
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogItemResponse]
    total: int
    page: int
    limit: int
    pages: int
    available_actions: List[str] = []
    available_record_types: List[str] = []

