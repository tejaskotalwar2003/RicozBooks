from datetime import datetime, date
from decimal import Decimal
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, 
    ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class SubscriptionTier(str, enum.Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    GROWTH = "GROWTH"
    ENTERPRISE = "ENTERPRISE"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TRIAL = "TRIAL"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    tier = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    annual_price = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    
    max_entities = Column(Integer, default=1, nullable=False)
    max_users = Column(Integer, default=2, nullable=False)
    max_invoices_per_month = Column(Integer, default=50, nullable=False)
    
    features_json = Column(Text, nullable=True)  # JSON-encoded array of feature badges
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CompanySubscription(Base):
    __tablename__ = "company_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    
    status = Column(String(30), default=SubscriptionStatus.ACTIVE.value, nullable=False)
    billing_cycle = Column(String(20), default="MONTHLY", nullable=False)  # MONTHLY or ANNUALLY
    
    current_period_start = Column(Date, default=date.today, nullable=False)
    current_period_end = Column(Date, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")
    plan = relationship("SubscriptionPlan")
