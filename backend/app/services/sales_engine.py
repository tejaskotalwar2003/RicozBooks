import re
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.sales import Customer, Product, Invoice, InvoiceLine, InvoiceStatus, CustomerPayment, Estimate, EstimateLine, EstimateStatus
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.user import User
from app.services.accounting_engine import validate_period_open

def quantize_amount(val: Decimal) -> Decimal:
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_invoice_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_inv = db.query(Invoice).filter(
        Invoice.entity_id == entity_id,
        Invoice.invoice_number.like(f"INV-{current_year}-%")
    ).order_by(desc(Invoice.id)).first()

    if last_inv:
        match = re.search(r'INV-\d{4}-(\d+)', last_inv.invoice_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"INV-{current_year}-{seq:04d}"

def generate_payment_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_pay = db.query(CustomerPayment).filter(
        CustomerPayment.entity_id == entity_id,
        CustomerPayment.payment_number.like(f"RCP-{current_year}-%")
    ).order_by(desc(CustomerPayment.id)).first()

    if last_pay:
        match = re.search(r'RCP-\d{4}-(\d+)', last_pay.payment_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"RCP-{current_year}-{seq:04d}"

def generate_estimate_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_est = db.query(Estimate).filter(
        Estimate.entity_id == entity_id,
        Estimate.estimate_number.like(f"EST-{current_year}-%")
    ).order_by(desc(Estimate.id)).first()

    if last_est:
        match = re.search(r'EST-\d{4}-(\d+)', last_est.estimate_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"EST-{current_year}-{seq:04d}"

def is_intra_state_supply(entity: Entity, customer: Customer) -> bool:
    """Intra-state if both are in the same Indian state. Otherwise inter-state (IGST)."""
    ent_state = (entity.state or "").strip().lower()
    cust_state = (customer.state or "").strip().lower()
    if not ent_state or not cust_state:
        return True  # Default to intra-state if unspecified
    return ent_state == cust_state

def get_or_create_account(
    db: Session, 
    entity_id: int, 
    code: str, 
    name: str, 
    acc_type: AccountType, 
    norm_bal: NormalBalance, 
    currency: str = "INR"
) -> Account:
    acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == code
    ).first()
    if not acc:
        acc = Account(
            entity_id=entity_id,
            code=code,
            name=name,
            account_type=acc_type,
            normal_balance=norm_bal,
            currency=currency,
            is_active=True
        )
        db.add(acc)
        db.flush()
    return acc

def post_invoice_to_general_ledger(
    db: Session,
    invoice: Invoice,
    current_user: User
) -> JournalEntry:
    """
    Finalizes an Invoice and posts the balanced double-entry transaction:
    Debit: Accounts Receivable (1200) for Total Amount
    Credit: Operating Sales Revenue (4000) for Taxable Amount
    Credit: CGST Output (2100) for CGST Amount (if intra-state)
    Credit: SGST Output (2110) for SGST Amount (if intra-state)
    Credit: IGST Output (2120) for IGST Amount (if inter-state)
    """
    if invoice.status in [InvoiceStatus.PAID.value, "POSTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already posted to the General Ledger."
        )

    # 1. Period Lock Check
    validate_period_open(db, invoice.entity_id, invoice.invoice_date)

    # 2. Retrieve accounts
    ar_acc = get_or_create_account(db, invoice.entity_id, "1200", "Accounts Receivable (AR)", AccountType.ASSET, NormalBalance.DEBIT, invoice.currency)
    rev_acc = get_or_create_account(db, invoice.entity_id, "4000", "Operating Sales Revenue", AccountType.REVENUE, NormalBalance.CREDIT, invoice.currency)
    
    lines = []
    line_no = 1
    total_deb = quantize_amount(Decimal(str(invoice.total_amount)))
    total_cred = Decimal("0.00")

    # Line 1: Debit Accounts Receivable
    lines.append(JournalEntryLine(
        line_number=line_no,
        account_id=ar_acc.id,
        description=f"Receivable from {invoice.customer.name} - Inv #{invoice.invoice_number}",
        debit=total_deb,
        credit=Decimal("0.00"),
        base_debit=total_deb,
        base_credit=Decimal("0.00")
    ))
    line_no += 1

    # Line 2: Credit Sales Revenue
    taxable = quantize_amount(Decimal(str(invoice.taxable_amount)))
    lines.append(JournalEntryLine(
        line_number=line_no,
        account_id=rev_acc.id,
        description=f"Sales Revenue - Inv #{invoice.invoice_number}",
        debit=Decimal("0.00"),
        credit=taxable,
        base_debit=Decimal("0.00"),
        base_credit=taxable
    ))
    total_cred += taxable
    line_no += 1

    # Line 3: CGST Output (if any)
    cgst_amt = quantize_amount(Decimal(str(invoice.cgst_amount)))
    if cgst_amt > 0:
        cgst_acc = get_or_create_account(db, invoice.entity_id, "2100", "Statutory Tax / CGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=cgst_acc.id,
            description=f"Output CGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=cgst_amt,
            base_debit=Decimal("0.00"),
            base_credit=cgst_amt
        ))
        total_cred += cgst_amt
        line_no += 1

    # Line 4: SGST Output (if any)
    sgst_amt = quantize_amount(Decimal(str(invoice.sgst_amount)))
    if sgst_amt > 0:
        sgst_acc = get_or_create_account(db, invoice.entity_id, "2110", "Statutory Tax / SGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=sgst_acc.id,
            description=f"Output SGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=sgst_amt,
            base_debit=Decimal("0.00"),
            base_credit=sgst_amt
        ))
        total_cred += sgst_amt
        line_no += 1

    # Line 5: IGST Output (if any)
    igst_amt = quantize_amount(Decimal(str(invoice.igst_amount)))
    if igst_amt > 0:
        igst_acc = get_or_create_account(db, invoice.entity_id, "2120", "Statutory Tax / IGST Output", AccountType.LIABILITY, NormalBalance.CREDIT, invoice.currency)
        lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=igst_acc.id,
            description=f"Output IGST - Inv #{invoice.invoice_number}",
            debit=Decimal("0.00"),
            credit=igst_amt,
            base_debit=Decimal("0.00"),
            base_credit=igst_amt
        ))
        total_cred += igst_amt
        line_no += 1

    # Rounding difference check (if 1 cent off)
    diff = total_deb - total_cred
    if diff != Decimal("0.00") and abs(diff) <= Decimal("0.05"):
        # Adjust slightly on revenue to maintain strict double-entry equality
        lines[1].credit += diff
        lines[1].base_credit += diff
        total_cred += diff

    if total_deb != total_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double-entry imbalance: Total Debit ({total_deb}) != Total Credit ({total_cred})"
        )

    # 3. Create Journal Entry
    je = JournalEntry(
        entity_id=invoice.entity_id,
        entry_number=f"JE-{invoice.invoice_number}",
        entry_date=invoice.invoice_date,
        description=f"Sales Invoice #{invoice.invoice_number} - {invoice.customer.name}",
        reference=invoice.invoice_number,
        currency=invoice.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=total_deb,
        total_credit=total_cred,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    for line in lines:
        line.journal_entry_id = je.id
        db.add(line)

    # 4. Update Invoice & Customer Balance
    invoice.journal_entry_id = je.id
    invoice.status = InvoiceStatus.SENT.value if invoice.paid_amount == 0 else (InvoiceStatus.PAID.value if invoice.balance_amount == 0 else InvoiceStatus.PARTIALLY_PAID.value)
    
    customer = invoice.customer
    customer.current_balance = quantize_amount(Decimal(str(customer.current_balance or 0)) + total_deb)

    db.commit()
    db.refresh(invoice)
    db.refresh(customer)
    return je

def record_customer_payment_transaction(
    db: Session,
    payment_in: CustomerPayment,
    current_user: User
) -> CustomerPayment:
    """
    Records customer payment received, decrements invoice balance, updates customer ledger,
    and creates balanced General Ledger transaction:
    Debit: Bank Account (1100) or Cash (1000) for payment amount
    Credit: Accounts Receivable (1200) for payment amount
    """
    pay_amt = quantize_amount(Decimal(str(payment_in.amount)))
    if pay_amt <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero."
        )

    # Validate deposit account
    deposit_acc = db.query(Account).filter(Account.id == payment_in.deposit_account_id).first()
    if not deposit_acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit bank/cash account not found."
        )

    # Period Lock Check
    validate_period_open(db, payment_in.entity_id, payment_in.payment_date)

    ar_acc = get_or_create_account(db, payment_in.entity_id, "1200", "Accounts Receivable (AR)", AccountType.ASSET, NormalBalance.DEBIT, deposit_acc.currency)

    # Balanced Double-Entry lines
    je = JournalEntry(
        entity_id=payment_in.entity_id,
        entry_number=f"JE-{payment_in.payment_number}",
        entry_date=payment_in.payment_date,
        description=f"Customer Payment #{payment_in.payment_number} from {payment_in.customer.name}",
        reference=payment_in.reference_number or payment_in.payment_number,
        currency=deposit_acc.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=pay_amt,
        total_credit=pay_amt,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    # Line 1: Debit Bank/Cash
    l1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=deposit_acc.id,
        description=f"Deposit from {payment_in.customer.name} - Ref: {payment_in.reference_number or payment_in.payment_number}",
        debit=pay_amt,
        credit=Decimal("0.00"),
        base_debit=pay_amt,
        base_credit=Decimal("0.00")
    )
    # Line 2: Credit Accounts Receivable
    l2 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=ar_acc.id,
        description=f"Settlement of AR - {payment_in.customer.name}",
        debit=Decimal("0.00"),
        credit=pay_amt,
        base_debit=Decimal("0.00"),
        base_credit=pay_amt
    )
    db.add(l1)
    db.add(l2)

    payment_in.journal_entry_id = je.id

    # If linked to specific invoice, update invoice paid & balance amount
    if payment_in.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == payment_in.invoice_id).first()
        if inv:
            inv.paid_amount = quantize_amount(Decimal(str(inv.paid_amount or 0)) + pay_amt)
            inv.balance_amount = max(Decimal("0.00"), quantize_amount(Decimal(str(inv.total_amount)) - inv.paid_amount))
            if inv.balance_amount == Decimal("0.00"):
                inv.status = InvoiceStatus.PAID.value
            else:
                inv.status = InvoiceStatus.PARTIALLY_PAID.value

    # Update Customer Balance
    customer = payment_in.customer
    customer.current_balance = max(Decimal("0.00"), quantize_amount(Decimal(str(customer.current_balance or 0)) - pay_amt))

    db.commit()
    db.refresh(payment_in)
    db.refresh(customer)
    return payment_in

