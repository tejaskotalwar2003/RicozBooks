import logging
from sqlalchemy.orm import Session
from app.models.account import Account, AccountType, NormalBalance
from app.models.company import Entity

logger = logging.getLogger(__name__)

STANDARD_COGS_CODE = "5700"
STANDARD_COGS_NAME = "Cost of Goods Sold (COGS)"
STANDARD_COGS_DESC = "Cost of inventory and merchandise sold"

# Operating expense keywords that must NEVER be used as COGS / Direct cost for products
DISALLOWED_COGS_KEYWORDS = [
    "salary",
    "payroll",
    "rent",
    "lease",
    "travel",
    "lodging",
    "marketing",
    "advertising",
    "legal",
    "professional fee",
    "consulting fee",
    "utilities",
    "electricity",
    "office supply",
    "stationery",
    "meal",
    "entertainment",
    "telephone",
    "internet"
]

# Valid COGS / Direct Cost keywords for inventory products
ALLOWED_COGS_KEYWORDS = [
    "cogs",
    "cost of goods sold",
    "cost of sales",
    "direct cost",
    "direct purchase",
    "direct expense",
    "merchandise cost",
    "inventory purchase",
    "trading purchase",
    "raw material purchase",
    "freight inward",
    "customs duty"
]


def is_valid_cogs_account(account: Account) -> bool:
    """
    Validates whether an account is suitable as a Cost of Goods Sold (COGS)
    or Direct Purchase account for inventory-tracked products.
    """
    if not account or account.account_type != AccountType.EXPENSE:
        return False

    code = (account.code or "").strip()
    name_lower = (account.name or "").lower().strip()

    # Explicit match for standard COGS
    if code == STANDARD_COGS_CODE or "cost of goods sold" in name_lower or "cogs" in name_lower:
        return True

    # Reject obvious operating and general overhead accounts
    for disallowed in DISALLOWED_COGS_KEYWORDS:
        if disallowed in name_lower:
            return False

    # Check for direct cost / purchase / COGS codes or keywords
    if code.startswith("57") or code in ["5050", "5005"]:
        return True

    for allowed in ALLOWED_COGS_KEYWORDS:
        if allowed in name_lower:
            return True

    return False


def ensure_cogs_account(db: Session, entity_id: int, base_currency: str = "INR") -> Account:
    """
    Idempotently ensures that standard account 5700 - Cost of Goods Sold (COGS)
    exists for the specified entity.
    
    1. If 5700 exists and is COGS, returns it.
    2. If 5700 exists but is a legacy bank fee account, migrates it to code 5750
       without altering journal lines or transactions, then provisions 5700 COGS.
    3. If 5700 does not exist, provisions 5700 COGS.
    """
    existing_5700 = db.query(Account).filter(
        Account.entity_id == entity_id,
        Account.code == STANDARD_COGS_CODE
    ).first()

    if existing_5700:
        name_lower = existing_5700.name.lower()
        if "bank" in name_lower or "fee" in name_lower or "charge" in name_lower:
            # Reassign legacy bank fee account code to 5750 to free 5700 for COGS
            existing_5700.code = "5750"
            db.flush()
            logger.info(f"Reassigned legacy Bank Fee account #{existing_5700.id} in entity {entity_id} from 5700 to 5750.")
        else:
            return existing_5700

    # Create standard 5700 COGS account
    cogs_account = Account(
        entity_id=entity_id,
        code=STANDARD_COGS_CODE,
        name=STANDARD_COGS_NAME,
        account_type=AccountType.EXPENSE,
        normal_balance=NormalBalance.DEBIT,
        currency=base_currency or "INR",
        description=STANDARD_COGS_DESC,
        is_active=True
    )
    db.add(cogs_account)
    db.flush()
    logger.info(f"Provisioned standard COGS account 5700 for entity {entity_id}.")
    return cogs_account


def ensure_standard_accounts_for_all_entities(db: Session) -> int:
    """
    Provisions 5700 Cost of Goods Sold (COGS) across all entities in the database.
    Safe to run repeatedly; completely idempotent.
    Returns the count of newly provisioned or migrated entities.
    """
    entities = db.query(Entity).all()
    count = 0
    for entity in entities:
        existing = db.query(Account).filter(
            Account.entity_id == entity.id,
            Account.code == STANDARD_COGS_CODE,
            Account.name == STANDARD_COGS_NAME
        ).first()
        if not existing:
            ensure_cogs_account(db, entity.id, entity.base_currency or "INR")
            count += 1
    db.commit()
    return count

