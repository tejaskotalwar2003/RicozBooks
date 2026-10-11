"""add_invitation_email_delivery_tracking

Revision ID: d3b84f1a2901
Revises: c095a8e1b342
Create Date: 2026-10-11 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3b84f1a2901'
down_revision: Union[str, Sequence[str], None] = 'c095a8e1b342'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely check and add columns to organization_invitations
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c['name'] for c in inspector.get_columns('organization_invitations')]

    if 'email_status' not in existing_cols:
        op.add_column(
            'organization_invitations',
            sa.Column('email_status', sa.String(length=30), nullable=False, server_default='PENDING')
        )

    if 'email_sent_at' not in existing_cols:
        op.add_column(
            'organization_invitations',
            sa.Column('email_sent_at', sa.DateTime(), nullable=True)
        )

    if 'email_error' not in existing_cols:
        op.add_column(
            'organization_invitations',
            sa.Column('email_error', sa.Text(), nullable=True)
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = [c['name'] for c in inspector.get_columns('organization_invitations')]

    if 'email_error' in existing_cols:
        op.drop_column('organization_invitations', 'email_error')

    if 'email_sent_at' in existing_cols:
        op.drop_column('organization_invitations', 'email_sent_at')

    if 'email_status' in existing_cols:
        op.drop_column('organization_invitations', 'email_status')

