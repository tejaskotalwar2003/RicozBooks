from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.company import Entity
from app.models.user import User
from app.models.account import Account, AccountType, NormalBalance
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.expenses import Expense, ExpenseCategory, ExpenseClaimStatus, ExpensePaymentMethod
from app.models.banking import BankAccount, BankTransaction, BankTxType, BankTxStatus
from app.services.accounting_engine import validate_period_open


def quantize_amount(val: Optional[Decimal]) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def generate_expense_number(db: Session, entity_id: int) -> str:
    current_year = date.today().year
    last_exp = db.query(Expense).filter(
        Expense.entity_id == entity_id,
        Expense.expense_number.like(f"EXP-{current_year}-%")
    ).order_by(desc(Expense.id)).first()

    if last_exp:
        match = re.search(r'EXP-\d{4}-(\d+)', last_exp.expense_number)
        seq = int(match.group(1)) + 1 if match else 1
    else:
        seq = 1
    return f"EXP-{current_year}-{seq:04d}"


def ensure_account(
    db: Session, 
    entity_id: int, 
    code: str, 
    name: str, 
    account_type: AccountType, 
    normal_balance: NormalBalance,
    description: str = ""
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
            account_type=account_type,
            normal_balance=normal_balance,
            currency="INR",
            description=description,
            is_active=True
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
    return acc


def seed_default_expense_categories(db: Session, entity_id: int):
    """Seed standard business expense categories with linked chart of accounts."""
    cat_templates = [
        ("EXP-CAT-TRV", "Travel & Lodging", "5300", "Travel, flights, taxis, and hotel accommodations", "5300", "Travel & Lodging Expense"),
        ("EXP-CAT-OFC", "Office Supplies & Stationery", "5310", "Office supplies, printing, stationery", "5310", "Office Supplies Expense"),
        ("EXP-CAT-SW", "Software & Cloud Services", "5200", "SaaS tools, AWS/GCP, software licenses", "5200", "Utilities & Cloud Infra Expense"),
        ("EXP-CAT-MKT", "Marketing & Advertising", "5500", "Digital ads, promotional events, sponsorships", "5500", "Marketing & Advertising Expense"),
        ("EXP-CAT-UTL", "Utilities & Facilities", "5200", "Electricity, water, internet, cleaning", "5200", "Utilities & Cloud Infra Expense"),
        ("EXP-CAT-RNT", "Office Rent & Lease", "5100", "Physical office facility rentals", "5100", "Office Rent Expense"),
        ("EXP-CAT-MLS", "Meals & Entertainment", "5400", "Client entertainment, team dinners", "5400", "Meals & Entertainment Expense"),
        ("EXP-CAT-PRF", "Legal & Professional Fees", "5600", "Legal counsel, audit fees, consultancy", "5600", "Professional & Legal Fees"),
    ]

    for cat_code, cat_name, acc_code, desc, std_acc_code, std_acc_name in cat_templates:
        existing = db.query(ExpenseCategory).filter(
            ExpenseCategory.entity_id == entity_id,
            ExpenseCategory.code == cat_code
        ).first()
        if not existing:
            acc = ensure_account(
                db, 
                entity_id, 
                std_acc_code, 
                std_acc_name, 
                AccountType.EXPENSE, 
                NormalBalance.DEBIT,
                desc
            )
            cat = ExpenseCategory(
                entity_id=entity_id,
                code=cat_code,
                name=cat_name,
                description=desc,
                default_account_id=acc.id,
                tax_rate_percent=Decimal("18.00") if "SW" in cat_code or "PRF" in cat_code else Decimal("0.00"),
                is_active=True
            )
            db.add(cat)
    db.commit()


def post_expense_to_gl(
    db: Session,
    expense_id: int,
    current_user: User
) -> JournalEntry:
    """
    Posts an approved or direct expense to the General Ledger.
    - Dr Expense Account (subtotal)
    - Dr Input Tax Credit (tax_amount if applicable)
    - Cr Payment Account (Bank/Cash) OR Cr Employee Reimbursements Payable (if reimbursable)
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Expense record not found"
        )

    if expense.journal_entry_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expense #{expense.expense_number} is already posted to the General Ledger."
        )

    # 1. Period Lock Check
    validate_period_open(db, expense.entity_id, expense.expense_date)

    subtotal = quantize_amount(expense.subtotal)
    tax_amt = quantize_amount(expense.tax_amount)
    total_amt = quantize_amount(subtotal + tax_amt)

    # 2. Build Balanced Journal Lines
    journal_lines = []
    line_num = 1

    # Line 1: Dr Expense Account
    journal_lines.append(
        JournalEntryLine(
            line_number=line_num,
            account_id=expense.expense_account_id,
            debit=subtotal,
            credit=Decimal("0.00"),
            description=f"Expense: {expense.title}"
        )
    )
    line_num += 1

    # Line 2: Dr Input GST (if tax > 0)
    if tax_amt > Decimal("0.00"):
        itc_account = ensure_account(
            db, 
            expense.entity_id, 
            "1400", 
            "Input GST Tax Credit", 
            AccountType.ASSET, 
            NormalBalance.DEBIT,
            "Input tax credit on business expenses"
        )
        journal_lines.append(
            JournalEntryLine(
                line_number=line_num,
                account_id=itc_account.id,
                debit=tax_amt,
                credit=Decimal("0.00"),
                description=f"Input GST on Expense #{expense.expense_number}"
            )
        )
        line_num += 1

    # Credit Line: Bank/Cash OR Employee Reimbursements Payable
    if expense.is_reimbursable:
        # Payable to employee
        reimb_payable_acc = ensure_account(
            db,
            expense.entity_id,
            "2050",
            "Employee Reimbursements Payable",
            AccountType.LIABILITY,
            NormalBalance.CREDIT,
            "Claims payable to employees for company expenses"
        )
        credit_account_id = reimb_payable_acc.id
        credit_desc = f"Reimbursable claim by user #{expense.user_id} - {expense.title}"
    else:
        # Paid from company Bank or Cash
        if expense.payment_account_id:
            credit_account_id = expense.payment_account_id
        else:
            # Default to Bank Account 1100
            bank_acc = ensure_account(
                db, 
                expense.entity_id, 
                "1100", 
                "Bank Accounts (HDFC & ICICI)", 
                AccountType.ASSET, 
                NormalBalance.DEBIT
            )
            credit_account_id = bank_acc.id
            expense.payment_account_id = bank_acc.id
        credit_desc = f"Paid: {expense.merchant_name or expense.title}"

    journal_lines.append(
        JournalEntryLine(
            line_number=line_num,
            account_id=credit_account_id,
            debit=Decimal("0.00"),
            credit=total_amt,
            description=credit_desc
        )
    )

    total_deb = sum(line.debit for line in journal_lines)
    total_cred = sum(line.credit for line in journal_lines)

    if total_deb != total_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double-entry imbalance: Debit {total_deb} != Credit {total_cred}"
        )

    # 3. Create Journal Entry
    je = JournalEntry(
        entity_id=expense.entity_id,
        entry_number=f"JE-{expense.expense_number}",
        entry_date=expense.expense_date,
        description=f"Expense #{expense.expense_number}: {expense.title}",
        reference=expense.reference_number or expense.expense_number,
        currency=expense.currency,
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

    # 4. If direct bank payment, create BankTransaction record & update balance
    if not expense.is_reimbursable and expense.bank_account_id:
        bank_account = db.query(BankAccount).filter(BankAccount.id == expense.bank_account_id).first()
        if bank_account:
            bank_account.current_balance = quantize_amount(Decimal(str(bank_account.current_balance)) - total_amt)
            tx = BankTransaction(
                bank_account_id=bank_account.id,
                transaction_type=BankTxType.EXPENSE_PAYMENT,
                transaction_date=expense.expense_date,
                amount=total_amt,
                is_credit=False, # Outflow
                running_balance=bank_account.current_balance,
                reference_number=expense.reference_number or expense.expense_number,
                counterparty=expense.merchant_name or expense.title,
                description=f"Expense Payment #{expense.expense_number}: {expense.title}",
                status=BankTxStatus.UNRECONCILED,
                journal_entry_id=je.id
            )
            db.add(tx)

    # 5. Update Expense Status
    expense.journal_entry_id = je.id
    expense.status = ExpenseClaimStatus.POSTED
    if not expense.approved_by_id:
        expense.approved_by_id = current_user.id
        expense.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(expense)
    return je


def reimburse_expense_claim(
    db: Session,
    expense_id: int,
    payment_account_id: int,
    bank_account_id: Optional[int],
    reference_number: Optional[str],
    current_user: User
) -> JournalEntry:
    """
    Settles an approved reimbursable employee expense claim:
    - Dr Employee Reimbursements Payable (2050)
    - Cr Bank/Cash Account (1100/1000)
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Expense record not found"
        )

    if not expense.is_reimbursable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is not marked as reimbursable."
        )

    if expense.status == ExpenseClaimStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense claim is already fully reimbursed/paid."
        )

    if not expense.journal_entry_id:
        # Automatically post initial expense first
        post_expense_to_gl(db, expense.id, current_user)
        db.refresh(expense)

    validate_period_open(db, expense.entity_id, date.today())
    total_amt = quantize_amount(expense.total_amount)

    reimb_payable_acc = ensure_account(
        db,
        expense.entity_id,
        "2050",
        "Employee Reimbursements Payable",
        AccountType.LIABILITY,
        NormalBalance.CREDIT
    )

    je = JournalEntry(
        entity_id=expense.entity_id,
        entry_number=f"JE-REIMB-{expense.expense_number}",
        entry_date=date.today(),
        description=f"Reimbursement for #{expense.expense_number} to User #{expense.user_id}",
        reference=reference_number or expense.expense_number,
        currency=expense.currency,
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=total_amt,
        total_credit=total_amt,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    # Dr 2050 Reimbursable Payable
    db.add(JournalEntryLine(
        journal_entry_id=je.id,
        line_number=1,
        account_id=reimb_payable_acc.id,
        debit=total_amt,
        credit=Decimal("0.00"),
        description=f"Settle claim for #{expense.expense_number}"
    ))

    # Cr Bank Account
    db.add(JournalEntryLine(
        journal_entry_id=je.id,
        line_number=2,
        account_id=payment_account_id,
        debit=Decimal("0.00"),
        credit=total_amt,
        description=f"Disbursed reimbursement for #{expense.expense_number}"
    ))

    if bank_account_id:
        bank_account = db.query(BankAccount).filter(BankAccount.id == bank_account_id).first()
        if bank_account:
            bank_account.current_balance = quantize_amount(Decimal(str(bank_account.current_balance)) - total_amt)
            tx = BankTransaction(
                bank_account_id=bank_account.id,
                transaction_type=BankTxType.EXPENSE_PAYMENT,
                transaction_date=date.today(),
                amount=total_amt,
                is_credit=False,
                running_balance=bank_account.current_balance,
                reference_number=reference_number or expense.expense_number,
                counterparty=f"Employee #{expense.user_id}",
                description=f"Expense Reimbursement #{expense.expense_number}",
                status=BankTxStatus.UNRECONCILED,
                journal_entry_id=je.id
            )
            db.add(tx)

    expense.reimbursement_journal_id = je.id
    expense.status = ExpenseClaimStatus.PAID
    db.commit()
    db.refresh(expense)
    return je
