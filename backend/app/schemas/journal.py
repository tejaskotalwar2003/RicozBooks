from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.journal import JournalStatus

class JournalLineBase(BaseModel):
    account_id: int
    description: Optional[str] = None
    debit: Decimal = Field(default=Decimal("0.00"), ge=0)
    credit: Decimal = Field(default=Decimal("0.00"), ge=0)

class JournalLineCreate(JournalLineBase):
    pass

class JournalLineResponse(JournalLineBase):
    id: int
    line_number: int
    base_debit: Decimal
    base_credit: Decimal
    account_name: Optional[str] = None
    account_code: Optional[str] = None

    class Config:
        from_attributes = True

class ApprovalResponse(BaseModel):
    id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    action: str
    comments: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    entity_id: int
    entry_date: date = Field(default_factory=date.today)
    reference: Optional[str] = None
    description: str = Field(..., min_length=3)
    currency: str = "INR"
    exchange_rate: Decimal = Field(default=Decimal("1.000000"), gt=0)

class JournalEntryCreate(JournalEntryBase):
    lines: List[JournalLineCreate] = Field(..., min_items=2)
    save_as_draft: bool = True

class JournalEntryUpdate(BaseModel):
    entry_date: Optional[date] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    lines: Optional[List[JournalLineCreate]] = None

class JournalEntryResponse(JournalEntryBase):
    id: int
    entry_number: str
    status: JournalStatus
    total_debit: Decimal
    total_credit: Decimal
    created_by_id: int
    posted_by_id: Optional[int] = None
    posted_at: Optional[datetime] = None
    reversal_of_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by_name: Optional[str] = None
    entity_name: Optional[str] = None

    class Config:
        from_attributes = True

class JournalEntryDetailResponse(JournalEntryResponse):
    lines: List[JournalLineResponse] = []
    approvals: List[ApprovalResponse] = []

class JournalActionRequest(BaseModel):
    comments: Optional[str] = None
    reason: Optional[str] = None  # for rejection

