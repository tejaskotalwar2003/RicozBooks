from datetime import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class NotificationType(str, enum.Enum):
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    GST_FILING_DUE = "GST_FILING_DUE"
    LOW_STOCK_ALERT = "LOW_STOCK_ALERT"
    RECURRING_PROCESSED = "RECURRING_PROCESSED"
    SYSTEM_ALERT = "SYSTEM_ALERT"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    
    notification_type = Column(String(50), default=NotificationType.SYSTEM_ALERT.value, nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    entity = relationship("Entity")
    user = relationship("User")
