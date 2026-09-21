from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.gst import GSTReturnFiling, GSTReturnType, GSTReturnStatus
from app.schemas.gst import (
    GSTR1Summary, GSTR3BSummary, GSTSettlementRequest,
    GSTSettlementResponse, GSTDashboardMetrics
)
from app.services.gst_engine import (
    generate_gstr1_report, generate_gstr3b_report,
    execute_gst_settlement, quantize_amount
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access,
    get_tenant_entity_ids, log_audit
)

router = APIRouter()


@router.get("/metrics", response_model=GSTDashboardMetrics)
def get_gst_metrics(
    entity_id: int = Query(...),
    period: Optional[str] = Query(None), # e.g. "092026"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    ret_period = period or f"{date.today().month:02d}{date.today().year}"
    gstr3b = generate_gstr3b_report(db, entity_id, ret_period)

    last_filing = db.query(GSTReturnFiling).filter(
        GSTReturnFiling.entity_id == entity_id,
        GSTReturnFiling.status == GSTReturnStatus.FILED
    ).order_by(desc(GSTReturnFiling.filing_date)).first()

    return GSTDashboardMetrics(
        current_period=ret_period,
        total_output_tax_due=gstr3b.tax_settlement.total_output_liability,
        total_input_tax_credit_available=gstr3b.eligible_itc.total_itc_available,
        net_tax_payable=gstr3b.tax_settlement.total_cash_payable,
        gstr1_status="READY_FOR_FILING",
        gstr3b_status=gstr3b.status.value,
        last_filed_period=last_filing.return_period if last_filing else None
    )


@router.get("/gstr1", response_model=GSTR1Summary)
def get_gstr1(
    entity_id: int = Query(...),
    period: str = Query(..., description="MMYYYY e.g. 092026"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    return generate_gstr1_report(db, entity_id, period)


@router.get("/gstr3b", response_model=GSTR3BSummary)
def get_gstr3b(
    entity_id: int = Query(...),
    period: str = Query(..., description="MMYYYY e.g. 092026"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    return generate_gstr3b_report(db, entity_id, period)


@router.post("/settle", response_model=GSTSettlementResponse)
def settle_gst_return(
    req: GSTSettlementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(req.entity_id, current_user, db)

    filing = execute_gst_settlement(
        db=db,
        entity_id=req.entity_id,
        return_period=req.return_period,
        payment_bank_account_id=req.payment_bank_account_id,
        reference_number=req.reference_number,
        current_user=current_user
    )

    log_audit(
        db=db,
        action="EXECUTE",
        record_type="GSTReturnFiling",
        record_id=str(filing.id),
        user=current_user,
        entity_id=filing.entity_id,
        details=f"Settled GSTR-3B for {filing.return_period} with ARN {filing.arn_number}"
    )

    return GSTSettlementResponse(
        message=f"GST statutory return for {filing.return_period} successfully settled and filed!",
        return_period=filing.return_period,
        total_output_liability=filing.total_tax_liability,
        itc_utilized=filing.total_itc_claimed,
        cash_paid=filing.net_tax_paid_cash,
        settlement_journal_id=filing.settlement_journal_id,
        arn_number=filing.arn_number
    )

