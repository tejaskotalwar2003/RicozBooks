import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.database.session import Base

class CloseStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"

class ClosePeriod(Base):
    __tablename__ = "close_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    period_name = Column(String(100), nullable=False)  # "September 2026 Close"
    fiscal_year = Column(String(20), nullable=False)
    month = Column(Integer, nullable=False)
    
    status = Column(String(50), default="IN_PROGRESS", nullable=False)
    completion_percentage = Column(Integer, default=0, nullable=False)
    
    target_date = Column(Date, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    entity = relationship("Entity")
    closed_by = relationship("User")
    tasks = relationship("CloseTask", back_populates="close_period", cascade="all, delete-orphan")

class CloseTask(Base):
    __tablename__ = "close_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    close_period_id = Column(Integer, ForeignKey("close_periods.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(Date, nullable=False)
    
    status = Column(Enum(CloseStatus), default=CloseStatus.NOT_STARTED, nullable=False)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    close_period = relationship("ClosePeriod", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

