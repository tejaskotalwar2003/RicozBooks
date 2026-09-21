from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.company import Entity
from app.models.user import User
from app.models.purchases import Vendor, Bill, BillLine, BillStatus, VendorPayment, PurchaseOrder, DebitNote
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.services.accounting_engine import validate_period_open

def quantize_amount(val: Optional[Decimal]) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_po_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.entity_id == entity_id,
        PurchaseOrder.po_number.like(f"PO-{current_year}-%")
    ).order_by(desc(PurchaseOrder.id)).first()

    if last_po:
        match = re.search(r'PO-\d{4}-(\d+)', last_po.po_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"PO-{current_year}-{seq:04d}"

def generate_bill_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_bill = db.query(Bill).filter(
        Bill.entity_id == entity_id,
        Bill.bill_number.like(f"BILL-{current_year}-%")
    ).order_by(desc(Bill.id)).first()

    if last_bill:
        match = re.search(r'BILL-\d{4}-(\d+)', last_bill.bill_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"BILL-{current_year}-{seq:04d}"

def generate_vendor_payment_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_pay = db.query(VendorPayment).filter(
        VendorPayment.entity_id == entity_id,
        VendorPayment.payment_number.like(f"VPAY-{current_year}-%")
    ).order_by(desc(VendorPayment.id)).first()

    if last_pay:
        match = re.search(r'VPAY-\d{4}-(\d+)', last_pay.payment_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"VPAY-{current_year}-{seq:04d}"

def generate_debit_note_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_dn = db.query(DebitNote).filter(
        DebitNote.entity_id == entity_id,
        DebitNote.note_number.like(f"DN-{current_year}-%")
    ).order_by(desc(DebitNote.id)).first()

    if last_dn:
        match = re.search(r'DN-\d{4}-(\d+)', last_dn.note_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"DN-{current_year}-{seq:04d}"

def is_intra_state_purchase(entity: Entity, vendor: Vendor) -> bool:
    """Intra-state if both entity and vendor are registered in the same Indian state."""
    ent_state = (entity.state or "").strip().lower()
    ven_state = (vendor.state or "").strip().lower()
    if not ent_state or not ven_state:
        return True
    return ent_state == ven_state

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

def post_bill_to_general_ledger(
    db: Session,
    bill: Bill,
    current_user: User
) -> JournalEntry:
    """
    Posts vendor bill to General Ledger:
    Debit: 5000+ - Expense Accounts (or Inventory Asset 1300) for taxable values
    Debit: 1400 - Input CGST Tax Credit (if intra-state)
    Debit: 1410 - Input SGST Tax Credit (if intra-state)
    Debit: 1420 - Input IGST Tax Credit (if inter-state)
    Credit: 2000 - Accounts Payable (AP) for Grand Total
    """
    if bill.status == BillStatus.POSTED.value and bill.journal_entry_id:
        je = db.query(JournalEntry).filter(JournalEntry.id == bill.journal_entry_id).first()
        if je:
            return je

    # 1. Period Lock Check
    validate_period_open(db, bill.entity_id, bill.bill_date)

    # 2. Resolve Chart of Accounts
    ap_account = get_or_create_account(
        db, bill.entity_id, "2000", "Accounts Payable (AP)", 
        AccountType.LIABILITY, NormalBalance.CREDIT, bill.currency
    )

    default_expense = get_or_create_account(
        db, bill.entity_id, "5000", "Operating & Purchase Expenses", 
        AccountType.EXPENSE, NormalBalance.DEBIT, bill.currency
    )

    cgst_input = get_or_create_account(
        db, bill.entity_id, "1400", "Input CGST Tax Credit", 
        AccountType.ASSET, NormalBalance.DEBIT, bill.currency
    )
    sgst_input = get_or_create_account(
        db, bill.entity_id, "1410", "Input SGST Tax Credit", 
        AccountType.ASSET, NormalBalance.DEBIT, bill.currency
    )
    igst_input = get_or_create_account(
        db, bill.entity_id, "1420", "Input IGST Tax Credit", 
        AccountType.ASSET, NormalBalance.DEBIT, bill.currency
    )

    total_bill = quantize_amount(Decimal(str(bill.total_amount)))
    total_taxable = quantize_amount(Decimal(str(bill.taxable_amount)))
    cgst_amt = quantize_amount(Decimal(str(bill.cgst_amount)))
    sgst_amt = quantize_amount(Decimal(str(bill.sgst_amount)))
    igst_amt = quantize_amount(Decimal(str(bill.igst_amount)))

    journal_lines = []
    line_no = 1
    total_deb = Decimal("0.00")
    total_cred = Decimal("0.00")

    # Debit Expense line(s)
    journal_lines.append(JournalEntryLine(
        line_number=line_no,
        account_id=default_expense.id,
        description=f"Purchase Expense - Bill #{bill.bill_number}",
        debit=total_taxable,
        credit=Decimal("0.00"),
        base_debit=total_taxable,
        base_credit=Decimal("0.00")
    ))
    total_deb += total_taxable
    line_no += 1

    # Debit Input Tax Credits
    if cgst_amt > Decimal("0.00"):
        journal_lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=cgst_input.id,
            description=f"Input CGST - Bill #{bill.bill_number}",
            debit=cgst_amt,
            credit=Decimal("0.00"),
            base_debit=cgst_amt,
            base_credit=Decimal("0.00")
        ))
        total_deb += cgst_amt
        line_no += 1

    if sgst_amt > Decimal("0.00"):
        journal_lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=sgst_input.id,
            description=f"Input SGST - Bill #{bill.bill_number}",
            debit=sgst_amt,
            credit=Decimal("0.00"),
            base_debit=sgst_amt,
            base_credit=Decimal("0.00")
        ))
        total_deb += sgst_amt
        line_no += 1

    if igst_amt > Decimal("0.00"):
        journal_lines.append(JournalEntryLine(
            line_number=line_no,
            account_id=igst_input.id,
            description=f"Input IGST - Bill #{bill.bill_number}",
            debit=igst_amt,
            credit=Decimal("0.00"),
            base_debit=igst_amt,
            base_credit=Decimal("0.00")
        ))
        total_deb += igst_amt
        line_no += 1

    # Credit Accounts Payable (AP)
    journal_lines.append(JournalEntryLine(
        line_number=line_no,
        account_id=ap_account.id,
        description=f"Vendor AP - {bill.vendor.name} - Bill #{bill.bill_number}",
        debit=Decimal("0.00"),
        credit=total_bill,
        base_debit=Decimal("0.00"),
        base_credit=total_bill
    ))
    total_cred += total_bill

    # Double-entry invariant validation
    diff = total_deb - total_cred
    if diff != Decimal("0.00") and abs(diff) <= Decimal("0.05"):
        journal_lines[0].debit -= diff
        journal_lines[0].base_debit -= diff
        total_deb -= diff

    if total_deb != total_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double-entry imbalance: Total Debit ({total_deb}) != Total Credit ({total_cred})"
        )

    # 3. Create Balanced Journal Entry
    je = JournalEntry(
        entity_id=bill.entity_id,
        entry_number=f"JE-{bill.bill_number}",
        entry_date=bill.bill_date,
        description=f"Vendor Bill #{bill.bill_number} - {bill.vendor.name}",
        reference=bill.vendor_invoice_ref or bill.bill_number,
        currency=bill.currency,
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

    for line in journal_lines:
        line.journal_entry_id = je.id
        db.add(line)

    # 4. Update Bill & Vendor AP Balance
    bill.journal_entry_id = je.id
    bill.status = BillStatus.POSTED.value if bill.balance_amount == bill.total_amount else (
        BillStatus.PAID.value if bill.balance_amount == 0 else BillStatus.PARTIALLY_PAID.value
    )

    vendor = bill.vendor
    vendor.current_balance = quantize_amount(Decimal(str(vendor.current_balance or 0)) + total_bill)

    db.commit()
    db.refresh(bill)
    db.refresh(vendor)
    return je

def record_vendor_payment_transaction(
    db: Session,
    payment_in: VendorPayment,
    current_user: User
) -> VendorPayment:
    """
    Settles vendor payable and creates balanced GL entry:
    Debit: 2000 - Accounts Payable (AP)
    Credit: 1100 - Bank Current Account (or Cash 1000)
    """
    pay_amt = quantize_amount(Decimal(str(payment_in.amount)))
    if pay_amt <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero."
        )

    # Period Lock Check
    validate_period_open(db, payment_in.entity_id, payment_in.payment_date)

    disbursement_acc = db.query(Account).filter(Account.id == payment_in.disbursement_account_id).first()
    if not disbursement_acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disbursement bank/cash account not found."
        )

    ap_account = get_or_create_account(
        db, payment_in.entity_id, "2000", "Accounts Payable (AP)",
        AccountType.LIABILITY, NormalBalance.CREDIT, disbursement_acc.currency
    )

    # Create Balanced Journal Entry
    je = JournalEntry(
        entity_id=payment_in.entity_id,
        entry_number=f"JE-{payment_in.payment_number}",
        entry_date=payment_in.payment_date,
        description=f"Vendor Payment #{payment_in.payment_number} to {payment_in.vendor.name}",
        reference=payment_in.reference_number or payment_in.payment_number,
        currency=disbursement_acc.currency,
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

    # Line 1: Debit AP
    l1 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=ap_account.id,
        description=f"Settlement to {payment_in.vendor.name} - Ref: {payment_in.reference_number or payment_in.payment_number}",
        debit=pay_amt,
        credit=Decimal("0.00"),
        base_debit=pay_amt,
        base_credit=Decimal("0.00")
    )
    # Line 2: Credit Bank/Cash
    l2 = JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=disbursement_acc.id,
        description=f"Disbursement to {payment_in.vendor.name}",
        debit=Decimal("0.00"),
        credit=pay_amt,
        base_debit=Decimal("0.00"),
        base_credit=pay_amt
    )
    db.add(l1)
    db.add(l2)

    payment_in.journal_entry_id = je.id

    # If linked to specific bill, decrement balance
    if payment_in.bill_id:
        bill = db.query(Bill).filter(Bill.id == payment_in.bill_id).first()
        if bill:
            bill.paid_amount = quantize_amount(Decimal(str(bill.paid_amount or 0)) + pay_amt)
            bill.balance_amount = quantize_amount(Decimal(str(bill.total_amount)) - Decimal(str(bill.paid_amount)))
            if bill.balance_amount <= Decimal("0.00"):
                bill.balance_amount = Decimal("0.00")
                bill.status = BillStatus.PAID.value
            else:
                bill.status = BillStatus.PARTIALLY_PAID.value

    # Decrement Vendor AP balance
    vendor = payment_in.vendor
    vendor.current_balance = quantize_amount(Decimal(str(vendor.current_balance or 0)) - pay_amt)

    db.commit()
    db.refresh(payment_in)
    db.refresh(vendor)
    return payment_in

