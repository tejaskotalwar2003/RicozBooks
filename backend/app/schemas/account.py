from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.account import AccountType, NormalBalance

class AccountBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    account_type: AccountType
    normal_balance: NormalBalance
    parent_id: Optional[int] = None
    description: Optional[str] = None
    currency: str = "INR"
    is_active: bool = True

class AccountCreate(AccountBase):
    entity_id: int

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

class AccountResponse(AccountBase):
    id: int
    entity_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

