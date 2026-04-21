"""add expires_on to accounts

Revision ID: 20260420_000000_add_accounts_expires_on
Revises: 20260413_000000_add_accounts_blocked_at
Create Date: 2026-04-20
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Connection

revision = "20260420_000000_add_accounts_expires_on"
down_revision = "20260413_000000_add_accounts_blocked_at"
branch_labels = None
depends_on = None


def _columns(connection: Connection, table_name: str) -> set[str]:
    inspector = sa.inspect(connection)
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    columns = _columns(bind, "accounts")
    if not columns or "expires_on" in columns:
        return

    with op.batch_alter_table("accounts") as batch_op:
        batch_op.add_column(sa.Column("expires_on", sa.Date(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = _columns(bind, "accounts")
    if "expires_on" not in columns:
        return

    with op.batch_alter_table("accounts") as batch_op:
        batch_op.drop_column("expires_on")
