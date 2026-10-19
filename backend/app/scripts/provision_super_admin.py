"""
RicozBooks — Provision / Promote Platform Super Admin
Administrative CLI utility to securely provision or promote an initial Super Admin
without exposing passwords in source code or enabling public registration.

Usage:
  python -m app.scripts.provision_super_admin --email admin@example.com --password YourSecret123! --first-name Super --last-name Admin
  python -m app.scripts.provision_super_admin --email existing_user@example.com --promote-only
"""

import sys
import argparse
import os
from datetime import datetime

from app.database.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.models.audit import AuditLog

def provision_super_admin(
    email: str,
    password: str = None,
    first_name: str = "Super",
    last_name: str = "Admin",
    job_title: str = "Platform Super Administrator",
    promote_only: bool = False
) -> bool:
    email = email.lower().strip()
    if "@" not in email or "." not in email:
        print(f"[ERROR] Invalid email address: {email}", file=sys.stderr)
        return False

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(name="ADMIN", description="Platform Super Administrator")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        if user:
            # Promote existing user
            user.is_superuser = True
            if admin_role not in user.roles:
                user.roles.append(admin_role)
            if password:
                if len(password) < 8:
                    print("[ERROR] Password must be at least 8 characters.", file=sys.stderr)
                    return False
                user.hashed_password = get_password_hash(password)
            user.updated_at = datetime.utcnow()
            
            # Log audit
            audit = AuditLog(
                action="SUPER_ADMIN_PROMOTED",
                record_type="User",
                record_id=str(user.id),
                user_id=user.id,
                user_email=user.email,
                details=f"User {user.email} promoted to Platform Super Admin via CLI utility."
            )
            db.add(audit)
            db.commit()
            print(f"[SUCCESS] User '{user.email}' (ID: {user.id}) successfully elevated to Platform Super Admin.")
            return True
        else:
            if promote_only:
                print(f"[ERROR] User '{email}' not found. Cannot promote non-existent user with --promote-only.", file=sys.stderr)
                return False

            if not password or len(password) < 8:
                print("[ERROR] Password of at least 8 characters is required to create a new Super Admin.", file=sys.stderr)
                return False

            new_user = User(
                email=email,
                hashed_password=get_password_hash(password),
                first_name=first_name,
                last_name=last_name,
                job_title=job_title,
                is_active=True,
                is_superuser=True
            )
            new_user.roles.append(admin_role)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            audit = AuditLog(
                action="SUPER_ADMIN_PROVISIONED",
                record_type="User",
                record_id=str(new_user.id),
                user_id=new_user.id,
                user_email=new_user.email,
                details=f"New Platform Super Admin '{new_user.email}' provisioned via CLI utility."
            )
            db.add(audit)
            db.commit()
            print(f"[SUCCESS] Super Admin '{new_user.email}' (ID: {new_user.id}) provisioned successfully.")
            return True
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to provision Super Admin: {e}", file=sys.stderr)
        return False
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Provision or elevate a RicozBooks Platform Super Admin.")
    parser.add_argument("--email", required=False, default=os.getenv("SUPERADMIN_EMAIL"), help="Super Admin work email")
    parser.add_argument("--password", required=False, default=os.getenv("SUPERADMIN_PASSWORD"), help="Super Admin password (>= 8 chars)")
    parser.add_argument("--first-name", default="Super", help="First Name")
    parser.add_argument("--last-name", default="Admin", help="Last Name")
    parser.add_argument("--job-title", default="Platform Super Administrator", help="Job Title")
    parser.add_argument("--promote-only", action="store_true", help="Only promote an existing user")

    args = parser.parse_args()

    if not args.email:
        print("[ERROR] Email is required (via --email or SUPERADMIN_EMAIL env variable).", file=sys.stderr)
        sys.exit(1)

    success = provision_super_admin(
        email=args.email,
        password=args.password,
        first_name=args.first_name,
        last_name=args.last_name,
        job_title=args.job_title,
        promote_only=args.promote_only
    )
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()

