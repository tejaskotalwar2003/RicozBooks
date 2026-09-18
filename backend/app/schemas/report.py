from typing import List, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

# =========================================================================
# 1. TRIAL BALANCE SCHEMAS
# =========================================================================
class TrialBalanceItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    opening_debit: Decimal
    opening_credit: Decimal
    period_debit: Decimal
    period_credit: Decimal
    closing_debit: Decimal
    closing_credit: Decimal

    class Config:
        from_attributes = True

class TrialBalanceResponse(BaseModel):
    entity_id: int
    entity_name: str
    currency: str
    start_date: date
    end_date: date
    include_unposted: bool
    items: List[TrialBalanceItem]
    total_opening_debit: Decimal
    total_opening_credit: Decimal
    total_period_debit: Decimal
    total_period_credit: Decimal
    total_closing_debit: Decimal
    total_closing_credit: Decimal
    is_balanced: bool
    difference: Decimal

# =========================================================================
# 2. PROFIT & LOSS (INCOME STATEMENT) SCHEMAS
# =========================================================================
class ProfitLossAccountItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    amount: Decimal
    percentage_of_revenue: Decimal

    class Config:
        from_attributes = True

class ProfitLossResponse(BaseModel):
    entity_id: int
    entity_name: str
    currency: str
    start_date: date
    end_date: date
    include_unposted: bool
    revenue_accounts: List[ProfitLossAccountItem]
    total_revenue: Decimal
    expense_accounts: List[ProfitLossAccountItem]
    total_expense: Decimal
    gross_profit: Decimal
    net_profit_loss: Decimal
    net_margin_pct: Decimal

# =========================================================================
# 3. BALANCE SHEET SCHEMAS
# =========================================================================
class BalanceSheetAccountItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    amount: Decimal

    class Config:
        from_attributes = True

class BalanceSheetResponse(BaseModel):
    entity_id: int
    entity_name: str
    currency: str
    as_of_date: date
    include_unposted: bool
    asset_accounts: List[BalanceSheetAccountItem]
    total_assets: Decimal
    liability_accounts: List[BalanceSheetAccountItem]
    total_liabilities: Decimal
    equity_accounts: List[BalanceSheetAccountItem]
    total_equity_before_earnings: Decimal
    current_period_earnings: Decimal
    total_equity: Decimal
    total_liabilities_and_equity: Decimal
    is_balanced: bool
    difference: Decimal

