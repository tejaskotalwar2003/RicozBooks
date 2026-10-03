from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class DemoAdminUser(Base):
    __tablename__ = "demo_admin_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="DEMO_COORDINATOR", nullable=False)  # DEMO_ADMIN, DEMO_COORDINATOR, SALES_TEAM
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    assigned_demos = relationship("DemoRequest", back_populates="assigned_user", foreign_keys="DemoRequest.assigned_to")


class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id = Column(Integer, primary_key=True, index=True)
    reference_code = Column(String(32), unique=True, index=True, nullable=False)  # e.g. DEMO-482731
    full_name = Column(String(128), nullable=False)
    work_email = Column(String(128), index=True, nullable=False)
    phone = Column(String(32), nullable=False)
    company = Column(String(128), nullable=False)
    role = Column(String(64), nullable=False)
    entities_count = Column(String(32), default="1")
    interest_area = Column(String(128), default="Complete Platform Demo")
    preferred_date = Column(Date, nullable=True)
    preferred_time = Column(String(64), nullable=True)
    confirmed_date = Column(Date, nullable=True)
    confirmed_time = Column(String(64), nullable=True)
    duration = Column(String(32), default="45 mins", nullable=True)
    meeting_link = Column(String(255), nullable=True)
    status = Column(String(32), default="NEW", index=True, nullable=False)  # NEW, UNDER REVIEW, SCHEDULED, CONFIRMED, COMPLETED, RESCHEDULED, CANCELLED, REJECTED
    assigned_to = Column(Integer, ForeignKey("demo_admin_users.id"), nullable=True)
    internal_notes = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    assigned_user = relationship("DemoAdminUser", back_populates="assigned_demos", foreign_keys=[assigned_to])
    history = relationship("DemoScheduleHistory", back_populates="demo_request", cascade="all, delete-orphan", order_by="desc(DemoScheduleHistory.created_at)")


class DemoScheduleHistory(Base):
    __tablename__ = "demo_schedule_history"

    id = Column(Integer, primary_key=True, index=True)
    demo_request_id = Column(Integer, ForeignKey("demo_requests.id"), nullable=False, index=True)
    old_date = Column(Date, nullable=True)
    old_time = Column(String(64), nullable=True)
    new_date = Column(Date, nullable=True)
    new_time = Column(String(64), nullable=True)
    changed_by = Column(Integer, ForeignKey("demo_admin_users.id"), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    demo_request = relationship("DemoRequest", back_populates="history")
    changed_by_user = relationship("DemoAdminUser", foreign_keys=[changed_by])
