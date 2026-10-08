"""provision_standard_cogs_5700_account

Revision ID: c095a8e1b342
Revises: 52a6e202a942
Create Date: 2026-10-07 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'c095a8e1b342'
down_revision: Union[str, Sequence[str], None] = '52a6e202a942'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Idempotently provisions standard account 5700 - Cost of Goods Sold (COGS)
    for all existing entities.
    Reassigns any legacy bank fee accounts with code 5700 to code 5750 to prevent collision.
    """
    conn = op.get_bind()

    # 1. Reassign any conflicting legacy bank fee accounts from 5700 to 5750
    conn.execute(text("""
        UPDATE accounts
        SET code = '5750', updated_at = NOW()
        WHERE code = '5700' 
          AND (LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%fee%' OR LOWER(name) LIKE '%charge%')
    """))

    # 2. Provision standard 5700 Cost of Goods Sold (COGS) for every entity missing it
    conn.execute(text("""
        INSERT INTO accounts (entity_id, code, name, account_type, normal_balance, description, currency, is_active, created_at, updated_at)
        SELECT 
            e.id,
            '5700',
            'Cost of Goods Sold (COGS)',
            'EXPENSE',
            'DEBIT',
            'Cost of inventory and merchandise sold',
            COALESCE(e.base_currency, 'INR'),
            true,
            NOW(),
            NOW()
        FROM entities e
        WHERE NOT EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.entity_id = e.id AND a.code = '5700'
        )
    """))


def downgrade() -> None:
    """Downgrade: Remove provisioned 5700 COGS accounts that have no ledger lines."""
    conn = op.get_bind()
    conn.execute(text("""
        DELETE FROM accounts
        WHERE code = '5700'
          AND name = 'Cost of Goods Sold (COGS)'
          AND id NOT IN (SELECT DISTINCT account_id FROM journal_entry_lines)
    """))

