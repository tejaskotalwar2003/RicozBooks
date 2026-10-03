from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine
import app.models  # Ensure all models are registered with Base.metadata

from app.api.v1 import (
    auth, 
    entities, 
    users, 
    audit, 
    health, 
    accounts, 
    journals, 
    ledger, 
    reports, 
    close, 
    settings as settings_api,
    tenants,
    dashboard,
    sales,
    purchases,
    expenses,
    banking,
    inventory,
    gst,
    projects,
    notifications,
    subscriptions,
    internal_demos
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        from app.migrate_entities import migrate_entities
        migrate_entities()
        try:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, "head")
        except Exception as alembic_err:
            print(f"Alembic auto-upgrade notice: {alembic_err}")
    except Exception as e:
        print(f"Startup database migration status: {e}")
    try:
        from app.seed import seed
        seed()
    except Exception as e:
        print(f"Startup database seed status: {e}")
    try:
        from app.models.demo import DemoAdminUser
        from app.core.security import get_password_hash
        from app.database.session import SessionLocal
        _db = SessionLocal()
        try:
            if _db.query(DemoAdminUser).count() == 0:
                demo_users = [
                    ('Ricoz Admin', 'admin@ricozbooks.com', 'admin123', 'DEMO_ADMIN'),
                    ('Vikram Malhotra', 'sales@ricozbooks.com', 'sales123', 'SALES_TEAM'),
                    ('Pooja Sharma', 'coordinator@ricozbooks.com', 'coord123', 'DEMO_COORDINATOR')
                ]
                for name, email, pwd, role in demo_users:
                    u = DemoAdminUser(
                        name=name,
                        email=email,
                        password_hash=get_password_hash(pwd),
                        role=role,
                        is_active=True
                    )
                    _db.add(u)
                _db.commit()
        finally:
            _db.close()
    except Exception as e:
        print(f"Startup demo admin users seed status: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(entities.router, prefix=settings.API_V1_STR, tags=["Entities & Companies"])
app.include_router(accounts.router, prefix=settings.API_V1_STR, tags=["Chart of Accounts"])
app.include_router(journals.router, prefix=settings.API_V1_STR, tags=["Journal Entries & Approvals"])
app.include_router(users.router, prefix=settings.API_V1_STR, tags=["Users & Roles"])
app.include_router(audit.router, prefix=settings.API_V1_STR, tags=["Audit Trail"])
app.include_router(ledger.router, prefix=settings.API_V1_STR, tags=["General Ledger"])
app.include_router(reports.router, prefix=settings.API_V1_STR, tags=["Financial Reports"])
app.include_router(close.router, prefix=f"{settings.API_V1_STR}/close", tags=["Period-End Close Manager"])
app.include_router(settings_api.router, prefix=f"{settings.API_V1_STR}/settings", tags=["Accounting Settings"])
app.include_router(tenants.router, prefix=f"{settings.API_V1_STR}/tenants", tags=["B2B Multi-Tenant Management"])
app.include_router(dashboard.router, prefix=settings.API_V1_STR, tags=["Executive Dashboard"])
app.include_router(sales.router, prefix=settings.API_V1_STR, tags=["Sales & Invoicing"])
app.include_router(purchases.router, prefix=settings.API_V1_STR, tags=["Purchases & Vendor Bills"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_STR}/expenses", tags=["Expenses & Employee Claims"])
app.include_router(banking.router, prefix=f"{settings.API_V1_STR}/banking", tags=["Banking & Reconciliation"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["Inventory & Stock Ledger"])
app.include_router(gst.router, prefix=f"{settings.API_V1_STR}/gst", tags=["GST & Statutory Tax Returns"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects & Timesheets"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["Automation & Notifications"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["SaaS Subscriptions & Billing"])
app.include_router(internal_demos.router, tags=["Internal Demo Management & Leads"])
app.include_router(internal_demos.router, prefix=settings.API_V1_STR, tags=["Internal Demo Management & Leads (v1)"])

@app.get("/")
def root():
    return {
        "message": "Welcome to RicozBooks Enterprise Accounting API",
        "tagline": "Accurate Books. Stronger Decisions.",
        "parent_brand": "ricoz",
        "docs": "/docs"
    }

