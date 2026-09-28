from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Ensure demo tables exist in production database
    demo_tables_status = "ok"
    try:
        table_check = db.execute(text("SELECT to_regclass('public.demo_admin_users');")).scalar()
        if not table_check:
            from app.migrate_entities import migrate_entities
            migrate_entities()
            demo_tables_status = "created_and_seeded"
    except Exception as e:
        demo_tables_status = f"check_error: {str(e)}"
        
    return {
        "status": "online",
        "app": "RicozBooks API",
        "version": "1.0.0",
        "database": db_status,
        "demo_tables": demo_tables_status
    }
