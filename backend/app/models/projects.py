from datetime import datetime, date
from decimal import Decimal
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, 
    ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class ProjectBillingType(str, enum.Enum):
    FIXED_COST = "FIXED_COST"
    TIME_AND_MATERIALS = "TIME_AND_MATERIALS"
    NON_BILLABLE = "NON_BILLABLE"

class ProjectStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    billing_type = Column(String(50), default=ProjectBillingType.TIME_AND_MATERIALS.value, nullable=False)
    status = Column(String(30), default=ProjectStatus.IN_PROGRESS.value, nullable=False)
    
    budget_amount = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    default_hourly_rate = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    start_date = Column(Date, default=date.today, nullable=False)
    end_date = Column(Date, nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    customer = relationship("Customer")
    created_by = relationship("User")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    timesheets = relationship("Timesheet", back_populates="project", cascade="all, delete-orphan")


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    estimated_hours = Column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    status = Column(String(30), default=TaskStatus.TODO.value, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="tasks")
    timesheets = relationship("Timesheet", back_populates="task")


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    entry_date = Column(Date, default=date.today, nullable=False)
    hours = Column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)
    hourly_billable_rate = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    hourly_cost_rate = Column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    is_billable = Column(Boolean, default=True, nullable=False)
    is_invoiced = Column(Boolean, default=False, nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entity = relationship("Entity")
    project = relationship("Project", back_populates="timesheets")
    task = relationship("ProjectTask", back_populates="timesheets")
    user = relationship("User")
    invoice = relationship("Invoice")
