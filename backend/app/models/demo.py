from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, Date, DateTime
from app.database.session import Base

class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(32), unique=True, index=True, nullable=False)
    full_name = Column(String(128), nullable=False)
    work_email = Column(String(128), index=True, nullable=False)
    phone_number = Column(String(32), nullable=False)
    company_name = Column(String(128), nullable=False)
    role = Column(String(64), nullable=False)
    entities_count = Column(String(32), default="1")
    what_to_see = Column(String(128), default="Complete Platform Demo")
    preferred_date = Column(Date, nullable=True)
    preferred_time = Column(String(64), nullable=True)
    status = Column(String(32), default="PENDING", index=True)  # PENDING, CONTACTED, SCHEDULED, COMPLETED
    notes = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
