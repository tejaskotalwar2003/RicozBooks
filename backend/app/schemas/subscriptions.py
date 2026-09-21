from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

class SubscriptionPlanResponse(BaseModel):
    id: int
    tier: str
    name: str
    description: Optional[str] = None
    monthly_price: Decimal
    annual_price: Decimal
    currency: str
    max_entities: int
    max_users: int
    max_invoices_per_month: int
    features: List[str] = []
    is_active: bool

    class Config:
        from_attributes = True

class CompanySubscriptionResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    plan: SubscriptionPlanResponse
    status: str
    billing_cycle: str
    current_period_start: date
    current_period_end: date
    cancel_at_period_end: bool
    
    # Usage metrics
    entities_used: int
    entities_limit: int
    users_used: int
    users_limit: int

    class Config:
        from_attributes = True

class UpgradePlanRequest(BaseModel):
    tier: str  # FREE, STARTER, GROWTH, ENTERPRISE
    billing_cycle: str = "MONTHLY"  # MONTHLY or ANNUALLY
