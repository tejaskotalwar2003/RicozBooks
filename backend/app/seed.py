from datetime import date, datetime
from app.database.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
import app.models  # Register models
from app.models.user import User, Role, Permission
from app.models.company import Company, Entity, Currency, ExchangeRate, FiscalPeriod
from app.models.account import Account, AccountType, NormalBalance
from app.models.close import ClosePeriod, CloseTask, CloseStatus
from app.models.audit import AuditLog

def seed():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    from app.migrate_entities import migrate_entities
    migrate_entities()
    db = SessionLocal()
    
    try:
        # 1. Seed Currencies
        currencies = [
            Currency(code="INR", name="Indian Rupee", symbol="₹", decimal_places=2, is_active=True),
            Currency(code="USD", name="US Dollar", symbol="$", decimal_places=2, is_active=True),
            Currency(code="GBP", name="British Pound", symbol="£", decimal_places=2, is_active=True),
            Currency(code="EUR", name="Euro", symbol="€", decimal_places=2, is_active=True),
        ]
        for c in currencies:
            if not db.query(Currency).filter(Currency.code == c.code).first():
                db.add(c)
        db.commit()
        print("[OK] Currencies seeded.")

        # 2. Seed Exchange Rates
        rates = [
            ExchangeRate(from_currency="USD", to_currency="INR", rate=83.50, effective_date=date.today()),
            ExchangeRate(from_currency="GBP", to_currency="INR", rate=108.20, effective_date=date.today()),
            ExchangeRate(from_currency="EUR", to_currency="INR", rate=91.10, effective_date=date.today()),
            ExchangeRate(from_currency="INR", to_currency="INR", rate=1.00, effective_date=date.today()),
        ]
        for r in rates:
            existing = db.query(ExchangeRate).filter(
                ExchangeRate.from_currency == r.from_currency,
                ExchangeRate.to_currency == r.to_currency
            ).first()
            if not existing:
                db.add(r)
        db.commit()
        print("[OK] Exchange rates seeded.")

        # 3. Seed Roles & Permissions
        roles_data = {
            "ADMIN": "Full system administrator access across all entities and modules",
            "ORG_ADMIN": "Organization Admin / Owner: full control over company workspace, team, settings, and financial operations",
            "MANAGER": "Finance Manager: approvals, period close, account governance, and reports",
            "ACCOUNTANT": "Operational accounting access: create & submit journals, view ledgers & reports",
            "REVIEWER": "Supervisory review access: review, approve, reject journals and close tasks"
        }
        roles_dict = {}
        for role_name, desc in roles_data.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=desc)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles_dict[role_name] = role
        print("[OK] Roles seeded.")

        # Permissions
        perms_data = [
            ("journals:create", "Create Journal Entries", "journals"),
            ("journals:edit_draft", "Edit Draft Journal Entries", "journals"),
            ("journals:submit", "Submit Journals for Review", "journals"),
            ("journals:review", "Review Submitted Journals", "journals"),
            ("journals:approve", "Approve Journal Entries", "journals"),
            ("journals:reject", "Reject Journal Entries", "journals"),
            ("journals:post", "Post Approved Journals to Ledger", "journals"),
            ("journals:reverse", "Reverse Posted Journals", "journals"),
            ("ledger:view", "View General Ledger", "ledger"),
            ("reports:view", "View Financial Reports", "reports"),
            ("close:manage", "Manage Period-End Close", "close"),
            ("entities:manage", "Manage Legal Entities", "entities"),
            ("users:manage", "Manage Users & Roles", "users"),
            ("audit:view", "View Audit Logs", "audit"),
            ("tenants:manage", "Manage Organization, Members & Invitations", "tenants"),
        ]
        for code, name, module in perms_data:
            p = db.query(Permission).filter(Permission.code == code).first()
            if not p:
                p = Permission(code=code, name=name, module=module)
                db.add(p)
                db.commit()
                db.refresh(p)
            # Assign to ADMIN & ORG_ADMIN (all permissions)
            if p not in roles_dict["ADMIN"].permissions:
                roles_dict["ADMIN"].permissions.append(p)
            if p not in roles_dict["ORG_ADMIN"].permissions:
                roles_dict["ORG_ADMIN"].permissions.append(p)
            # Assign to MANAGER
            if module in ["journals", "ledger", "reports", "close", "audit", "entities"]:
                if p not in roles_dict["MANAGER"].permissions:
                    roles_dict["MANAGER"].permissions.append(p)
            # Assign to ACCOUNTANT
            if module in ["journals", "ledger", "reports", "close"] and "approve" not in code and "reject" not in code and "post" not in code:
                if p not in roles_dict["ACCOUNTANT"].permissions:
                    roles_dict["ACCOUNTANT"].permissions.append(p)
            # Assign to REVIEWER
            if "review" in code or "approve" in code or "reject" in code or "post" in code or code in ["ledger:view", "reports:view", "audit:view"]:
                if p not in roles_dict["REVIEWER"].permissions:
                    roles_dict["REVIEWER"].permissions.append(p)
        db.commit()
        print("[OK] Permissions seeded.")

        # 4. Seed Company: Ricoz Technologies
        company = db.query(Company).filter(Company.code == "RICOZ_TECH").first()
        if not company:
            company = Company(
                name="Ricoz Technologies",
                code="RICOZ_TECH",
                legal_name="Ricoz Technologies Global Holdings Inc.",
                tax_identifier="U72200MH2023PTC402891",
                base_currency="INR"
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        print(f"[OK] Company '{company.name}' seeded.")

        # 5. Seed Entities: Ricoz India, Ricoz US, Ricoz UK
        entities_data = [
            {
                "name": "Ricoz India",
                "code": "RICOZ_IN",
                "legal_name": "Ricoz Technologies India Private Limited",
                "country": "India",
                "jurisdiction": "Maharashtra",
                "tax_identifier": "27AAACA1234F1Z5", # GSTIN
                "base_currency": "INR"
            },
            {
                "name": "Ricoz US",
                "code": "RICOZ_US",
                "legal_name": "Ricoz America LLC",
                "country": "United States",
                "jurisdiction": "Delaware",
                "tax_identifier": "EIN-84-9382109",
                "base_currency": "USD"
            },
            {
                "name": "Ricoz UK",
                "code": "RICOZ_UK",
                "legal_name": "Ricoz UK Limited",
                "country": "United Kingdom",
                "jurisdiction": "England & Wales",
                "tax_identifier": "GB998234120", # VAT
                "base_currency": "GBP"
            },
        ]
        entities_dict = {}
        for ed in entities_data:
            ent = db.query(Entity).filter(Entity.code == ed["code"]).first()
            if not ent:
                ent = Entity(
                    company_id=company.id,
                    name=ed["name"],
                    code=ed["code"],
                    legal_name=ed["legal_name"],
                    country=ed["country"],
                    jurisdiction=ed["jurisdiction"],
                    tax_identifier=ed["tax_identifier"],
                    base_currency=ed["base_currency"],
                    is_active=True
                )
                db.add(ent)
                db.commit()
                db.refresh(ent)
            entities_dict[ed["code"]] = ent
        print("[OK] Entities seeded.")

        # 6. Seed Users: Admin, Accountant, Reviewer
        users_data = [
            {
                "email": "admin@ricozbooks.com",
                "password": "admin123",
                "first_name": "Vikram",
                "last_name": "Sharma",
                "job_title": "Chief Financial Officer",
                "is_superuser": True,
                "role": "ADMIN",
                "default_entity": entities_dict["RICOZ_IN"]
            },
            {
                "email": "accountant@ricozbooks.com",
                "password": "accountant123",
                "first_name": "Priya",
                "last_name": "Nair",
                "job_title": "Senior Accountant",
                "is_superuser": False,
                "role": "ACCOUNTANT",
                "default_entity": entities_dict["RICOZ_IN"]
            },
            {
                "email": "reviewer@ricozbooks.com",
                "password": "reviewer123",
                "first_name": "Arjun",
                "last_name": "Mehta",
                "job_title": "Financial Controller & Reviewer",
                "is_superuser": False,
                "role": "REVIEWER",
                "default_entity": entities_dict["RICOZ_IN"]
            }
        ]
        
        for ud in users_data:
            user = db.query(User).filter(User.email == ud["email"]).first()
            if not user:
                user = User(
                    email=ud["email"],
                    hashed_password=get_password_hash(ud["password"]),
                    first_name=ud["first_name"],
                    last_name=ud["last_name"],
                    job_title=ud["job_title"],
                    is_superuser=ud["is_superuser"],
                    default_company_id=company.id,
                    default_entity_id=ud["default_entity"].id,
                    is_active=True
                )
                user.roles.append(roles_dict[ud["role"]])
                # Assign access to all entities
                user.entities = list(entities_dict.values())
                db.add(user)
                db.commit()
                db.refresh(user)
        print("[OK] Users seeded with secure credentials.")

        # 7. Seed Chart of Accounts for Ricoz India (INR)
        standard_accounts = [
            ("1000", "Cash on Hand", AccountType.ASSET, NormalBalance.DEBIT, "INR", "Petty cash and liquid currency"),
            ("1100", "Bank Accounts (HDFC & ICICI)", AccountType.ASSET, NormalBalance.DEBIT, "INR", "Primary operating bank accounts"),
            ("1200", "Accounts Receivable (Debtors)", AccountType.ASSET, NormalBalance.DEBIT, "INR", "Invoiced customer receivables"),
            ("1300", "Merchandise Inventory", AccountType.ASSET, NormalBalance.DEBIT, "INR", "Current trading inventory asset"),
            ("2000", "Accounts Payable (Creditors)", AccountType.LIABILITY, NormalBalance.CREDIT, "INR", "Outstanding vendor bills and payables"),
            ("2100", "GST / Tax Output Payable", AccountType.LIABILITY, NormalBalance.CREDIT, "INR", "Statutory GST output liability"),
            ("3000", "Share Capital", AccountType.EQUITY, NormalBalance.CREDIT, "INR", "Paid-up equity share capital"),
            ("3100", "Retained Earnings", AccountType.EQUITY, NormalBalance.CREDIT, "INR", "Accumulated retained financial earnings"),
            ("4000", "Sales & SaaS Revenue", AccountType.REVENUE, NormalBalance.CREDIT, "INR", "Primary operating software subscription income"),
            ("5000", "Salary & Payroll Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "INR", "Employee compensation and benefits"),
            ("5100", "Office Rent Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "INR", "Commercial real estate lease expenses"),
            ("5200", "Utilities & Cloud Infra Expense", AccountType.EXPENSE, NormalBalance.DEBIT, "INR", "Electricity, AWS/Azure, internet utilities"),
            ("5700", "Cost of Goods Sold (COGS)", AccountType.EXPENSE, NormalBalance.DEBIT, "INR", "Cost of inventory and merchandise sold"),
        ]
        
        for ent_code, entity in entities_dict.items():
            for code, name, acc_type, norm_bal, curr, desc in standard_accounts:
                curr_for_ent = entity.base_currency
                acc = db.query(Account).filter(
                    Account.entity_id == entity.id,
                    Account.code == code
                ).first()
                if not acc:
                    acc = Account(
                        entity_id=entity.id,
                        code=code,
                        name=name,
                        account_type=acc_type,
                        normal_balance=norm_bal,
                        currency=curr_for_ent,
                        description=desc,
                        is_active=True
                    )
                    db.add(acc)
            db.commit()
        print("[OK] Standard Chart of Accounts seeded across all entities.")

        # 8. Seed Fiscal Periods & September 2026 Close
        ind_ent = entities_dict["RICOZ_IN"]
        period = db.query(FiscalPeriod).filter(
            FiscalPeriod.entity_id == ind_ent.id,
            FiscalPeriod.fiscal_year == "2026-27",
            FiscalPeriod.period_number == 6
        ).first()
        if not period:
            period = FiscalPeriod(
                entity_id=ind_ent.id,
                fiscal_year="2026-27",
                period_number=6,
                name="September 2026",
                start_date=date(2026, 9, 1),
                end_date=date(2026, 9, 30),
                is_closed=False
            )
            db.add(period)
            db.commit()
            db.refresh(period)

        close_period = db.query(ClosePeriod).filter(ClosePeriod.entity_id == ind_ent.id).first()
        if not close_period:
            close_period = ClosePeriod(
                entity_id=ind_ent.id,
                period_name="September 2026 Close",
                fiscal_year="2026-27",
                month=9,
                status="IN_PROGRESS",
                completion_percentage=75,
                target_date=date(2026, 10, 5)
            )
            db.add(close_period)
            db.commit()
            db.refresh(close_period)

            tasks = [
                ("Bank Reconciliation", "Reconcile HDFC and ICICI bank statements with ledger", CloseStatus.APPROVED),
                ("Accrued Expenses", "Calculate and post monthly accruals for utilities and unbilled vendor costs", CloseStatus.APPROVED),
                ("Depreciation Posting", "Run fixed asset straight-line depreciation schedule", CloseStatus.APPROVED),
                ("Revenue Recognition Review", "Verify SaaS MRR recognition against active subscriptions", CloseStatus.APPROVED),
                ("Intercompany Reconciliation", "Match intercompany balances between Ricoz India and US", CloseStatus.APPROVED),
                ("GST 2B Reconciliation", "Match GSTR-2B input tax credit against purchase register", CloseStatus.APPROVED),
                ("Journal Entry Review", "Complete final supervisory review on unposted journal vouchers", CloseStatus.IN_PROGRESS),
                ("Management Final Approval", "CFO sign-off and ledger lock for Sep 2026", CloseStatus.NOT_STARTED),
            ]
            for tname, tdesc, tstatus in tasks:
                task = CloseTask(
                    close_period_id=close_period.id,
                    task_name=tname,
                    description=tdesc,
                    due_date=date(2026, 10, 5),
                    status=tstatus,
                    notes="Automated close tracker task"
                )
                db.add(task)
            db.commit()
        print("[OK] Close Manager periods and tasks seeded.")

        # 9. Record Initial System Audit Event
        admin_user = db.query(User).filter(User.email == "admin@ricozbooks.com").first()
        init_audit = AuditLog(
            action="SYSTEM_INITIALIZED",
            record_type="System",
            record_id="v1.0.0",
            user_id=admin_user.id,
            user_email=admin_user.email,
            entity_id=ind_ent.id,
            details="RicozBooks enterprise accounting database seeded and initialized."
        )
        db.add(init_audit)
        db.commit()
        print("[OK] System audit log recorded.")

        print("\n=======================================================")
        print(" RicozBooks Database Seed Completed Successfully!")
        print(" Demo Credentials:")
        print("   Admin:      admin@ricozbooks.com      / admin123")
        print("   Accountant: accountant@ricozbooks.com / accountant123")
        print("   Reviewer:   reviewer@ricozbooks.com   / reviewer123")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
