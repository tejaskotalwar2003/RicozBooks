from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class EntityBase(BaseModel):
    name: str
    code: str
    legal_name: Optional[str] = None
    country: str = "India"
    jurisdiction: Optional[str] = None
    tax_identifier: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    financial_year: str = "2025-26"
    status: str = "ACTIVE"
    base_currency: str = "INR"
    is_active: bool = True
    upi_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    payment_gateway_active: bool = True

class EntityCreate(EntityBase):
    company_id: int

class EntityUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    country: Optional[str] = None
    jurisdiction: Optional[str] = None
    tax_identifier: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    financial_year: Optional[str] = None
    status: Optional[str] = None
    base_currency: Optional[str] = None
    is_active: Optional[bool] = None
    upi_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    payment_gateway_active: Optional[bool] = None

class EntityResponse(EntityBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EntityUserAssignRequest(BaseModel):
    user_id: int

class EntityUserResponse(BaseModel):
    user_id: int
    email: str
    first_name: str
    last_name: str
    primary_role: str

class CompanyBase(BaseModel):
    name: str
    code: str
    legal_name: Optional[str] = None
    tax_identifier: Optional[str] = None
    base_currency: str = "INR"

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    entities: List[EntityResponse] = []

    class Config:
        from_attributes = True

class CurrencyResponse(BaseModel):
    code: str
    name: str
    symbol: str
    decimal_places: int
    is_active: bool

    class Config:
        from_attributes = True
