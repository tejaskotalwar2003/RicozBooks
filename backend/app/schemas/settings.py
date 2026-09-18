from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field

# ==========================================
# Currency & Exchange Rate Schemas
# ==========================================
class CurrencyCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=10)
    name: str = Field(..., max_length=100)
    symbol: str = Field(..., max_length=10)
    decimal_places: int = 2
    is_active: bool = True

class CurrencyResponse(BaseModel):
    code: str
    name: str
    symbol: str
    decimal_places: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExchangeRateCreate(BaseModel):
    from_currency: str = Field(..., min_length=3, max_length=10)
    to_currency: str = Field(..., min_length=3, max_length=10)
    rate: Decimal
    effective_date: Optional[date] = None

class ExchangeRateUpdate(BaseModel):
    rate: Decimal
    effective_date: Optional[date] = None

class ExchangeRateResponse(BaseModel):
    id: int
    from_currency: str
    to_currency: str
    rate: float
    effective_date: date
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# Fiscal Calendar Schemas
# ==========================================
class FiscalPeriodCreate(BaseModel):
    entity_id: int
    fiscal_year: str
    period_number: int
    name: str
    start_date: date
    end_date: date
    is_closed: bool = False

class FiscalPeriodUpdate(BaseModel):
    name: Optional[str] = None
    is_closed: Optional[bool] = None

class FiscalPeriodResponse(BaseModel):
    id: int
    entity_id: Optional[int]
    fiscal_year: str
    period_number: int
    name: str
    start_date: date
    end_date: date
    is_closed: bool
    closed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FiscalYearGenerateRequest(BaseModel):
    entity_id: int
    fiscal_year: str  # e.g., "2026-27"
    start_month: int = 4  # Default April (for Indian FY April-March)

# ==========================================
# RBAC Permissions Schemas
# ==========================================
class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True

class RolePermissionMatrixResponse(BaseModel):
    roles: List[RoleDetailResponse]
    all_permissions: List[PermissionResponse]

class RolePermissionUpdateRequest(BaseModel):
    role_name: str
    permission_codes: List[str]

# ==========================================
# Entity Tax & Statutory Profile Schemas
# ==========================================
class EntityTaxProfileResponse(BaseModel):
    id: int
    name: str
    code: str
    legal_name: Optional[str] = None
    country: str
    jurisdiction: Optional[str] = None
    tax_identifier: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    base_currency: str
    financial_year: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    status: str
    is_active: bool

    class Config:
        from_attributes = True

class EntityTaxProfileUpdate(BaseModel):
    legal_name: Optional[str] = None
    jurisdiction: Optional[str] = None
    tax_identifier: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    financial_year: Optional[str] = None
    base_currency: Optional[str] = None
