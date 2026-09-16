from typing import Optional
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    entity_id: Optional[int] = None
    action: str
    record_type: str
    record_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True

class PaginatedAuditLogResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    skip: int
    limit: int
