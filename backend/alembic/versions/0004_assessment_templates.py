"""assessment template tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-09
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_vendor_criticality = postgresql.ENUM(
    "Low", "Medium", "High", "Critical",
    name="vendorcriticality",
    create_type=False,
)

_question_type = postgresql.ENUM(
    "yes_no", "text", "multiple_choice", "file_upload", "rating",
    name="templatequestiontype",
)

# ── existing questions (from assessment_templates.py service) ─────────────────
# Types mapped: yesno→yes_no, text→text, multiline→text

_LOW_QUESTIONS = [
    {"title": "Do you have a formal information security policy?", "type": "yes_no"},
    {"title": "Do you perform background checks on employees with access to customer data?", "type": "yes_no"},
    {"title": "How is customer data encrypted at rest and in transit?", "type": "text"},
    {"title": "Do you have a documented data breach notification process?", "type": "yes_no"},
    {"title": "Do you have a business continuity and disaster recovery plan?", "type": "yes_no"},
]

_MEDIUM_QUESTIONS = _LOW_QUESTIONS + [
    {"title": "Do you hold ISO 27001, SOC 2, or an equivalent certification?", "type": "yes_no"},
    {"title": "How frequently do you conduct internal or external security audits?", "type": "text"},
    {"title": "Is multi-factor authentication enforced for all systems handling customer data?", "type": "yes_no"},
    {"title": "How do you manage and monitor your own third-party vendor risk?", "type": "text"},
    {"title": "Describe your patch management and vulnerability remediation process.", "type": "text"},
]

_HIGH_QUESTIONS = _MEDIUM_QUESTIONS + [
    {"title": "Do you conduct annual penetration testing by an accredited third party?", "type": "yes_no"},
    {"title": "Describe your incident response plan and escalation procedures.", "type": "text"},
    {"title": "How are cryptographic keys managed, stored, and rotated?", "type": "text"},
    {"title": "Do you have a dedicated CISO or equivalent security leadership role?", "type": "yes_no"},
    {"title": "Which data privacy regulations are you certified or compliant with (e.g. GDPR, CCPA, HIPAA)?", "type": "text"},
]

# Critical uses the same 15 questions as High (reflects existing service behaviour)
_CRITICAL_QUESTIONS = _HIGH_QUESTIONS

_BASE_TEMPLATES = [
    {
        "name": "Low Criticality Assessment",
        "description": "5-question baseline assessment for low-criticality vendors covering fundamental security controls, data handling, and business continuity.",
        "criticality": "Low",
        "questions": _LOW_QUESTIONS,
    },
    {
        "name": "Medium Criticality Assessment",
        "description": "10-question standard assessment for medium-criticality vendors, extending the Low template with certifications, MFA, audit frequency, and patch management.",
        "criticality": "Medium",
        "questions": _MEDIUM_QUESTIONS,
    },
    {
        "name": "High Criticality Assessment",
        "description": "15-question comprehensive assessment for high-criticality vendors, adding penetration testing, incident response, key management, CISO role, and regulatory compliance.",
        "criticality": "High",
        "questions": _HIGH_QUESTIONS,
    },
    {
        "name": "Critical Criticality Assessment",
        "description": "15-question full assessment for critical vendors, incorporating all High-criticality questions. Mirrors the existing framework; extend with additional custom questions as needed.",
        "criticality": "Critical",
        "questions": _CRITICAL_QUESTIONS,
    },
]


def upgrade() -> None:
    bind = op.get_bind()
    _question_type.create(bind, checkfirst=True)

    op.create_table(
        "assessment_templates",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("criticality", _vendor_criticality, nullable=True),
        sa.Column("is_base_template", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by", sa.String(255)),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_assessment_templates_criticality", "assessment_templates", ["criticality"])
    op.create_index("ix_assessment_templates_is_base_template", "assessment_templates", ["is_base_template"])

    _tq_type_col = postgresql.ENUM(
        "yes_no", "text", "multiple_choice", "file_upload", "rating",
        name="templatequestiontype",
        create_type=False,
    )

    op.create_table(
        "assessment_template_questions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("template_id", sa.Integer, sa.ForeignKey("assessment_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("type", _tq_type_col, nullable=False),
        sa.Column("options", postgresql.JSONB),
        sa.Column("required", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_atq_template_id", "assessment_template_questions", ["template_id"])

    # Seed base templates
    for tmpl in _BASE_TEMPLATES:
        result = bind.execute(
            sa.text(
                "INSERT INTO assessment_templates (name, description, criticality, is_base_template, version, is_active, created_by, created_at, updated_at)"
                " VALUES (:name, :description, CAST(:criticality AS vendorcriticality), true, 1, true, 'system', now(), now())"
                " RETURNING id"
            ),
            {"name": tmpl["name"], "description": tmpl["description"], "criticality": tmpl["criticality"]},
        )
        template_id = result.scalar()

        for i, q in enumerate(tmpl["questions"]):
            bind.execute(
                sa.text(
                    "INSERT INTO assessment_template_questions (template_id, sort_order, title, description, type, options, required, created_at)"
                    " VALUES (:tid, :ord, :title, NULL, CAST(:qtype AS templatequestiontype), NULL, true, now())"
                ),
                {"tid": template_id, "ord": i + 1, "title": q["title"], "qtype": q["type"]},
            )


def downgrade() -> None:
    op.drop_table("assessment_template_questions")
    op.drop_table("assessment_templates")
    bind = op.get_bind()
    _question_type.drop(bind, checkfirst=True)
