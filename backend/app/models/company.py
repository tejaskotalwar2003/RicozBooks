import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database.session import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    legal_name = Column(String(255), nullable=True)
    tax_identifier = Column(String(100), nullable=True)  # PAN, EIN, etc.
    base_currency = Column(String(10), default="INR", nullable=False)
    business_email = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)
    country = Column(String(100), default="India", nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    entities = relationship("Entity", back_populates="company", cascade="all, delete-orphan")
    invitations = relationship("OrganizationInvitation", back_populates="company", cascade="all, delete-orphan")

class Entity(Base):
    __tablename__ = "entities"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False, unique=True, index=True)
    legal_name = Column(String(255), nullable=True)
    country = Column(String(100), default="India", nullable=False)
    jurisdiction = Column(String(100), nullable=True)
    tax_identifier = Column(String(100), nullable=True)  # GSTIN, VAT, Sales Tax ID
    gstin = Column(String(50), nullable=True)
    pan = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    financial_year = Column(String(20), default="2025-26", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    base_currency = Column(String(10), default="INR", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    company = relationship("Company", back_populates="entities")
    accounts = relationship("Account", back_populates="entity", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="entity")

class Currency(Base):
    __tablename__ = "currencies"
    
    code = Column(String(10), primary_key=True)  # INR, USD, GBP, EUR
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)   # ₹, $, £, €
    decimal_places = Column(Integer, default=2, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(10), ForeignKey("currencies.code"), nullable=False, index=True)
    to_currency = Column(String(10), ForeignKey("currencies.code"), nullable=False, index=True)
    rate = Column(Numeric(18, 6), nullable=False)
    effective_date = Column(Date, default=date.today, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class FiscalPeriod(Base):
    __tablename__ = "fiscal_periods"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=True, index=True)
    fiscal_year = Column(String(20), nullable=False)  # "2026-27"
    period_number = Column(Integer, nullable=False)   # 1..12
    name = Column(String(50), nullable=False)         # "September 2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_closed = Column(Boolean, default=False, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"

class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # ORG_ADMIN, MANAGER, ACCOUNTANT, REVIEWER
    token = Column(String(128), unique=True, nullable=False, index=True)
    invited_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    company = relationship("Company", back_populates="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

