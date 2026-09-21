import json
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.company import Company, Entity
from app.models.subscriptions import (
    SubscriptionPlan, CompanySubscription, SubscriptionTier, SubscriptionStatus
)
from app.schemas.subscriptions import (
    SubscriptionPlanResponse, CompanySubscriptionResponse, UpgradePlanRequest
)
from app.api.deps import (
    get_current_user, require_roles
)

router = APIRouter()

DEFAULT_PLANS = [
    {
        "tier": SubscriptionTier.FREE.value,
        "name": "Community Free",
        "description": "Essential double-entry bookkeeping for solopreneurs and micro-businesses.",
        "monthly_price": Decimal("0.00"),
        "annual_price": Decimal("0.00"),
        "currency": "USD",
        "max_entities": 1,
        "max_users": 2,
        "max_invoices_per_month": 30,
        "features": ["Double-Entry Core", "Sales & Purchase Invoices", "Basic Financial Reports"]
    },
    {
        "tier": SubscriptionTier.STARTER.value,
        "name": "Professional Starter",
        "description": "Streamlined accounting, banking feeds, and reconciliation for growing ventures.",
        "monthly_price": Decimal("29.00"),
        "annual_price": Decimal("290.00"),
        "currency": "USD",
        "max_entities": 2,
        "max_users": 5,
        "max_invoices_per_month": 200,
        "features": ["Everything in Free", "Bank Reconciliation & CSV Parser", "Expenses & Claims Approvals", "Multi-Currency Rates"]
    },
    {
        "tier": SubscriptionTier.GROWTH.value,
        "name": "Business Growth",
        "description": "Full-stack statutory tax compliance, perpetual inventory, and project profitability.",
        "monthly_price": Decimal("79.00"),
        "annual_price": Decimal("790.00"),
        "currency": "USD",
        "max_entities": 5,
        "max_users": 20,
        "max_invoices_per_month": 2000,
        "features": ["Everything in Starter", "GSTR-1 & GSTR-3B Tax Filing", "Inventory Perpetual Movements", "Projects & Timesheet Billing", "Automated Recurring Schedules"]
    },
    {
        "tier": SubscriptionTier.ENTERPRISE.value,
        "name": "Enterprise Scale",
        "description": "Unlimited multi-entity consolidation, hard period locks, and custom governance.",
        "monthly_price": Decimal("199.00"),
        "annual_price": Decimal("1990.00"),
        "currency": "USD",
        "max_entities": 50,
        "max_users": 200,
        "max_invoices_per_month": 999999,
        "features": ["Everything in Growth", "Unlimited Entities & Consolidation", "Period-End Close Manager Hard Locks", "SOC-2 Ready Audit Trails", "Custom Roles RBAC Matrix"]
    }
]

def ensure_default_plans(db: Session):
    for plan_data in DEFAULT_PLANS:
        existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.tier == plan_data["tier"]).first()
        if not existing:
            new_p = SubscriptionPlan(
                tier=plan_data["tier"],
                name=plan_data["name"],
                description=plan_data["description"],
                monthly_price=plan_data["monthly_price"],
                annual_price=plan_data["annual_price"],
                currency=plan_data["currency"],
                max_entities=plan_data["max_entities"],
                max_users=plan_data["max_users"],
                max_invoices_per_month=plan_data["max_invoices_per_month"],
                features_json=json.dumps(plan_data["features"]),
                is_active=True
            )
            db.add(new_p)
    db.commit()

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def get_plans(db: Session = Depends(get_db)):
    ensure_default_plans(db)
    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
    results = []
    for p in plans:
        features = json.loads(p.features_json) if p.features_json else []
        results.append(SubscriptionPlanResponse(
            id=p.id,
            tier=p.tier,
            name=p.name,
            description=p.description,
            monthly_price=p.monthly_price,
            annual_price=p.annual_price,
            currency=p.currency,
            max_entities=p.max_entities,
            max_users=p.max_users,
            max_invoices_per_month=p.max_invoices_per_month,
            features=features,
            is_active=p.is_active
        ))
    return results

@router.get("/current", response_model=CompanySubscriptionResponse)
def get_current_subscription(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_plans(db)
    
    # Pick target company
    target_company = None
    if company_id:
        target_company = db.query(Company).filter(Company.id == company_id).first()
    elif current_user.companies:
        target_company = current_user.companies[0]
    else:
        target_company = db.query(Company).first()

    if not target_company:
        raise HTTPException(status_code=404, detail="No company found for subscription lookup")

    sub = db.query(CompanySubscription).filter(CompanySubscription.company_id == target_company.id).first()
    if not sub:
        # Assign Growth plan trial by default
        growth_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.tier == SubscriptionTier.GROWTH.value).first()
        if not growth_plan:
            growth_plan = db.query(SubscriptionPlan).first()

        sub = CompanySubscription(
            company_id=target_company.id,
            plan_id=growth_plan.id,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle="MONTHLY",
            current_period_start=date.today(),
            current_period_end=date.today() + timedelta(days=365)
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

    # Calculate actual usage
    entities_count = db.query(Entity).filter(Entity.company_id == target_company.id).count()
    users_count = len(target_company.users) if target_company.users else 1
    from app.models.user import user_companies
    users_count = db.query(User).join(user_companies).filter(user_companies.c.company_id == target_company.id).count()
    if users_count == 0:
        users_count = 1

    plan = sub.plan
    features = json.loads(plan.features_json) if plan.features_json else []

    return CompanySubscriptionResponse(
        id=sub.id,
        company_id=target_company.id,
        company_name=target_company.name,
        plan=SubscriptionPlanResponse(
            id=plan.id,
            tier=plan.tier,
            name=plan.name,
            description=plan.description,
            monthly_price=plan.monthly_price,
            annual_price=plan.annual_price,
            currency=plan.currency,
            max_entities=plan.max_entities,
            max_users=plan.max_users,
            max_invoices_per_month=plan.max_invoices_per_month,
            features=features,
            is_active=plan.is_active
        ),
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        entities_used=entities_count,
        entities_limit=plan.max_entities,
        users_used=users_count,
        users_limit=plan.max_users
    )

@router.post("/upgrade", response_model=CompanySubscriptionResponse)
def upgrade_subscription(
    req: UpgradePlanRequest,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_plans(db)

    target_company = None
    if company_id:
        target_company = db.query(Company).filter(Company.id == company_id).first()
    elif current_user.companies:
        target_company = current_user.companies[0]
    else:
        target_company = db.query(Company).first()

    if not target_company:
        raise HTTPException(status_code=404, detail="Company not found")

    new_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.tier == req.tier.upper()).first()
    if not new_plan:
        raise HTTPException(status_code=400, detail=f"Invalid subscription plan tier: {req.tier}")

    sub = db.query(CompanySubscription).filter(CompanySubscription.company_id == target_company.id).first()
    if not sub:
        sub = CompanySubscription(
            company_id=target_company.id,
            plan_id=new_plan.id,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=req.billing_cycle.upper(),
            current_period_start=date.today(),
            current_period_end=date.today() + timedelta(days=365)
        )
        db.add(sub)
    else:
        sub.plan_id = new_plan.id
        sub.billing_cycle = req.billing_cycle.upper()
        sub.status = SubscriptionStatus.ACTIVE.value
        sub.current_period_end = date.today() + timedelta(days=365)

    db.commit()
    db.refresh(sub)

    return get_current_subscription(company_id=target_company.id, db=db, current_user=current_user)
