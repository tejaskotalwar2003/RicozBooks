from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.database.session import get_db
from app.models.user import User
from app.models.company import Entity
from app.models.account import Account, AccountType, NormalBalance
from app.models.expenses import (
    Expense, ExpenseCategory, ExpenseClaimStatus, ExpensePaymentMethod
)
from app.models.banking import BankAccount
from app.schemas.expenses import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseApprovalAction,
    ExpenseReimburseAction, ExpenseSummaryResponse
)
from app.services.expense_engine import (
    quantize_amount, generate_expense_number, seed_default_expense_categories,
    post_expense_to_gl, reimburse_expense_claim, ensure_account
)
from app.api.deps import (
    get_current_user, require_roles, verify_entity_access,
    get_tenant_entity_ids, log_audit
)

router = APIRouter()


# =========================================================================
# 1. EXPENSE CATEGORIES
# =========================================================================
@router.get("/categories", response_model=List[ExpenseCategoryResponse])
def get_expense_categories(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    
    # Auto-seed standard categories if none exist for entity
    existing_count = db.query(ExpenseCategory).filter(ExpenseCategory.entity_id == entity_id).count()
    if existing_count == 0:
        seed_default_expense_categories(db, entity_id)

    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.entity_id == entity_id,
        ExpenseCategory.is_active == True
    ).order_by(ExpenseCategory.name.asc()).all()
    return categories


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_expense_category(
    cat_in: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(cat_in.entity_id, current_user, db)
    
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.entity_id == cat_in.entity_id,
        ExpenseCategory.code == cat_in.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expense category with code '{cat_in.code}' already exists."
        )

    # Ensure default account if not supplied
    acc_id = cat_in.default_account_id
    if not acc_id:
        acc = ensure_account(
            db, 
            cat_in.entity_id, 
            "5300", 
            "General Business Expenses", 
            AccountType.EXPENSE, 
            NormalBalance.DEBIT
        )
        acc_id = acc.id

    category = ExpenseCategory(
        entity_id=cat_in.entity_id,
        code=cat_in.code,
        name=cat_in.name,
        description=cat_in.description,
        default_account_id=acc_id,
        tax_rate_percent=cat_in.tax_rate_percent,
        is_active=cat_in.is_active
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    log_audit(
        db=db,
        action="CREATE",
        record_type="ExpenseCategory",
        record_id=str(category.id),
        user=current_user,
        entity_id=category.entity_id,
        details=f"Created expense category {category.code} - {category.name}"
    )
    return category


# =========================================================================
# 2. EXPENSES & CLAIMS CRUD
# =========================================================================
def format_expense_response(exp: Expense) -> dict:
    return {
        "id": exp.id,
        "entity_id": exp.entity_id,
        "expense_number": exp.expense_number,
        "title": exp.title,
        "category_id": exp.category_id,
        "user_id": exp.user_id,
        "expense_date": exp.expense_date,
        "expense_account_id": exp.expense_account_id,
        "payment_account_id": exp.payment_account_id,
        "bank_account_id": exp.bank_account_id,
        "payment_method": exp.payment_method,
        "subtotal": exp.subtotal,
        "tax_amount": exp.tax_amount,
        "total_amount": exp.total_amount,
        "currency": exp.currency,
        "merchant_name": exp.merchant_name,
        "reference_number": exp.reference_number,
        "description": exp.description,
        "receipt_url": exp.receipt_url,
        "is_reimbursable": exp.is_reimbursable,
        "is_billable": exp.is_billable,
        "customer_id": exp.customer_id,
        "status": exp.status,
        "approved_by_id": exp.approved_by_id,
        "approved_at": exp.approved_at,
        "rejection_reason": exp.rejection_reason,
        "journal_entry_id": exp.journal_entry_id,
        "reimbursement_journal_id": exp.reimbursement_journal_id,
        "created_at": exp.created_at,
        "updated_at": exp.updated_at,
        "category_name": exp.category.name if exp.category else None,
        "expense_account_name": exp.expense_account.name if exp.expense_account else None,
        "payment_account_name": exp.payment_account.name if exp.payment_account else None,
        "submitter_name": f"{exp.user.first_name} {exp.user.last_name}" if exp.user else None
    }


@router.get("/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    entity_id: int = Query(...),
    status_filter: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    is_reimbursable: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    q = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.entity_id == entity_id)

    if status_filter:
        q = q.filter(Expense.status == status_filter.upper())
    if category_id:
        q = q.filter(Expense.category_id == category_id)
    if is_reimbursable is not None:
        q = q.filter(Expense.is_reimbursable == is_reimbursable)
    if search:
        s = f"%{search}%"
        q = q.filter((Expense.title.ilike(s)) | (Expense.merchant_name.ilike(s)) | (Expense.expense_number.ilike(s)))

    expenses = q.order_by(desc(Expense.expense_date), desc(Expense.id)).offset(offset).limit(limit).all()
    return [format_expense_response(e) for e in expenses]


@router.get("/expenses/{id}", response_model=ExpenseResponse)
def get_expense_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.id == id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")

    verify_entity_access(exp.entity_id, current_user, db)
    return format_expense_response(exp)


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    exp_in: ExpenseCreate,
    auto_post: bool = Query(False, description="Post immediately to GL if authorized"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(exp_in.entity_id, current_user, db)

    subtotal = quantize_amount(exp_in.subtotal)
    tax_amt = quantize_amount(exp_in.tax_amount)
    total_amt = quantize_amount(subtotal + tax_amt)

    expense_number = generate_expense_number(db, exp_in.entity_id)

    # Initial status: if reimbursable, default to SUBMITTED for review. Else DRAFT (or POSTED if auto_post).
    initial_status = ExpenseClaimStatus.SUBMITTED if exp_in.is_reimbursable else ExpenseClaimStatus.DRAFT

    expense = Expense(
        entity_id=exp_in.entity_id,
        expense_number=expense_number,
        title=exp_in.title,
        category_id=exp_in.category_id,
        user_id=current_user.id,
        expense_date=exp_in.expense_date,
        expense_account_id=exp_in.expense_account_id,
        payment_account_id=exp_in.payment_account_id,
        bank_account_id=exp_in.bank_account_id,
        payment_method=exp_in.payment_method,
        subtotal=subtotal,
        tax_amount=tax_amt,
        total_amount=total_amt,
        currency=exp_in.currency,
        merchant_name=exp_in.merchant_name,
        reference_number=exp_in.reference_number,
        description=exp_in.description,
        receipt_url=exp_in.receipt_url,
        is_reimbursable=exp_in.is_reimbursable,
        is_billable=exp_in.is_billable,
        customer_id=exp_in.customer_id,
        status=initial_status
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # If auto_post requested and not a pending employee reimbursement claim
    if auto_post and not exp_in.is_reimbursable:
        post_expense_to_gl(db, expense.id, current_user)
        db.refresh(expense)

    log_audit(
        db=db,
        action="CREATE",
        record_type="Expense",
        record_id=str(expense.id),
        user=current_user,
        entity_id=expense.entity_id,
        details=f"Created expense #{expense.expense_number} ({expense.title}) for {expense.total_amount}"
    )

    exp_detail = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.id == expense.id).first()
    return format_expense_response(exp_detail)


@router.post("/expenses/{id}/action", response_model=ExpenseResponse)
def approve_or_reject_expense(
    id: int,
    action_in: ExpenseApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = db.query(Expense).filter(Expense.id == id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    verify_entity_access(exp.entity_id, current_user, db)

    act = action_in.action.upper()
    if act == "APPROVE":
        exp.status = ExpenseClaimStatus.APPROVED
        exp.approved_by_id = current_user.id
        exp.approved_at = datetime.utcnow()
        exp.rejection_reason = None
    elif act == "REJECT":
        exp.status = ExpenseClaimStatus.REJECTED
        exp.rejection_reason = action_in.rejection_reason or "Expense claim was rejected by reviewer."
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action must be 'APPROVE' or 'REJECT'")

    db.commit()
    db.refresh(exp)

    exp_detail = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.id == exp.id).first()
    return format_expense_response(exp_detail)


@router.post("/expenses/{id}/post", response_model=ExpenseResponse)
def post_expense(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = db.query(Expense).filter(Expense.id == id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    verify_entity_access(exp.entity_id, current_user, db)
    post_expense_to_gl(db, exp.id, current_user)
    db.refresh(exp)

    exp_detail = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.id == exp.id).first()
    return format_expense_response(exp_detail)


@router.post("/expenses/{id}/reimburse", response_model=ExpenseResponse)
def disburse_reimbursement(
    id: int,
    reimb_in: ExpenseReimburseAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = db.query(Expense).filter(Expense.id == id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    verify_entity_access(exp.entity_id, current_user, db)
    reimburse_expense_claim(
        db=db,
        expense_id=exp.id,
        payment_account_id=reimb_in.payment_account_id,
        bank_account_id=reimb_in.bank_account_id,
        reference_number=reimb_in.reference_number,
        current_user=current_user
    )
    db.refresh(exp)

    exp_detail = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.expense_account),
        joinedload(Expense.payment_account),
        joinedload(Expense.user)
    ).filter(Expense.id == exp.id).first()
    return format_expense_response(exp_detail)


@router.get("/expenses-summary", response_model=ExpenseSummaryResponse)
def get_expenses_summary(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    today = date.today()
    month_start = date(today.year, today.month, 1)

    # Monthly total
    monthly_sum = db.query(func.coalesce(func.sum(Expense.total_amount), 0)).filter(
        Expense.entity_id == entity_id,
        Expense.expense_date >= month_start
    ).scalar()

    # Pending approvals count
    pending_count = db.query(Expense).filter(
        Expense.entity_id == entity_id,
        Expense.status.in_([ExpenseClaimStatus.SUBMITTED, ExpenseClaimStatus.DRAFT])
    ).count()

    # Reimbursable claims outstanding
    reimb_sum = db.query(func.coalesce(func.sum(Expense.total_amount), 0)).filter(
        Expense.entity_id == entity_id,
        Expense.is_reimbursable == True,
        Expense.status != ExpenseClaimStatus.PAID
    ).scalar()

    # Posted expenses total
    posted_sum = db.query(func.coalesce(func.sum(Expense.total_amount), 0)).filter(
        Expense.entity_id == entity_id,
        Expense.status.in_([ExpenseClaimStatus.POSTED, ExpenseClaimStatus.PAID])
    ).scalar()

    # Category breakdown
    breakdown_raw = db.query(
        ExpenseCategory.name,
        func.coalesce(func.sum(Expense.total_amount), 0)
    ).join(Expense, Expense.category_id == ExpenseCategory.id).filter(
        Expense.entity_id == entity_id
    ).group_by(ExpenseCategory.name).all()

    breakdown = [{"category": row[0], "amount": float(row[1])} for row in breakdown_raw]

    return {
        "total_expenses_month": quantize_amount(Decimal(str(monthly_sum))),
        "pending_approvals_count": pending_count,
        "reimbursable_claims_total": quantize_amount(Decimal(str(reimb_sum))),
        "posted_expenses_total": quantize_amount(Decimal(str(posted_sum))),
        "category_breakdown": breakdown
    }
