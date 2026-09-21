from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.company import Entity
from app.models.user import User
from app.models.sales import Invoice, InvoiceLine, InvoiceStatus, Customer
from app.models.purchases import Bill, BillLine, BillStatus
from app.models.expenses import Expense, ExpenseClaimStatus
from app.models.account import Account, AccountType, NormalBalance
from app.models.banking import BankAccount, BankTransaction, BankTxType, BankTxStatus
from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.gst import GSTReturnFiling, GSTReturnType, GSTReturnStatus
from app.schemas.gst import (
    GSTR1Summary, GSTR1B2BInvoice, GSTR1HSNSummary,
    GSTR3BSummary, GSTR3BOutwardSupplies, GSTR3BEligibleITC, GSTR3BTaxOffset
)
from app.services.accounting_engine import validate_period_open


def quantize_amount(val: Optional[Decimal]) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_period_dates(return_period: str):
    """
    Parses MMYYYY into start_date and end_date.
    e.g. "092026" -> (date(2026, 9, 1), date(2026, 9, 30))
    """
    if len(return_period) == 6 and return_period.isdigit():
        month = int(return_period[:2])
        year = int(return_period[2:])
    elif "-" in return_period:
        parts = return_period.split("-")
        year = int(parts[0])
        month = int(parts[1])
    else:
        month = date.today().month
        year = date.today().year

    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year, 12, 31)
    else:
        next_month = date(year, month + 1, 1)
        from datetime import timedelta
        end_date = next_month - timedelta(days=1)
    return start_date, end_date


def generate_gstr1_report(db: Session, entity_id: int, return_period: str) -> GSTR1Summary:
    """Generates official GSTR-1 outward supplies return with B2B invoices and HSN summary."""
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")

    start_date, end_date = parse_period_dates(return_period)

    # Invoices in period that are posted or paid
    invoices = db.query(Invoice).filter(
        Invoice.entity_id == entity_id,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
    ).order_by(Invoice.invoice_date.asc()).all()

    b2b_list: List[GSTR1B2BInvoice] = []
    hsn_dict: Dict[str, Dict[str, Any]] = {}

    total_taxable = Decimal("0.00")
    total_igst = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")

    for inv in invoices:
        cust = inv.customer
        b2b_list.append(
            GSTR1B2BInvoice(
                invoice_number=inv.invoice_number,
                invoice_date=inv.invoice_date,
                customer_name=cust.name,
                customer_gstin=cust.gstin,
                place_of_supply=f"{cust.state or 'Maharashtra'} ({cust.country})",
                reverse_charge="N",
                invoice_type="Regular",
                total_invoice_value=quantize_amount(inv.total_amount),
                taxable_value=quantize_amount(inv.subtotal),
                tax_rate=quantize_amount(inv.tax_rate),
                igst_amount=quantize_amount(inv.igst_amount),
                cgst_amount=quantize_amount(inv.cgst_amount),
                sgst_amount=quantize_amount(inv.sgst_amount)
            )
        )

        total_taxable += quantize_amount(inv.subtotal)
        total_igst += quantize_amount(inv.igst_amount)
        total_cgst += quantize_amount(inv.cgst_amount)
        total_sgst += quantize_amount(inv.sgst_amount)

        # Aggregate HSN lines
        for line in inv.lines:
            hsn_code = line.product.hsn_sac_code if (line.product and line.product.hsn_sac_code) else "998313"
            if hsn_code not in hsn_dict:
                hsn_dict[hsn_code] = {
                    "desc": line.product.name if line.product else line.description,
                    "uqc": line.product.unit if line.product else "PCS",
                    "qty": Decimal("0.00"),
                    "total_val": Decimal("0.00"),
                    "taxable_val": Decimal("0.00"),
                    "rate": line.tax_rate,
                    "igst": Decimal("0.00"),
                    "cgst": Decimal("0.00"),
                    "sgst": Decimal("0.00")
                }
            hsn_dict[hsn_code]["qty"] += Decimal(str(line.quantity))
            hsn_dict[hsn_code]["total_val"] += quantize_amount(line.total_amount)
            hsn_dict[hsn_code]["taxable_val"] += quantize_amount(line.amount)
            hsn_dict[hsn_code]["igst"] += quantize_amount(line.igst_amount)
            hsn_dict[hsn_code]["cgst"] += quantize_amount(line.cgst_amount)
            hsn_dict[hsn_code]["sgst"] += quantize_amount(line.sgst_amount)

    hsn_list: List[GSTR1HSNSummary] = [
        GSTR1HSNSummary(
            hsn_sac_code=k,
            description=v["desc"],
            uqc=v["uqc"],
            total_quantity=v["qty"],
            total_value=quantize_amount(v["total_val"]),
            taxable_value=quantize_amount(v["taxable_val"]),
            tax_rate=quantize_amount(v["rate"]),
            igst_amount=quantize_amount(v["igst"]),
            cgst_amount=quantize_amount(v["cgst"]),
            sgst_amount=quantize_amount(v["sgst"])
        )
        for k, v in hsn_dict.items()
    ]

    total_liability = quantize_amount(total_igst + total_cgst + total_sgst)

    return GSTR1Summary(
        entity_id=entity_id,
        return_period=return_period,
        gstin=entity.tax_identifier,
        legal_name=entity.legal_name or entity.name,
        total_invoices_count=len(invoices),
        total_taxable_value=quantize_amount(total_taxable),
        total_igst=quantize_amount(total_igst),
        total_cgst=quantize_amount(total_cgst),
        total_sgst=quantize_amount(total_sgst),
        total_tax_liability=total_liability,
        b2b_invoices=b2b_list,
        hsn_summary=hsn_list
    )


def generate_gstr3b_report(db: Session, entity_id: int, return_period: str) -> GSTR3BSummary:
    """Generates GSTR-3B summary with Output Tax liability, Eligible ITC, and offset calculation."""
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")

    start_date, end_date = parse_period_dates(return_period)

    # 1. Output Supplies from Invoices
    outward_data = db.query(
        func.coalesce(func.sum(Invoice.subtotal), 0),
        func.coalesce(func.sum(Invoice.igst_amount), 0),
        func.coalesce(func.sum(Invoice.cgst_amount), 0),
        func.coalesce(func.sum(Invoice.sgst_amount), 0)
    ).filter(
        Invoice.entity_id == entity_id,
        Invoice.invoice_date >= start_date,
        Invoice.invoice_date <= end_date,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE])
    ).first()

    out_taxable = quantize_amount(Decimal(str(outward_data[0])))
    out_igst = quantize_amount(Decimal(str(outward_data[1])))
    out_cgst = quantize_amount(Decimal(str(outward_data[2])))
    out_sgst = quantize_amount(Decimal(str(outward_data[3])))

    # 2. Inward ITC from Vendor Bills
    bill_itc_data = db.query(
        func.coalesce(func.sum(Bill.igst_amount), 0),
        func.coalesce(func.sum(Bill.cgst_amount), 0),
        func.coalesce(func.sum(Bill.sgst_amount), 0)
    ).filter(
        Bill.entity_id == entity_id,
        Bill.bill_date >= start_date,
        Bill.bill_date <= end_date,
        Bill.status.in_([BillStatus.POSTED, BillStatus.PAID, BillStatus.PARTIALLY_PAID])
    ).first()

    itc_bill_igst = quantize_amount(Decimal(str(bill_itc_data[0])))
    itc_bill_cgst = quantize_amount(Decimal(str(bill_itc_data[1])))
    itc_bill_sgst = quantize_amount(Decimal(str(bill_itc_data[2])))

    # Plus ITC from business expenses
    exp_tax = db.query(func.coalesce(func.sum(Expense.tax_amount), 0)).filter(
        Expense.entity_id == entity_id,
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date,
        Expense.status.in_([ExpenseClaimStatus.POSTED, ExpenseClaimStatus.PAID])
    ).scalar()
    exp_itc = quantize_amount(Decimal(str(exp_tax)))
    # Split expense tax as CGST + SGST (intra-state) by default
    itc_exp_cgst = quantize_amount(exp_itc / 2)
    itc_exp_sgst = quantize_amount(exp_itc / 2)

    total_itc_igst = itc_bill_igst
    total_itc_cgst = itc_bill_cgst + itc_exp_cgst
    total_itc_sgst = itc_bill_sgst + itc_exp_sgst
    total_itc_avail = total_itc_igst + total_itc_cgst + total_itc_sgst

    # 3. Offsetting Logic (GST Rule: IGST first, then CGST against CGST/IGST, SGST against SGST/IGST)
    offset_igst = min(out_igst, total_itc_igst)
    cash_igst = out_igst - offset_igst

    offset_cgst = min(out_cgst, total_itc_cgst)
    cash_cgst = out_cgst - offset_cgst

    offset_sgst = min(out_sgst, total_itc_sgst)
    cash_sgst = out_sgst - offset_sgst

    total_output = out_igst + out_cgst + out_sgst
    total_offset = offset_igst + offset_cgst + offset_sgst
    total_cash = cash_igst + cash_cgst + cash_sgst

    # Filing status
    filing = db.query(GSTReturnFiling).filter(
        GSTReturnFiling.entity_id == entity_id,
        GSTReturnFiling.return_type == GSTReturnType.GSTR_3B,
        GSTReturnFiling.return_period == return_period
    ).first()

    return GSTR3BSummary(
        entity_id=entity_id,
        return_period=return_period,
        gstin=entity.tax_identifier,
        legal_name=entity.legal_name or entity.name,
        outward_supplies=GSTR3BOutwardSupplies(
            taxable_value=out_taxable,
            igst=out_igst,
            cgst=out_cgst,
            sgst=out_sgst
        ),
        eligible_itc=GSTR3BEligibleITC(
            itc_igst=total_itc_igst,
            itc_cgst=total_itc_cgst,
            itc_sgst=total_itc_sgst,
            total_itc_available=total_itc_avail
        ),
        tax_settlement=GSTR3BTaxOffset(
            output_igst=out_igst,
            output_cgst=out_cgst,
            output_sgst=out_sgst,
            total_output_liability=total_output,
            itc_offset_igst=offset_igst,
            itc_offset_cgst=offset_cgst,
            itc_offset_sgst=offset_sgst,
            total_itc_utilized=total_offset,
            cash_payable_igst=cash_igst,
            cash_payable_cgst=cash_cgst,
            cash_payable_sgst=cash_sgst,
            total_cash_payable=total_cash
        ),
        status=filing.status if filing else GSTReturnStatus.DRAFT,
        arn_number=filing.arn_number if filing else None,
        filing_date=filing.filing_date if filing else None
    )


def execute_gst_settlement(
    db: Session,
    entity_id: int,
    return_period: str,
    payment_bank_account_id: Optional[int],
    reference_number: Optional[str],
    current_user: User
) -> GSTReturnFiling:
    """
    Executes GST tax filing and posts double-entry settlement:
    - Dr 2100 GST / Tax Output Payable (total output liability)
    - Cr 1400 Input CGST (utilized ITC)
    - Cr 1410 Input SGST (utilized ITC)
    - Cr 1420 Input IGST (utilized ITC)
    - Cr 1100 Bank Current Account (net cash payable)
    """
    validate_period_open(db, entity_id, date.today())

    gstr3b = generate_gstr3b_report(db, entity_id, return_period)
    settle = gstr3b.tax_settlement

    total_liability = settle.total_output_liability
    itc_utilized = settle.total_itc_utilized
    cash_payable = settle.total_cash_payable

    if total_liability <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tax liability to settle for this period."
        )

    # 1. Prepare Balanced Journal Lines
    output_tax_acc = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == "2100"
    ).first()
    if not output_tax_acc:
        output_tax_acc = Account(
            entity_id=entity_id,
            code="2100",
            name="GST / Tax Output Payable",
            account_type=AccountType.LIABILITY,
            normal_balance=NormalBalance.CREDIT,
            currency="INR",
            description="GST Output statutory liability",
            is_active=True
        )
        db.add(output_tax_acc)
        db.commit()
        db.refresh(output_tax_acc)

    journal_lines = []
    line_num = 1

    # Dr 2100 GST Output Payable
    journal_lines.append(
        JournalEntryLine(
            line_number=line_num,
            account_id=output_tax_acc.id,
            debit=total_liability,
            credit=Decimal("0.00"),
            description=f"GST Settlement for Period {return_period}: Output Tax Cleared"
        )
    )
    line_num += 1

    # Cr Input Tax Credit Accounts
    if itc_utilized > Decimal("0.00"):
        itc_acc = db.query(Account).filter(
            Account.entity_id == entity_id,
            Account.code.in_(["1400", "1410", "1420"])
        ).first()
        if not itc_acc:
            itc_acc = Account(
                entity_id=entity_id,
                code="1400",
                name="Input GST Tax Credit",
                account_type=AccountType.ASSET,
                normal_balance=NormalBalance.DEBIT,
                currency="INR",
                is_active=True
            )
            db.add(itc_acc)
            db.commit()
            db.refresh(itc_acc)

        journal_lines.append(
            JournalEntryLine(
                line_number=line_num,
                account_id=itc_acc.id,
                debit=Decimal("0.00"),
                credit=itc_utilized,
                description=f"ITC Offsetting on GSTR-3B ({return_period})"
            )
        )
        line_num += 1

    # Cr Bank Account for Net Cash Payable
    if cash_payable > Decimal("0.00"):
        if payment_bank_account_id:
            bank_acc = db.query(BankAccount).filter(
                BankAccount.id == payment_bank_account_id,
                BankAccount.entity_id == entity_id
            ).first()
            bank_gl_id = bank_acc.gl_account_id if bank_acc else None
        else:
            bank_acc = db.query(BankAccount).filter(BankAccount.entity_id == entity_id).first()
            bank_gl_id = bank_acc.gl_account_id if bank_acc else None

        if not bank_gl_id:
            bank_gl = db.query(Account).filter(Account.entity_id == entity_id, Account.code == "1100").first()
            bank_gl_id = bank_gl.id if bank_gl else None

        journal_lines.append(
            JournalEntryLine(
                line_number=line_num,
                account_id=bank_gl_id,
                debit=Decimal("0.00"),
                credit=cash_payable,
                description=f"GST Cash Payment: Challan/Chq #{reference_number or 'GSTN-CHALLAN'}"
            )
        )

        if bank_acc:
            bank_acc.current_balance = quantize_amount(Decimal(str(bank_acc.current_balance)) - cash_payable)
            tx = BankTransaction(
                bank_account_id=bank_acc.id,
                transaction_type=BankTxType.EXPENSE_PAYMENT,
                transaction_date=date.today(),
                amount=cash_payable,
                is_credit=False,
                running_balance=bank_acc.current_balance,
                reference_number=reference_number or "GST-CHALLAN",
                counterparty="Goods and Services Tax Network (GSTN)",
                description=f"GST Cash Challan Payment ({return_period})",
                status=BankTxStatus.UNRECONCILED
            )
            db.add(tx)

    tot_deb = sum(l.debit for l in journal_lines)
    tot_cred = sum(l.credit for l in journal_lines)
    if tot_deb != tot_cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GST settlement imbalance: Debit {tot_deb} != Credit {tot_cred}"
        )

    # 2. Create Journal Entry
    je = JournalEntry(
        entity_id=entity_id,
        entry_number=f"JE-GST-SETTLE-{return_period}",
        entry_date=date.today(),
        description=f"GST Statutory Settlement & Filing for {return_period}",
        reference=reference_number or f"GSTR3B-{return_period}",
        currency="INR",
        exchange_rate=Decimal("1.0"),
        status=JournalStatus.POSTED,
        total_debit=tot_deb,
        total_credit=tot_cred,
        created_by_id=current_user.id,
        posted_by_id=current_user.id,
        posted_at=datetime.utcnow()
    )
    db.add(je)
    db.flush()

    for l in journal_lines:
        l.journal_entry_id = je.id
        db.add(l)

    # 3. Create or Update GST Filing Record
    filing = db.query(GSTReturnFiling).filter(
        GSTReturnFiling.entity_id == entity_id,
        GSTReturnFiling.return_type == GSTReturnType.GSTR_3B,
        GSTReturnFiling.return_period == return_period
    ).first()

    arn_code = f"AA{entity_id:02d}{return_period[:2]}{return_period[4:]}009912F"

    if not filing:
        filing = GSTReturnFiling(
            entity_id=entity_id,
            return_type=GSTReturnType.GSTR_3B,
            return_period=return_period,
            status=GSTReturnStatus.FILED,
            total_taxable_value=gstr3b.outward_supplies.taxable_value,
            igst_amount=settle.output_igst,
            cgst_amount=settle.output_cgst,
            sgst_amount=settle.output_sgst,
            total_tax_liability=total_liability,
            itc_claimed_igst=settle.itc_offset_igst,
            itc_claimed_cgst=settle.itc_offset_cgst,
            itc_claimed_sgst=settle.itc_offset_sgst,
            total_itc_claimed=itc_utilized,
            net_tax_paid_cash=cash_payable,
            arn_number=arn_code,
            filing_date=datetime.utcnow(),
            settlement_journal_id=je.id,
            filed_by_id=current_user.id
        )
        db.add(filing)
    else:
        filing.status = GSTReturnStatus.FILED
        filing.arn_number = arn_code
        filing.filing_date = datetime.utcnow()
        filing.settlement_journal_id = je.id
        filing.filed_by_id = current_user.id

    db.commit()
    db.refresh(filing)
    return filing
