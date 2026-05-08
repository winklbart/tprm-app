"""security intelligence tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "security_scan_results",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("results", postgresql.JSONB),
        sa.Column("error", sa.Text),
        sa.Column("scanned_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("asset_id", "source", name="uq_scan_asset_source"),
    )
    op.create_index("ix_security_scan_results_asset_id", "security_scan_results", ["asset_id"])

    op.create_table(
        "asset_vulnerabilities",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cve_id", sa.String(50), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("cvss_score", sa.Float),
        sa.Column("severity", sa.String(20), nullable=False, server_default="Informational"),
        sa.Column("epss_score", sa.Float),
        sa.Column("in_cisa_kev", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("published_date", sa.String(20)),
        sa.Column("url", sa.String(500)),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("asset_id", "cve_id", name="uq_vuln_asset_cve"),
    )
    op.create_index("ix_asset_vulnerabilities_asset_id", "asset_vulnerabilities", ["asset_id"])


def downgrade() -> None:
    op.drop_table("asset_vulnerabilities")
    op.drop_table("security_scan_results")
