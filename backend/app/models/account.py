import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Numeric
from sqlalchemy.orm import relationship
from app.database.session import Base

class AccountType(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"

class NormalBalance(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    account_type = Column(Enum(AccountType), nullable=False, index=True)
    normal_balance = Column(Enum(NormalBalance), nullable=False)
    
    parent_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    entity = relationship("Entity", back_populates="accounts")
    parent = relationship("Account", remote_side=[id], backref="sub_accounts")
    lines = relationship("JournalEntryLine", back_populates="account")

class AccountDimension(Base):
    __tablename__ = "account_dimensions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)       # Department, Cost Center, Project
    dimension_type = Column(String(50), nullable=False)
    code = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

