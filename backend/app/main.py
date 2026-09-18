from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine
import app.models  # Ensure all models are registered with Base.metadata

from app.api.v1 import auth, entities, users, audit, health, accounts, journals
from app.api.v1 import auth, entities, users, audit, health, accounts, journals, ledger
from app.api.v1 import auth, entities, users, audit, health, accounts, journals, ledger, reports

# Create tables if not present
Base.metadata.create_all(bind=engine)
from app.migrate_entities import migrate_entities
migrate_entities()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
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

@app.get("/")
def root():
    return {
        "message": "Welcome to RicozBooks Enterprise Accounting API",
        "tagline": "Accurate Books. Stronger Decisions.",
        "parent_brand": "ricoz",
        "docs": "/docs"
    }

