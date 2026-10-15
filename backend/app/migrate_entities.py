from sqlalchemy import text
from app.database.session import engine, SessionLocal
from app.core.security import get_password_hash

def migrate_entities():
    statements = [
        # Entity & Company extensions
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS pan VARCHAR(20);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS address VARCHAR(255);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2025-26';",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS payment_gateway_active BOOLEAN DEFAULT TRUE;",
        "UPDATE entities SET gstin = tax_identifier WHERE gstin IS NULL;",
        "UPDATE entities SET financial_year = '2025-26' WHERE financial_year IS NULL;",
        "UPDATE entities SET status = 'ACTIVE' WHERE status IS NULL;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_company_id INTEGER;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_entity_id INTEGER;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100) DEFAULT 'Finance Team';",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;",
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
        
        # Security & Session Management
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR(255) NOT NULL,
            device VARCHAR(100) DEFAULT 'Desktop PC',
            browser VARCHAR(100) DEFAULT 'Web Browser',
            os VARCHAR(100) DEFAULT 'Operating System',
            ip_address VARCHAR(50),
            location VARCHAR(100) DEFAULT 'Current Location',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_user_sessions_id ON user_sessions (id);",
        "CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions (user_id);",
        "CREATE INDEX IF NOT EXISTS ix_user_sessions_session_token ON user_sessions (session_token);",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);",
        
        # -------------------------------------------------------------
        # 1. Demo Management: demo_admin_users
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
        # 2. Demo Management: demo_requests
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
        # 3. Demo Management: demo_schedule_history
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
        "CREATE INDEX IF NOT EXISTS ix_demo_schedule_history_demo_request_id ON demo_schedule_history (demo_request_id);",
        # -------------------------------------------------------------
        # 4. Product Catalog Extensions & Inventory Tracking
        # -------------------------------------------------------------
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS income_account_id INTEGER REFERENCES accounts(id);",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS expense_account_id INTEGER REFERENCES accounts(id);",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_account_id INTEGER REFERENCES accounts(id);",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS opening_stock_rate NUMERIC(15, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_location VARCHAR(100) DEFAULT 'Main Warehouse';",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert NUMERIC(12, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15, 2) DEFAULT 0.00;",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 18.00;",
        "CREATE INDEX IF NOT EXISTS ix_products_category ON products (category);",

        # -------------------------------------------------------------
        # 5. Team Invitations Delivery Tracking
        # -------------------------------------------------------------
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(50) DEFAULT 'PENDING';",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_delivery_error TEXT;",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_attempts INTEGER DEFAULT 0;"
    ]

    # Execute each statement in its OWN isolated transaction
    for stmt in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            # Notice/ignore already exists or missing optional column
            print(f"Migration statement notice: {e}")

    print("Entity, Demo, and Product schema migration completed.")
    seed_demo_admin_users()
    seed_default_products()


def seed_default_products():
    """Seed default catalog products if table is empty"""
    try:
        from app.models.sales import Product
        from app.models.company import Entity
        db = SessionLocal()
        try:
            if db.query(Product).count() == 0:
                entities = db.query(Entity).filter(Entity.is_active == True).all()
                for ent in entities:
                    p1 = Product(
                        entity_id=ent.id,
                        name="Stainless Steel Water Bottle 1L",
                        sku=f"BOT-SS-1L-{ent.id}",
                        product_type="PRODUCT",
                        category="Merchandise",
                        unit="PCS",
                        selling_price=500.00,
                        purchase_price=200.00,
                        hsn_sac_code="7323",
                        tax_rate=18.00,
                        track_inventory=True,
                        opening_stock=100.00,
                        current_stock=100.00,
                        opening_stock_rate=200.00,
                        reorder_level=20.00,
                        min_stock_alert=10.00,
                        warehouse_location="Main Warehouse",
                        is_active=True
                    )
                    p2 = Product(
                        entity_id=ent.id,
                        name="Financial Advisory & Compliance Retainer",
                        sku=f"SRV-FIN-ADV-{ent.id}",
                        product_type="SERVICE",
                        category="Consulting",
                        unit="HOURS",
                        selling_price=5000.00,
                        purchase_price=0.00,
                        hsn_sac_code="998311",
                        tax_rate=18.00,
                        track_inventory=False,
                        opening_stock=0.00,
                        current_stock=0.00,
                        is_active=True
                    )
                    db.add_all([p1, p2])
                db.commit()
                print("[OK] Default catalog products seeded.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during default products seed: {e}")



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
