"""add dashboard_settings.display_cost_currency

Revision ID: 20260421_000000_add_dashboard_settings_display_cost_currency
Revises: 20260420_000000_add_accounts_expires_on
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Connection

revision = "20260421_000000_add_dashboard_settings_display_cost_currency"
down_revision = "20260420_000000_add_accounts_expires_on"
branch_labels = None
depends_on = None


def _columns(connection: Connection, table_name: str) -> set[str]:
    inspector = sa.inspect(connection)
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    columns = _columns(bind, "dashboard_settings")
    if not columns or "display_cost_currency" in columns:
        return
    op.add_column(
        "dashboard_settings",
        sa.Column(
            "display_cost_currency",
            sa.String(length=3),
            nullable=False,
            server_default="USD",
        ),
    )


def downgrade() -> None:
    bind = op.get_bind()
    columns = _columns(bind, "dashboard_settings")
    if "display_cost_currency" not in columns:
        return
    op.drop_column("dashboard_settings", "display_cost_currency")
