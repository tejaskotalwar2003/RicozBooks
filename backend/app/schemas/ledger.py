from typing import List, Optional
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class LedgerLineItem(BaseModel):
    id: int
    journal_entry_id: int
    entry_number: str
    entry_date: date
    reference: Optional[str] = None
    description: Optional[str] = None
    journal_description: Optional[str] = None
    debit: Decimal
    credit: Decimal
    running_balance: Decimal
    balance_type: str  # "DR" or "CR"
    status: str
    currency: str

    class Config:
        from_attributes = True

class AccountLedgerResponse(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    currency: str
    start_date: date
    end_date: date
    opening_balance: Decimal
    opening_balance_type: str  # "DR" or "CR"
    period_debit: Decimal
    period_credit: Decimal
    net_movement: Decimal
    closing_balance: Decimal
    closing_balance_type: str  # "DR" or "CR"
    lines: List[LedgerLineItem]

class LedgerSummaryItem(BaseModel):
    account_id: int
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    currency: str
    opening_balance: Decimal
    opening_balance_type: str
    period_debit: Decimal
    period_credit: Decimal
    closing_balance: Decimal
    closing_balance_type: str

class LedgerSummaryResponse(BaseModel):
    entity_id: int
    start_date: date
    end_date: date
    currency: str
    accounts: List[LedgerSummaryItem]
    total_opening_debit: Decimal
    total_opening_credit: Decimal
    total_period_debit: Decimal
    total_period_credit: Decimal
    total_closing_debit: Decimal
    total_closing_credit: Decimal

