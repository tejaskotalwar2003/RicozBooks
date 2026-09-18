import io
import csv
from datetime import date
from decimal import Decimal
from typing import List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.journal import JournalEntry, JournalEntryLine, JournalStatus
from app.models.account import Account, AccountType, NormalBalance
from app.models.company import Entity
from app.schemas.report import (
    TrialBalanceItem,
    TrialBalanceResponse,
    ProfitLossAccountItem,
    ProfitLossResponse,
    BalanceSheetAccountItem,
    BalanceSheetResponse
)

def get_allowed_statuses(include_unposted: bool) -> List[JournalStatus]:
    if include_unposted:
        return [JournalStatus.POSTED, JournalStatus.APPROVED, JournalStatus.SUBMITTED]
    return [JournalStatus.POSTED]

# =========================================================================
# 1. TRIAL BALANCE ENGINE
# =========================================================================
def generate_trial_balance(
    db: Session,
    entity_id: int,
    start_date: date,
    end_date: date,
    include_unposted: bool = False
) -> TrialBalanceResponse:
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )

    accounts = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.is_active == True
    ).order_by(Account.code.asc()).all()

    allowed_statuses = get_allowed_statuses(include_unposted)

    # 1. Opening sums before start_date
    open_sums = db.query(
        JournalEntryLine.account_id,
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("open_dr"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("open_cr")
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_date < start_date,
        JournalEntry.status.in_(allowed_statuses)
    ).group_by(JournalEntryLine.account_id).all()

    open_map = {row[0]: (Decimal(str(row[1])), Decimal(str(row[2]))) for row in open_sums}

    # 2. Period sums between start_date and end_date
    period_sums = db.query(
        JournalEntryLine.account_id,
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("period_dr"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("period_cr")
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_date >= start_date,
        JournalEntry.entry_date <= end_date,
        JournalEntry.status.in_(allowed_statuses)
    ).group_by(JournalEntryLine.account_id).all()

    period_map = {row[0]: (Decimal(str(row[1])), Decimal(str(row[2]))) for row in period_sums}

    items: List[TrialBalanceItem] = []
    tot_open_dr = Decimal("0.00")
    tot_open_cr = Decimal("0.00")
    tot_per_dr = Decimal("0.00")
    tot_per_cr = Decimal("0.00")
    tot_close_dr = Decimal("0.00")
    tot_close_cr = Decimal("0.00")

    for acc in accounts:
        o_dr, o_cr = open_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))
        p_dr, p_cr = period_map.get(acc.id, (Decimal("0.00"), Decimal("0.00")))

        # Calculate opening balance net
        if acc.normal_balance == NormalBalance.DEBIT:
            net_open = o_dr - o_cr
            open_debit = net_open if net_open >= 0 else Decimal("0.00")
            open_credit = abs(net_open) if net_open < 0 else Decimal("0.00")

            closing_signed = (o_dr - o_cr) + (p_dr - p_cr)
            closing_debit = closing_signed if closing_signed >= 0 else Decimal("0.00")
            closing_credit = abs(closing_signed) if closing_signed < 0 else Decimal("0.00")
        else:
            net_open = o_cr - o_dr
            open_credit = net_open if net_open >= 0 else Decimal("0.00")
            open_debit = abs(net_open) if net_open < 0 else Decimal("0.00")

            closing_signed = (o_cr - o_dr) + (p_cr - p_dr)
            closing_credit = closing_signed if closing_signed >= 0 else Decimal("0.00")
            closing_debit = abs(closing_signed) if closing_signed < 0 else Decimal("0.00")

        # Skip accounts with strictly zero movement and zero balances to keep report clean
        if (open_debit == 0 and open_credit == 0 and 
            p_dr == 0 and p_cr == 0 and 
            closing_debit == 0 and closing_credit == 0):
            continue

        items.append(
            TrialBalanceItem(
                account_id=acc.id,
                account_code=acc.code,
                account_name=acc.name,
                account_type=acc.account_type.value,
                normal_balance=acc.normal_balance.value,
                opening_debit=open_debit,
                opening_credit=open_credit,
                period_debit=p_dr,
                period_credit=p_cr,
                closing_debit=closing_debit,
                closing_credit=closing_credit
            )
        )

        tot_open_dr += open_debit
        tot_open_cr += open_credit
        tot_per_dr += p_dr
        tot_per_cr += p_cr
        tot_close_dr += closing_debit
        tot_close_cr += closing_credit

    diff = abs(tot_close_dr - tot_close_cr)
    is_balanced = (diff == Decimal("0.00"))

    return TrialBalanceResponse(
        entity_id=entity.id,
        entity_name=entity.name,
        currency=entity.base_currency,
        start_date=start_date,
        end_date=end_date,
        include_unposted=include_unposted,
        items=items,
        total_opening_debit=tot_open_dr,
        total_opening_credit=tot_open_cr,
        total_period_debit=tot_per_dr,
        total_period_credit=tot_per_cr,
        total_closing_debit=tot_close_dr,
        total_closing_credit=tot_close_cr,
        is_balanced=is_balanced,
        difference=diff
    )

# =========================================================================
# 2. PROFIT & LOSS ENGINE
# =========================================================================
def generate_profit_and_loss(
    db: Session,
    entity_id: int,
    start_date: date,
    end_date: date,
    include_unposted: bool = False
) -> ProfitLossResponse:
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )

    allowed_statuses = get_allowed_statuses(include_unposted)

    # Fetch period sums
    period_sums = db.query(
        Account.id,
        Account.code,
        Account.name,
        Account.account_type,
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("period_dr"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("period_cr")
    ).join(
        JournalEntryLine, JournalEntryLine.account_id == Account.id
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        Account.entity_id == entity_id,
        Account.is_active == True,
        Account.account_type.in_([AccountType.REVENUE, AccountType.EXPENSE]),
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_date >= start_date,
        JournalEntry.entry_date <= end_date,
        JournalEntry.status.in_(allowed_statuses)
    ).group_by(Account.id, Account.code, Account.name, Account.account_type).order_by(Account.code.asc()).all()

    rev_accounts: List[ProfitLossAccountItem] = []
    exp_accounts: List[ProfitLossAccountItem] = []
    total_rev = Decimal("0.00")
    total_exp = Decimal("0.00")

    # Temporary storage to compute total_revenue first
    raw_rev = []
    for row in period_sums:
        acc_id, code, name, acc_type, dr, cr = row[0], row[1], row[2], row[3], Decimal(str(row[4])), Decimal(str(row[5]))
        if acc_type == AccountType.REVENUE:
            amt = cr - dr  # Revenues normal credit
            total_rev += amt
            raw_rev.append((acc_id, code, name, amt))
        elif acc_type == AccountType.EXPENSE:
            amt = dr - cr  # Expenses normal debit
            total_exp += amt
            exp_accounts.append(
                ProfitLossAccountItem(
                    account_id=acc_id,
                    account_code=code,
                    account_name=name,
                    amount=amt,
                    percentage_of_revenue=Decimal("0.00")
                )
            )

    # Build revenue items with percentages
    for acc_id, code, name, amt in raw_rev:
        pct = (amt / total_rev * 100).quantize(Decimal("0.01")) if total_rev > 0 else Decimal("0.00")
        rev_accounts.append(
            ProfitLossAccountItem(
                account_id=acc_id,
                account_code=code,
                account_name=name,
                amount=amt,
                percentage_of_revenue=pct
            )
        )

    # Update expense percentages
    for exp in exp_accounts:
        if total_rev > 0:
            exp.percentage_of_revenue = (exp.amount / total_rev * 100).quantize(Decimal("0.01"))

    gross_profit = total_rev
    net_profit_loss = total_rev - total_exp
    net_margin_pct = (net_profit_loss / total_rev * 100).quantize(Decimal("0.01")) if total_rev > 0 else Decimal("0.00")

    return ProfitLossResponse(
        entity_id=entity.id,
        entity_name=entity.name,
        currency=entity.base_currency,
        start_date=start_date,
        end_date=end_date,
        include_unposted=include_unposted,
        revenue_accounts=rev_accounts,
        total_revenue=total_rev,
        expense_accounts=exp_accounts,
        total_expense=total_exp,
        gross_profit=gross_profit,
        net_profit_loss=net_profit_loss,
        net_margin_pct=net_margin_pct
    )

# =========================================================================
# 3. BALANCE SHEET ENGINE
# =========================================================================
def generate_balance_sheet(
    db: Session,
    entity_id: int,
    as_of_date: date,
    include_unposted: bool = False
) -> BalanceSheetResponse:
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found."
        )

    allowed_statuses = get_allowed_statuses(include_unposted)

    # Query cumulative sums for all accounts up to as_of_date
    cum_sums = db.query(
        Account.id,
        Account.code,
        Account.name,
        Account.account_type,
        func.coalesce(func.sum(JournalEntryLine.debit), 0).label("cum_dr"),
        func.coalesce(func.sum(JournalEntryLine.credit), 0).label("cum_cr")
    ).join(
        JournalEntryLine, JournalEntryLine.account_id == Account.id
    ).join(
        JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
    ).filter(
        Account.entity_id == entity_id,
        Account.is_active == True,
        JournalEntry.entity_id == entity_id,
        JournalEntry.entry_date <= as_of_date,
        JournalEntry.status.in_(allowed_statuses)
    ).group_by(Account.id, Account.code, Account.name, Account.account_type).order_by(Account.code.asc()).all()

    asset_items: List[BalanceSheetAccountItem] = []
    liability_items: List[BalanceSheetAccountItem] = []
    equity_items: List[BalanceSheetAccountItem] = []

    total_assets = Decimal("0.00")
    total_liabilities = Decimal("0.00")
    total_equity_before_earnings = Decimal("0.00")
    cum_revenue = Decimal("0.00")
    cum_expense = Decimal("0.00")

    for row in cum_sums:
        acc_id, code, name, acc_type = row[0], row[1], row[2], row[3]
        dr, cr = Decimal(str(row[4])), Decimal(str(row[5]))

        if acc_type == AccountType.ASSET:
            balance = dr - cr
            if balance != Decimal("0.00"):
                asset_items.append(
                    BalanceSheetAccountItem(
                        account_id=acc_id,
                        account_code=code,
                        account_name=name,
                        amount=balance
                    )
                )
                total_assets += balance

        elif acc_type == AccountType.LIABILITY:
            balance = cr - dr
            if balance != Decimal("0.00"):
                liability_items.append(
                    BalanceSheetAccountItem(
                        account_id=acc_id,
                        account_code=code,
                        account_name=name,
                        amount=balance
                    )
                )
                total_liabilities += balance

        elif acc_type == AccountType.EQUITY:
            balance = cr - dr
            if balance != Decimal("0.00"):
                equity_items.append(
                    BalanceSheetAccountItem(
                        account_id=acc_id,
                        account_code=code,
                        account_name=name,
                        amount=balance
                    )
                )
                total_equity_before_earnings += balance

        elif acc_type == AccountType.REVENUE:
            cum_revenue += (cr - dr)

        elif acc_type == AccountType.EXPENSE:
            cum_expense += (dr - cr)

    # Current period earnings to balance the sheet
    current_period_earnings = cum_revenue - cum_expense
    total_equity = total_equity_before_earnings + current_period_earnings
    total_liabilities_and_equity = total_liabilities + total_equity

    diff = abs(total_assets - total_liabilities_and_equity)
    is_balanced = (diff == Decimal("0.00"))

    return BalanceSheetResponse(
        entity_id=entity.id,
        entity_name=entity.name,
        currency=entity.base_currency,
        as_of_date=as_of_date,
        include_unposted=include_unposted,
        asset_accounts=asset_items,
        total_assets=total_assets,
        liability_accounts=liability_items,
        total_liabilities=total_liabilities,
        equity_accounts=equity_items,
        total_equity_before_earnings=total_equity_before_earnings,
        current_period_earnings=current_period_earnings,
        total_equity=total_equity,
        total_liabilities_and_equity=total_liabilities_and_equity,
        is_balanced=is_balanced,
        difference=diff
    )

# =========================================================================
# 4. CSV GENERATION HELPERS
# =========================================================================
def export_trial_balance_csv(report: TrialBalanceResponse) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["RicozBooks Enterprise Financial Reports"])
    writer.writerow(["Statement: Trial Balance"])
    writer.writerow([f"Legal Entity: {report.entity_name} ({report.currency})"])
    writer.writerow([f"Period: {report.start_date} to {report.end_date}"])
    writer.writerow([f"Include Unposted: {'Yes' if report.include_unposted else 'No'}"])
    writer.writerow([f"Balance Status: {'BALANCED' if report.is_balanced else 'UNBALANCED'}"])
    writer.writerow([])

    writer.writerow([
        "Account Code",
        "Account Name",
        "Type",
        "Normal Balance",
        f"Opening Debit ({report.currency})",
        f"Opening Credit ({report.currency})",
        f"Period Debit ({report.currency})",
        f"Period Credit ({report.currency})",
        f"Closing Debit ({report.currency})",
        f"Closing Credit ({report.currency})"
    ])

    for item in report.items:
        writer.writerow([
            item.account_code,
            item.account_name,
            item.account_type,
            item.normal_balance,
            f"{item.opening_debit:.2f}",
            f"{item.opening_credit:.2f}",
            f"{item.period_debit:.2f}",
            f"{item.period_credit:.2f}",
            f"{item.closing_debit:.2f}",
            f"{item.closing_credit:.2f}"
        ])

    writer.writerow([])
    writer.writerow([
        "TOTALS",
        "",
        "",
        "",
        f"{report.total_opening_debit:.2f}",
        f"{report.total_opening_credit:.2f}",
        f"{report.total_period_debit:.2f}",
        f"{report.total_period_credit:.2f}",
        f"{report.total_closing_debit:.2f}",
        f"{report.total_closing_credit:.2f}"
    ])

    return output.getvalue()

def export_profit_loss_csv(report: ProfitLossResponse) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["RicozBooks Enterprise Financial Reports"])
    writer.writerow(["Statement: Profit & Loss (Income Statement)"])
    writer.writerow([f"Legal Entity: {report.entity_name} ({report.currency})"])
    writer.writerow([f"Period: {report.start_date} to {report.end_date}"])
    writer.writerow([])

    writer.writerow(["OPERATING REVENUE", "Code", f"Amount ({report.currency})", "% of Revenue"])
    for r in report.revenue_accounts:
        writer.writerow([r.account_name, r.account_code, f"{r.amount:.2f}", f"{r.percentage_of_revenue:.2f}%"])
    writer.writerow(["TOTAL REVENUE", "", f"{report.total_revenue:.2f}", "100.00%"])
    writer.writerow([])

    writer.writerow(["OPERATING EXPENSES", "Code", f"Amount ({report.currency})", "% of Revenue"])
    for e in report.expense_accounts:
        writer.writerow([e.account_name, e.account_code, f"{e.amount:.2f}", f"{e.percentage_of_revenue:.2f}%"])
    writer.writerow(["TOTAL EXPENSES", "", f"{report.total_expense:.2f}", ""])
    writer.writerow([])

    writer.writerow(["SUMMARY", "", f"Amount ({report.currency})", ""])
    writer.writerow(["Gross Profit", "", f"{report.gross_profit:.2f}", ""])
    writer.writerow(["Net Profit / (Loss)", "", f"{report.net_profit_loss:.2f}", f"{report.net_margin_pct:.2f}% Margin"])

    return output.getvalue()

def export_balance_sheet_csv(report: BalanceSheetResponse) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["RicozBooks Enterprise Financial Reports"])
    writer.writerow(["Statement: Balance Sheet (Financial Position)"])
    writer.writerow([f"Legal Entity: {report.entity_name} ({report.currency})"])
    writer.writerow([f"As of: {report.as_of_date}"])
    writer.writerow([f"Equation Status: {'BALANCED' if report.is_balanced else 'UNBALANCED'}"])
    writer.writerow([])

    writer.writerow(["ASSETS", "Code", f"Amount ({report.currency})"])
    for a in report.asset_accounts:
        writer.writerow([a.account_name, a.account_code, f"{a.amount:.2f}"])
    writer.writerow(["TOTAL ASSETS", "", f"{report.total_assets:.2f}"])
    writer.writerow([])

    writer.writerow(["LIABILITIES", "Code", f"Amount ({report.currency})"])
    for l in report.liability_accounts:
        writer.writerow([l.account_name, l.account_code, f"{l.amount:.2f}"])
    writer.writerow(["TOTAL LIABILITIES", "", f"{report.total_liabilities:.2f}"])
    writer.writerow([])

    writer.writerow(["EQUITY", "Code", f"Amount ({report.currency})"])
    for eq in report.equity_accounts:
        writer.writerow([eq.account_name, eq.account_code, f"{eq.amount:.2f}"])
    writer.writerow(["Current Period Net Earnings", "P&L", f"{report.current_period_earnings:.2f}"])
    writer.writerow(["TOTAL EQUITY", "", f"{report.total_equity:.2f}"])
    writer.writerow([])

    writer.writerow(["TOTAL LIABILITIES & EQUITY", "", f"{report.total_liabilities_and_equity:.2f}"])

    return output.getvalue()

