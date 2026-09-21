from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.models.gst import GSTReturnType, GSTReturnStatus

# =========================================================================
# GSTR-1 SCHEMAS
# =========================================================================
class GSTR1B2BInvoice(BaseModel):
    invoice_number: str
    invoice_date: date
    customer_name: str
    customer_gstin: Optional[str] = None
    place_of_supply: str
    reverse_charge: str = "N"
    invoice_type: str = "Regular"
    total_invoice_value: Decimal
    taxable_value: Decimal
    tax_rate: Decimal
    igst_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    cess_amount: Decimal = Decimal("0.00")

class GSTR1HSNSummary(BaseModel):
    hsn_sac_code: str
    description: Optional[str] = None
    uqc: str = "PCS"
    total_quantity: Decimal
    total_value: Decimal
    taxable_value: Decimal
    tax_rate: Decimal
    igst_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    cess_amount: Decimal = Decimal("0.00")

class GSTR1Summary(BaseModel):
    entity_id: int
    return_period: str
    gstin: Optional[str] = None
    legal_name: str
    total_invoices_count: int
    total_taxable_value: Decimal
    total_igst: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_tax_liability: Decimal
    b2b_invoices: List[GSTR1B2BInvoice]
    hsn_summary: List[GSTR1HSNSummary]


# =========================================================================
# GSTR-3B SCHEMAS
# =========================================================================
class GSTR3BOutwardSupplies(BaseModel):
    taxable_value: Decimal
    igst: Decimal
    cgst: Decimal
    sgst: Decimal
    cess: Decimal = Decimal("0.00")

class GSTR3BEligibleITC(BaseModel):
    itc_igst: Decimal
    itc_cgst: Decimal
    itc_sgst: Decimal
    total_itc_available: Decimal

class GSTR3BTaxOffset(BaseModel):
    output_igst: Decimal
    output_cgst: Decimal
    output_sgst: Decimal
    total_output_liability: Decimal

    itc_offset_igst: Decimal
    itc_offset_cgst: Decimal
    itc_offset_sgst: Decimal
    total_itc_utilized: Decimal

    cash_payable_igst: Decimal
    cash_payable_cgst: Decimal
    cash_payable_sgst: Decimal
    total_cash_payable: Decimal

class GSTR3BSummary(BaseModel):
    entity_id: int
    return_period: str
    gstin: Optional[str] = None
    legal_name: str
    outward_supplies: GSTR3BOutwardSupplies
    eligible_itc: GSTR3BEligibleITC
    tax_settlement: GSTR3BTaxOffset
    status: GSTReturnStatus
    arn_number: Optional[str] = None
    filing_date: Optional[datetime] = None


# =========================================================================
# GST SETTLEMENT & FILING REQUESTS
# =========================================================================
class GSTSettlementRequest(BaseModel):
    entity_id: int
    return_period: str # e.g. "092026"
    payment_bank_account_id: Optional[int] = None
    reference_number: Optional[str] = None

class GSTSettlementResponse(BaseModel):
    message: str
    return_period: str
    total_output_liability: Decimal
    itc_utilized: Decimal
    cash_paid: Decimal
    settlement_journal_id: int
    arn_number: str

class GSTDashboardMetrics(BaseModel):
    current_period: str
    total_output_tax_due: Decimal
    total_input_tax_credit_available: Decimal
    net_tax_payable: Decimal
    gstr1_status: str
    gstr3b_status: str
    last_filed_period: Optional[str] = None

