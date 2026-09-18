from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field
import enum

class CloseStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"

# Close Task Schemas
class CloseTaskBase(BaseModel):
    task_name: str
    description: Optional[str] = None
    due_date: date
    status: CloseStatus = CloseStatus.NOT_STARTED
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = None
    reviewer_id: Optional[int] = None

class CloseTaskCreate(CloseTaskBase):
    pass

class CloseTaskUpdate(BaseModel):
    task_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CloseStatus] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    due_date: Optional[date] = None

class CloseTaskResponse(CloseTaskBase):
    id: int
    close_period_id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    assigned_to_name: Optional[str] = None
    reviewer_name: Optional[str] = None

    class Config:
        from_attributes = True

# Close Period Schemas
class ClosePeriodBase(BaseModel):
    period_name: str
    fiscal_year: str
    month: int
    target_date: date

class ClosePeriodCreate(ClosePeriodBase):
    entity_id: int

class ClosePeriodResponse(ClosePeriodBase):
    id: int
    entity_id: int
    status: str
    completion_percentage: int
    closed_at: Optional[datetime] = None
    closed_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    total_tasks: int = 0
    completed_tasks: int = 0

    class Config:
        from_attributes = True

class ClosePeriodDetailResponse(ClosePeriodResponse):
    tasks: List[CloseTaskResponse] = []

class PeriodLockRequest(BaseModel):
    notes: Optional[str] = Field(None, description="CFO sign-off notes and closing remarks")

class PeriodReopenRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Mandatory audit explanation for reopening closed books")
