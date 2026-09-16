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
    base_currency: str = "INR"
    is_active: bool = True

class EntityCreate(EntityBase):
    company_id: int

class EntityResponse(EntityBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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

