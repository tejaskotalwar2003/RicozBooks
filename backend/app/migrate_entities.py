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
        "ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS email_status VARCHAR(30) DEFAULT 'PENDING';",
        "ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS email_error TEXT;",
        "UPDATE organization_invitations SET email_status = 'PENDING' WHERE email_status IS NULL;",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(50) DEFAULT 'PENDING';",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_delivery_error TEXT;",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_attempts INTEGER DEFAULT 0;",

        # -------------------------------------------------------------
        # 6. Sales Invoices & Customers Master Schema Extensions
        # -------------------------------------------------------------
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_token VARCHAR(64);",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_invoices_payment_token ON invoices (payment_token);",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(150);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan VARCHAR(20);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15, 2) DEFAULT 0.00;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15, 2) DEFAULT 0.00;",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);",
        "ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS notes TEXT;",

        # -------------------------------------------------------------
        # 7. Departments Architecture & User Department Mapping
        # -------------------------------------------------------------
        """
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            head_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_departments_id ON departments (id);",
        "CREATE INDEX IF NOT EXISTS ix_departments_code ON departments (code);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;",
        "CREATE INDEX IF NOT EXISTS ix_users_department_id ON users (department_id);",
        
        # Organization Invitation Department Extensions
        "ALTER TABLE organization_invitations ALTER COLUMN company_id DROP NOT NULL;",
        "ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;",
        "ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS is_department_head BOOLEAN DEFAULT FALSE;",
        "CREATE INDEX IF NOT EXISTS ix_organization_invitations_department_id ON organization_invitations (department_id);"
    ]

    # Execute each statement in its OWN isolated transaction
    for stmt in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            # Notice/ignore already exists or missing optional column
            print(f"Migration statement notice: {e}")

    print("Entity, Demo, Product, and Invoice schema migration completed.")
    seed_demo_admin_users()
    seed_default_products()
    seed_default_customers()
    seed_default_departments()
    seed_default_roles()
    seed_granular_permissions_and_matrix()


def seed_default_roles():
    """Ensure standard platform roles exist in the database."""
    try:
        from app.models.user import Role
        db = SessionLocal()
        try:
            roles_to_seed = [
                ("SUPER_ADMIN", "Platform Super Administrator with complete system authority"),
                ("DEVELOPER", "Platform Developer / System Administrator"),
                ("DEPARTMENT_HEAD", "Departmental Head with authority to manage departmental team members and operations"),
                ("TEAM_MEMBER", "Departmental team member with module access authorized by department head"),
                ("ORG_ADMIN", "Organization Admin / Owner: full control over company workspace"),
                ("MANAGER", "Finance / Operational Manager"),
                ("ACCOUNTANT", "Operational accounting and transaction access"),
                ("REVIEWER", "Supervisory review and approval access"),
                ("ADMIN", "System administrator access across entities and modules"),
            ]
            for r_name, r_desc in roles_to_seed:
                r_obj = db.query(Role).filter(Role.name == r_name).first()
                if not r_obj:
                    r_obj = Role(name=r_name, description=r_desc)
                    db.add(r_obj)
            db.commit()
            print("[OK] Standard roles verified.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during default roles seed: {e}")


def seed_granular_permissions_and_matrix():
    """Idempotently seed the comprehensive permission catalog and establish baseline role-permission matrix."""
    try:
        from app.models.user import Role, Permission
        db = SessionLocal()
        try:
            # 1. Define complete permission catalog across platform, operations, and accounting domains
            catalog = [
                # Platform & Console Administration
                ("developer:administer", "Platform Administration", "developer", "Full platform administration, security management, and console access"),
                ("roles:read", "View Roles & Permissions", "roles", "View platform roles and role-permission matrix"),
                ("roles:manage", "Manage Role Permissions", "roles", "Assign and update configurable permissions for platform and tenant roles"),
                ("departments:read", "View Departments", "departments", "View active departments, leadership, and member rosters"),
                ("departments:manage", "Manage Departments", "departments", "Create and edit departments, assign and replace department heads"),
                ("users:read", "View Platform Users", "users", "View platform user directory, department assignments, and activity status"),
                ("users:manage", "Manage Platform Users", "users", "Update user departments, primary roles, and account suspension status"),
                ("invitations:create", "Create User Invitations", "invitations", "Create and issue invitations for platform departments and tenant workspaces"),
                ("invitations:manage", "Manage User Invitations", "invitations", "Resend, revoke, and track delivery status of pending invitations"),
                ("audit:read", "View Administrative Audit Logs", "audit", "Search, filter, and inspect central platform audit trail entries"),
                ("audit:export", "Export Audit Records", "audit", "Export administrative audit trail logs for compliance and reporting"),

                # Journal & Financial Ledger Core Permissions
                ("journals:create", "Create Journal Entries", "journals", "Create new draft journal entries"),
                ("journals:edit_draft", "Edit Draft Journal Entries", "journals", "Edit existing unposted draft journals"),
                ("journals:submit", "Submit Journals for Review", "journals", "Submit draft journals for supervisor approval"),
                ("journals:review", "Review Submitted Journals", "journals", "Review submitted journals prior to posting"),
                ("journals:approve", "Approve Journal Entries", "journals", "Approve reviewed journals for ledger posting"),
                ("journals:reject", "Reject Journal Entries", "journals", "Reject submitted journals with review notes"),
                ("journals:post", "Post Approved Journals to Ledger", "journals", "Post approved journals to financial ledgers"),
                ("journals:reverse", "Reverse Posted Journals", "journals", "Create reversing entries for posted journals"),
                ("ledger:view", "View General Ledger", "ledger", "Inspect general ledger accounts and posted entries"),
                ("reports:view", "View Financial Reports", "reports", "Generate and view financial statements and reports"),
                ("close:manage", "Manage Period-End Close", "close", "Execute period-end accounting close procedures"),
                ("entities:manage", "Manage Legal Entities", "entities", "Create and configure legal entities, GSTIN, and settings"),
                ("entities:read", "View Legal Entities", "entities", "View organization legal entities and profile details"),
                ("audit:view", "View Audit Logs", "audit", "View tenant-level audit activity logs"),
                ("tenants:manage", "Manage Organization, Members & Invitations", "tenants", "Configure company settings and manage members"),
                ("tenants:read", "View Organization Profile", "tenants", "View company information and subscription details"),

                # 5 Canonical Departmental Domains
                # Finance & Accounting
                ("finance:read", "View Financial Accounts & Statements", "finance", "View financial balances, accounts, and tax summaries"),
                ("finance:create", "Create Financial Transactions", "finance", "Record financial vouchers, bills, and credit notes"),
                ("finance:update", "Update Financial Records", "finance", "Modify editable finance drafts and vouchers"),
                ("finance:approve", "Approve Financial Operations", "finance", "Authorize high-value transactions and period reconciliations"),
                ("finance:manage", "Manage Financial Governance", "finance", "Configure chart of accounts, currencies, and fiscal years"),

                # Operations
                ("operations:read", "View Operations Workflows", "operations", "View customer onboarding tasks and operational queues"),
                ("operations:create", "Create Operational Tasks", "operations", "Log operational workflows and customer onboarding items"),
                ("operations:update", "Update Operational Tasks", "operations", "Update status and notes on active operational workflows"),
                ("operations:manage", "Coordinate Operations", "operations", "Assign operational tasks and oversee fulfillment queues"),

                # Technical & Engineering
                ("technical:read", "View Technical Health & Telemetry", "technical", "Inspect system health, API response times, and error traces"),
                ("technical:update", "Update Incident Status", "technical", "Manage incident notes and technical triage status"),
                ("technical:manage", "Perform Engineering Diagnostics", "technical", "Execute technical diagnostic tools and integration tests"),

                # Sales & Demo Management
                ("sales:read", "View Sales Demos & Prospects", "sales", "View inbound demo requests and prospect pipelines"),
                ("sales:create", "Schedule Demo Sessions", "sales", "Create demo appointments and prospect engagement records"),
                ("sales:update", "Update Demo Pipeline Status", "sales", "Update prospect notes, reschedule demos, and log outcomes"),
                ("sales:manage", "Manage Sales Coordination", "sales", "Assign demo coordinators, allocate leads, and set schedules"),

                # Customer Support
                ("support:read", "View Support Inquiries", "support", "View customer support tickets, inquiries, and client cases"),
                ("support:create", "Create Support Cases", "support", "Log new support tickets and customer communications"),
                ("support:update", "Update Support Cases", "support", "Update ticket progress, triage priority, and resolutions"),
                ("support:manage", "Manage Support Operations", "support", "Assign tickets, oversee escalation SLAs, and manage resolution queues"),
            ]

            perms_by_code = {}
            for code, name, module, desc in catalog:
                p = db.query(Permission).filter(Permission.code == code).first()
                if not p:
                    p = Permission(code=code, name=name, module=module, description=desc)
                    db.add(p)
                    db.flush()
                else:
                    if not p.description and desc:
                        p.description = desc
                perms_by_code[code] = p

            db.commit()

            # 2. Establish Default Role-Permission Matrix
            roles = {r.name: r for r in db.query(Role).all()}

            def assign_perms_if_needed(role_name: str, codes: list):
                r = roles.get(role_name)
                if not r:
                    return
                existing_codes = set(p.code for p in r.permissions)
                to_add = [perms_by_code[c] for c in codes if c in perms_by_code and c not in existing_codes]
                if to_add:
                    r.permissions.extend(to_add)

            # SUPER_ADMIN: Gets all permissions
            super_admin = roles.get("SUPER_ADMIN")
            if super_admin:
                all_perms = list(perms_by_code.values())
                existing_ids = set(p.id for p in super_admin.permissions)
                for p in all_perms:
                    if p.id not in existing_ids:
                        super_admin.permissions.append(p)

            # DEVELOPER: Technical + Platform management
            dev_codes = [
                "developer:administer", "roles:read", "departments:read", "departments:manage",
                "users:read", "users:manage", "invitations:create", "invitations:manage",
                "audit:read", "audit:export", "technical:read", "technical:update", "technical:manage",
                "operations:read", "finance:read"
            ]
            assign_perms_if_needed("DEVELOPER", dev_codes)

            # DEPARTMENT_HEAD: Base management permissions + departmental reads
            dept_head_codes = [
                "departments:read", "users:read", "invitations:create", "invitations:manage",
                "finance:read", "operations:read", "technical:read", "sales:read", "support:read",
                "operations:manage", "sales:manage", "support:manage"
            ]
            assign_perms_if_needed("DEPARTMENT_HEAD", dept_head_codes)

            # TEAM_MEMBER: Member read permissions
            team_member_codes = [
                "departments:read", "users:read", "operations:read", "support:read"
            ]
            assign_perms_if_needed("TEAM_MEMBER", team_member_codes)

            # ORG_ADMIN & ADMIN: Tenant admin permissions
            tenant_admin_codes = [
                "entities:manage", "entities:read", "tenants:manage", "tenants:read",
                "users:manage", "users:read", "audit:view",
                "journals:create", "journals:edit_draft", "journals:submit", "journals:review",
                "journals:approve", "journals:reject", "journals:post", "journals:reverse",
                "ledger:view", "reports:view", "close:manage",
                "finance:read", "finance:create", "finance:update", "finance:approve", "finance:manage"
            ]
            assign_perms_if_needed("ORG_ADMIN", tenant_admin_codes)
            assign_perms_if_needed("ADMIN", tenant_admin_codes)

            # MANAGER
            manager_codes = [
                "entities:read", "entities:manage", "audit:view",
                "journals:create", "journals:edit_draft", "journals:submit", "journals:review",
                "journals:approve", "journals:reject", "journals:post", "journals:reverse",
                "ledger:view", "reports:view", "close:manage",
                "finance:read", "finance:create", "finance:update", "finance:approve"
            ]
            assign_perms_if_needed("MANAGER", manager_codes)

            # ACCOUNTANT
            accountant_codes = [
                "entities:read",
                "journals:create", "journals:edit_draft", "journals:submit", "journals:review", "journals:reverse",
                "ledger:view", "reports:view", "close:manage",
                "finance:read", "finance:create", "finance:update"
            ]
            assign_perms_if_needed("ACCOUNTANT", accountant_codes)

            # REVIEWER
            reviewer_codes = [
                "entities:read", "audit:view",
                "journals:review", "journals:approve", "journals:reject", "journals:post",
                "ledger:view", "reports:view",
                "finance:read", "finance:approve"
            ]
            assign_perms_if_needed("REVIEWER", reviewer_codes)

            db.commit()
            print("[OK] Granular permissions and baseline matrix seeded.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during granular permissions seeding: {e}")


def seed_default_departments():
    """Seed the 5 default platform departments idempotently."""
    try:
        from app.models.department import Department
        db = SessionLocal()
        try:
            default_depts = [
                (
                    "FINANCE_ACCOUNTING",
                    "Finance & Accounting",
                    "Accounting workflows, financial ledgers, journals, tax compliance, and reconciliation review."
                ),
                (
                    "OPERATIONS",
                    "Operations",
                    "Customer onboarding, operational task coordination, workflow monitoring, and period-end coordination."
                ),
                (
                    "TECHNICAL_ENGINEERING",
                    "Technical & Engineering",
                    "Software stability, API monitoring, infrastructure incidents, and engineering task coordination."
                ),
                (
                    "SALES_DEMO",
                    "Sales & Demo Management",
                    "Demo requests, prospect scheduling, lead follow-ups, and sales coordination."
                ),
                (
                    "CUSTOMER_SUPPORT",
                    "Customer Support",
                    "Customer support tickets, inquiry triage, issue resolution tracking, and client communication."
                )
            ]
            added_any = False
            for code, name, desc in default_depts:
                existing = db.query(Department).filter(Department.code == code).first()
                if not existing:
                    dept = Department(
                        code=code,
                        name=name,
                        description=desc,
                        is_active=True
                    )
                    db.add(dept)
                    added_any = True
            if added_any:
                db.commit()
                print("[OK] Default departments seeded successfully.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during default department seeding: {e}")


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


def seed_default_customers():
    """Seed default enterprise customer if table is empty"""
    try:
        from app.models.sales import Customer
        from app.models.company import Entity
        db = SessionLocal()
        try:
            if db.query(Customer).count() == 0:
                entities = db.query(Entity).filter(Entity.is_active == True).all()
                for ent in entities:
                    c1 = Customer(
                        entity_id=ent.id,
                        name="Acme Global Solutions Pvt Ltd",
                        company_name="Acme Global Solutions Pvt Ltd",
                        email="accounts@acmeglobal.com",
                        phone="+91 98200 98200",
                        gstin="27AAACA9999F1Z1",
                        pan="AAACA9999F",
                        billing_address="Tower B, Tech Park, Andheri East",
                        city="Mumbai",
                        state="Maharashtra",
                        postal_code="400069",
                        country="India",
                        payment_terms_days=30,
                        opening_balance=0.00,
                        current_balance=0.00,
                        currency="INR",
                        is_active=True
                    )
                    db.add(c1)
                db.commit()
                print("[OK] Default customer seeded.")
        finally:
            db.close()
    except Exception as e:
        print(f"Notice during default customers seed: {e}")



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
