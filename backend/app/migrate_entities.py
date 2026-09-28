from sqlalchemy import text
from app.database.session import engine, SessionLocal
from app.core.security import get_password_hash

def migrate_entities():
    statements = [
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS pan VARCHAR(20);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS address VARCHAR(255);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2025-26';",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';",
        "UPDATE entities SET gstin = tax_identifier WHERE gstin IS NULL;",
        "UPDATE entities SET financial_year = '2025-26' WHERE financial_year IS NULL;",
        "UPDATE entities SET status = 'ACTIVE' WHERE status IS NULL;",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(255);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);",
        "ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';",
        "CREATE TABLE IF NOT EXISTS user_companies (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, PRIMARY KEY (user_id, company_id));",
        "INSERT INTO user_companies (user_id, company_id) SELECT id, default_company_id FROM users WHERE default_company_id IS NOT NULL ON CONFLICT DO NOTHING;",
        
        # -------------------------------------------------------------
        # 1. Demo Management Table: demo_admin_users
        # -------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS demo_admin_users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            email VARCHAR(128) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'DEMO_COORDINATOR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_demo_admin_users_email ON demo_admin_users (email);",
        "CREATE INDEX IF NOT EXISTS ix_demo_admin_users_id ON demo_admin_users (id);",

        # -------------------------------------------------------------
        # 2. Demo Management Table: demo_requests
        # -------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS demo_requests (
            id SERIAL PRIMARY KEY,
            reference_code VARCHAR(32) UNIQUE NOT NULL,
            full_name VARCHAR(128) NOT NULL,
            work_email VARCHAR(128) NOT NULL,
            phone VARCHAR(32) NOT NULL,
            company VARCHAR(128) NOT NULL,
            role VARCHAR(64) NOT NULL,
            entities_count VARCHAR(32) DEFAULT '1',
            interest_area VARCHAR(128) DEFAULT 'Complete Platform Demo',
            preferred_date DATE,
            preferred_time VARCHAR(64),
            confirmed_date DATE,
            confirmed_time VARCHAR(64),
            duration VARCHAR(32) DEFAULT '45 mins',
            meeting_link VARCHAR(255),
            status VARCHAR(32) NOT NULL DEFAULT 'NEW',
            assigned_to INTEGER REFERENCES demo_admin_users(id) ON DELETE SET NULL,
            internal_notes TEXT,
            ip_address VARCHAR(64),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_demo_requests_id ON demo_requests (id);",
        "CREATE INDEX IF NOT EXISTS ix_demo_requests_reference_code ON demo_requests (reference_code);",
        "CREATE INDEX IF NOT EXISTS ix_demo_requests_status ON demo_requests (status);",
        "CREATE INDEX IF NOT EXISTS ix_demo_requests_work_email ON demo_requests (work_email);",

        # -------------------------------------------------------------
        # 3. Demo Management Table: demo_schedule_history
        # -------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS demo_schedule_history (
            id SERIAL PRIMARY KEY,
            demo_request_id INTEGER NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
            old_date DATE,
            old_time VARCHAR(64),
            new_date DATE,
            new_time VARCHAR(64),
            changed_by INTEGER REFERENCES demo_admin_users(id) ON DELETE SET NULL,
            reason TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_demo_schedule_history_id ON demo_schedule_history (id);",
        "CREATE INDEX IF NOT EXISTS ix_demo_schedule_history_demo_request_id ON demo_schedule_history (demo_request_id);"
    ]

    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Migration statement notice: {e}")
        conn.commit()
    print("Entity and Demo tables schema migration applied successfully.")

    seed_demo_admin_users()


def seed_demo_admin_users():
    """Seed default internal demo admin users if table is empty"""
    try:
        from app.models.demo import DemoAdminUser, DemoRequest
        from datetime import date
        db = SessionLocal()
        try:
            if db.query(DemoAdminUser).count() == 0:
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
                    db.add(u)
                db.commit()
                print("[OK] Demo admin users seeded.")
                
            # Seed sample demo requests if empty
            if db.query(DemoRequest).count() == 0:
                sample_demos = [
                    DemoRequest(
                        reference_code="DEMO-482731",
                        full_name="Rajesh Mehra",
                        work_email="rajesh@apexholdings.in",
                        phone="+91 98201 12345",
                        company="Apex Holdings India Ltd",
                        role="CFO / Business Owner",
                        entities_count="2–5",
                        interest_area="Multi-Entity Management",
                        preferred_date=date(2026, 9, 29),
                        preferred_time="11:30 AM - 12:30 PM IST",
                        status="NEW"
                    ),
                    DemoRequest(
                        reference_code="DEMO-918234",
                        full_name="Priyanka Nair",
                        work_email="priyanka@fintechsol.com",
                        phone="+91 99302 54321",
                        company="FinTech Solutions Pvt Ltd",
                        role="Finance Manager",
                        entities_count="1",
                        interest_area="GST & Compliance",
                        preferred_date=date(2026, 9, 30),
                        preferred_time="03:00 PM - 04:00 PM IST",
                        status="UNDER REVIEW"
                    )
                ]
                for d in sample_demos:
                    db.add(d)
                db.commit()
                print("[OK] Sample demo requests seeded.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during demo admin user seeding: {e}")


if __name__ == "__main__":
    migrate_entities()
