import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.sales import RecurringInvoice, Invoice, InvoiceLine, InvoiceStatus, RecurringFrequency
from app.models.purchases import RecurringBill, Bill, BillLine, BillStatus
from app.models.notifications import Notification, NotificationType
from app.models.journal import JournalEntry, Approval, JournalStatus
from app.models.inventory import StockAdjustment
from app.models.sales import Product

def advance_next_date(current_date: date, frequency: str) -> date:
    freq = frequency.upper()
    if freq == "DAILY":
        return current_date + timedelta(days=1)
    elif freq == "WEEKLY":
        return current_date + timedelta(days=7)
    elif freq == "QUARTERLY":
        return current_date + timedelta(days=90)
    elif freq == "ANNUALLY":
        return current_date + timedelta(days=365)
    else:  # MONTHLY default
        return current_date + timedelta(days=30)

def process_due_recurring_invoices(entity_id: int, db: Session) -> List[int]:
    """Scans and generates invoices for active recurring profiles where next_run_date <= today."""
    today = date.today()
    recurring_profiles = db.query(RecurringInvoice).filter(
        RecurringInvoice.entity_id == entity_id,
        RecurringInvoice.is_active == True,
        RecurringInvoice.next_run_date <= today
    ).all()

    generated_invoice_ids = []

    for profile in recurring_profiles:
        # Check if expired
        if profile.end_date and profile.next_run_date > profile.end_date:
            profile.is_active = False
            continue

        invoice_count = db.query(Invoice).filter(Invoice.entity_id == entity_id).count()
        inv_number = f"INV-REC-{profile.id}-{invoice_count + 1:04d}"

        # Parse line items
        try:
            line_items_data = json.loads(profile.line_items_json) if profile.line_items_json else []
        except Exception:
            line_items_data = []

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        
        new_inv = Invoice(
            entity_id=entity_id,
            customer_id=profile.customer_id,
            invoice_number=inv_number,
            invoice_date=profile.next_run_date,
            due_date=profile.next_run_date + timedelta(days=30),
            status=InvoiceStatus.SENT.value if profile.auto_send else InvoiceStatus.DRAFT.value,
            subtotal=Decimal("0.00"),
            taxable_amount=Decimal("0.00"),
            total_tax=Decimal("0.00"),
            total_amount=Decimal(str(profile.total_amount or 0)),
            balance_amount=Decimal(str(profile.total_amount or 0)),
            notes=f"Auto-generated recurring invoice from profile '{profile.profile_name}'"
        )
        db.add(new_inv)
        db.flush()

        for item in line_items_data:
            qty = Decimal(str(item.get("quantity", 1)))
            price = Decimal(str(item.get("unit_price", 0)))
            tax_rate = Decimal(str(item.get("tax_rate", 18)))
            line_taxable = qty * price
            line_tax = round(line_taxable * (tax_rate / Decimal("100.00")), 2)
            line_total = line_taxable + line_tax

            subtotal += line_taxable
            total_tax += line_tax

            inv_line = InvoiceLine(
                invoice_id=new_inv.id,
                product_id=item.get("product_id"),
                description=item.get("description", "Subscription Service"),
                quantity=qty,
                unit_price=price,
                taxable_amount=line_taxable,
                tax_rate=tax_rate,
                total_amount=line_total
            )
            db.add(inv_line)

        if subtotal > 0:
            new_inv.subtotal = subtotal
            new_inv.taxable_amount = subtotal
            new_inv.total_tax = total_tax
            new_inv.total_amount = subtotal + total_tax
            new_inv.balance_amount = new_inv.total_amount

        # Update next run date
        profile.last_run_date = profile.next_run_date
        profile.next_run_date = advance_next_date(profile.next_run_date, profile.frequency)
        
        # Add notification
        notif = Notification(
            entity_id=entity_id,
            notification_type=NotificationType.RECURRING_PROCESSED.value,
            title=f"Recurring Invoice Generated",
            message=f"Invoice {new_inv.invoice_number} ({new_inv.total_amount}) automatically generated for profile '{profile.profile_name}'.",
            link_url="/invoices"
        )
        db.add(notif)
        generated_invoice_ids.append(new_inv.id)

    db.commit()
    return generated_invoice_ids

def trigger_system_alerts_scan(entity_id: int, db: Session) -> int:
    """Checks for overdue invoices, pending approvals, and low stock items to populate notifications."""
    today = date.today()
    created_count = 0

    # 1. Overdue Invoices
    overdue_invoices = db.query(Invoice).filter(
        Invoice.entity_id == entity_id,
        Invoice.status.in_([InvoiceStatus.SENT.value, InvoiceStatus.PARTIALLY_PAID.value]),
        Invoice.due_date < today
    ).limit(5).all()

    for inv in overdue_invoices:
        existing = db.query(Notification).filter(
            Notification.entity_id == entity_id,
            Notification.notification_type == NotificationType.INVOICE_OVERDUE.value,
            Notification.message.like(f"%{inv.invoice_number}%")
        ).first()
        if not existing:
            db.add(Notification(
                entity_id=entity_id,
                notification_type=NotificationType.INVOICE_OVERDUE.value,
                title="Invoice Overdue Alert",
                message=f"Invoice {inv.invoice_number} for customer #{inv.customer_id} is overdue with balance {inv.balance_amount}.",
                link_url="/invoices"
            ))
            created_count += 1

    # 2. Pending Approvals
    pending_approvals = db.query(JournalEntry).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntry.status == JournalStatus.SUBMITTED.value
    ).limit(5).all()

    for je in pending_approvals:
        existing = db.query(Notification).filter(
            Notification.entity_id == entity_id,
            Notification.notification_type == NotificationType.APPROVAL_REQUIRED.value,
            Notification.message.like(f"%Journal Entry #{je.id}%")
        ).first()
        if not existing:
            db.add(Notification(
                entity_id=entity_id,
                notification_type=NotificationType.APPROVAL_REQUIRED.value,
                title="Action Required: Approval Queue",
                message=f"Journal Entry #{je.entry_number or je.id} is pending your maker-checker review.",
                link_url="/approvals"
            ))
            created_count += 1

    # 3. Low Stock Alerts
    low_stock_products = db.query(Product).filter(
        Product.entity_id == entity_id,
        Product.current_stock <= Product.min_stock_alert,
        Product.is_active == True
    ).limit(5).all()

    for prod in low_stock_products:
        existing = db.query(Notification).filter(
            Notification.entity_id == entity_id,
            Notification.notification_type == NotificationType.LOW_STOCK_ALERT.value,
            Notification.message.like(f"%{prod.sku or prod.name}%")
        ).first()
        if not existing:
            db.add(Notification(
                entity_id=entity_id,
                notification_type=NotificationType.LOW_STOCK_ALERT.value,
                title="Low Stock Warning",
                message=f"Product '{prod.name}' ({prod.sku or 'SKU'}) has {prod.current_stock} units left (threshold: {prod.min_stock_alert}).",
                link_url="/inventory"
            ))
            created_count += 1

    db.commit()
    return created_count
