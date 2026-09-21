from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    entity_id: int
    user_id: Optional[int] = None
    notification_type: str
    title: str
    message: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationSummary(BaseModel):
    unread_count: int
    total_count: int
    notifications: List[NotificationResponse]
