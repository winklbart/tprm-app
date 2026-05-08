"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Pre-defined enum types reused in op.create_table with create_type=False
# so SQLAlchemy doesn't attempt a second CREATE TYPE after we already created them.
_vendor_criticality  = postgresql.ENUM("Low", "Medium", "High", "Critical",          name="vendorcriticality",  create_type=False)
_vendor_status       = postgresql.ENUM("Active", "Inactive", "Under Review", "Offboarded", name="vendorstatus", create_type=False)
_vendor_category     = postgresql.ENUM("Cloud Provider", "Software Vendor", "Consultant", "Hardware", "Other", name="vendorcategory", create_type=False)
_asset_type          = postgresql.ENUM("Software", "SaaS", "API", "On-Premise", "Hardware", name="assettype",  create_type=False)
_data_classification = postgresql.ENUM("Public", "Internal", "Confidential", "Restricted", name="dataclassification", create_type=False)
_assessment_type     = postgresql.ENUM("self_assessment", "ai_check", "trust_center", "access_to_information", name="assessmenttype", create_type=False)
_assessment_status   = postgresql.ENUM("Draft", "Sent", "In Progress", "Completed", "Overdue", "Closed", name="assessmentstatus", create_type=False)
_risk_category       = postgresql.ENUM("Data Privacy", "Operational", "Financial", "Compliance", "Reputational", name="riskcategory", create_type=False)
_risk_status         = postgresql.ENUM("Open", "In Mitigation", "Accepted", "Closed", name="riskstatus",       create_type=False)
_finding_severity    = postgresql.ENUM("Critical", "High", "Medium", "Low", "Informational", name="findingseverity", create_type=False)
_finding_status      = postgresql.ENUM("Open", "Resolved", "Accepted",                name="findingstatus",    create_type=False)
_audit_action        = postgresql.ENUM("Create", "Update", "Delete", "StatusChange",  name="auditaction",      create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    # Create all enum types first (checkfirst=True → safe to re-run)
    for e in [
        postgresql.ENUM("Low", "Medium", "High", "Critical",          name="vendorcriticality"),
        postgresql.ENUM("Active", "Inactive", "Under Review", "Offboarded", name="vendorstatus"),
        postgresql.ENUM("Cloud Provider", "Software Vendor", "Consultant", "Hardware", "Other", name="vendorcategory"),
        postgresql.ENUM("Software", "SaaS", "API", "On-Premise", "Hardware", name="assettype"),
        postgresql.ENUM("Public", "Internal", "Confidential", "Restricted", name="dataclassification"),
        postgresql.ENUM("self_assessment", "ai_check", "trust_center", "access_to_information", name="assessmenttype"),
        postgresql.ENUM("Draft", "Sent", "In Progress", "Completed", "Overdue", "Closed", name="assessmentstatus"),
        postgresql.ENUM("Data Privacy", "Operational", "Financial", "Compliance", "Reputational", name="riskcategory"),
        postgresql.ENUM("Open", "In Mitigation", "Accepted", "Closed", name="riskstatus"),
        postgresql.ENUM("Critical", "High", "Medium", "Low", "Informational", name="findingseverity"),
        postgresql.ENUM("Open", "Resolved", "Accepted", name="findingstatus"),
        postgresql.ENUM("Create", "Update", "Delete", "StatusChange", name="auditaction"),
    ]:
        e.create(bind, checkfirst=True)

    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("criticality", _vendor_criticality, nullable=False),
        sa.Column("status", _vendor_status, nullable=False, server_default="Active"),
        sa.Column("category", _vendor_category, nullable=False),
        sa.Column("country", sa.String(100)),
        sa.Column("website", sa.String(500)),
        sa.Column("primary_contact_name", sa.String(255)),
        sa.Column("primary_contact_email", sa.String(255)),
        sa.Column("risk_score", sa.Float),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vendors_name", "vendors", ["name"])

    op.create_table(
        "assets",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("vendor_id", sa.Integer, sa.ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", _asset_type, nullable=False),
        sa.Column("version", sa.String(100)),
        sa.Column("description", sa.Text),
        sa.Column("owner", sa.String(255)),
        sa.Column("license_expiry", sa.Date),
        sa.Column("data_classification", _data_classification, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_assets_vendor_id", "assets", ["vendor_id"])
    op.create_index("ix_assets_name", "assets", ["name"])

    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("vendor_id", sa.Integer, sa.ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", _assessment_type, nullable=False),
        sa.Column("status", _assessment_status, nullable=False, server_default="Draft"),
        sa.Column("due_date", sa.Date),
        sa.Column("completed_at", sa.DateTime),
        sa.Column("questions", postgresql.JSONB),
        sa.Column("answers", postgresql.JSONB),
        sa.Column("ai_result", postgresql.JSONB),
        sa.Column("created_by", sa.String(255)),
        sa.Column("assigned_to", sa.String(255)),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_assessments_vendor_id", "assessments", ["vendor_id"])

    op.create_table(
        "risks",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("vendor_id", sa.Integer, sa.ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assessment_id", sa.Integer, sa.ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("category", _risk_category, nullable=False),
        sa.Column("likelihood", sa.Integer, nullable=False),
        sa.Column("impact", sa.Integer, nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("mitigation_plan", sa.Text),
        sa.Column("owner", sa.String(255)),
        sa.Column("status", _risk_status, nullable=False, server_default="Open"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_risks_vendor_id", "risks", ["vendor_id"])

    op.create_table(
        "findings",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("assessment_id", sa.Integer, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("risk_id", sa.Integer, sa.ForeignKey("risks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("severity", _finding_severity, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("recommendation", sa.Text),
        sa.Column("status", _finding_status, nullable=False, server_default="Open"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_findings_assessment_id", "findings", ["assessment_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.Integer, nullable=False),
        sa.Column("action", _audit_action, nullable=False),
        sa.Column("changed_by", sa.String(255)),
        sa.Column("changes", postgresql.JSONB),
        sa.Column("timestamp", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("findings")
    op.drop_table("risks")
    op.drop_table("assessments")
    op.drop_table("assets")
    op.drop_table("vendors")

    for name in ["auditaction", "findingstatus", "findingseverity", "riskstatus", "riskcategory",
                 "assessmentstatus", "assessmenttype", "dataclassification", "assettype",
                 "vendorcategory", "vendorstatus", "vendorcriticality"]:
        op.execute(f"DROP TYPE IF EXISTS {name}")
