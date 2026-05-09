"""add type column to assessment_templates

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_assessment_type_enum = postgresql.ENUM(
    "self_assessment", "trust_center", "access_to_information", "ai_check",
    name="templateassessmenttype",
)

# ── seed data: questions migrated from assessment_templates.py service ────────
# trust_center: from _TRUST_CENTER (text→text, multiline→text, yesno→yes_no)
_TC_QUESTIONS = [
    {"title": "Provide your Trust Center URL or public security documentation page.", "type": "text"},
    {"title": "List all compliance certifications currently held (e.g. SOC 2, ISO 27001, PCI-DSS).", "type": "text"},
    {"title": "When was your last third-party security audit completed?", "type": "text"},
    {"title": "Which security reports are available to customers upon request?", "type": "text"},
    {"title": "Are your security policies and procedures available for review by customers?", "type": "yes_no"},
]

# access_to_information: from _ACCESS_TO_INFO (multiline→text)
_ATI_QUESTIONS = [
    {"title": "Provide your most recent SOC 2 Type II report or equivalent audit report.", "type": "text"},
    {"title": "Provide your penetration test report from the last 12 months.", "type": "text"},
    {"title": "Provide your data processing agreement (DPA) template.", "type": "text"},
    {"title": "Provide your incident response and breach notification procedures.", "type": "text"},
    {"title": "Provide evidence of active cyber liability insurance coverage.", "type": "text"},
]

# ai_check: no questions exist in the codebase — placeholder templates only
_AI_CHECK_QUESTIONS: list = []

_NEW_BASE_TEMPLATES = []
for _crit in ["Low", "Medium", "High", "Critical"]:
    _crit_lower = _crit.lower()
    _NEW_BASE_TEMPLATES.extend([
        {
            "name": f"{_crit} Criticality Trust Center Review",
            "description": (
                f"5-question Trust Center review for {_crit_lower}-criticality vendors covering "
                "security documentation, certifications, audit history, and policy availability."
            ),
            "criticality": _crit,
            "type": "trust_center",
            "questions": _TC_QUESTIONS,
        },
        {
            "name": f"{_crit} Criticality Access to Information Request",
            "description": (
                f"5-question formal security documentation request for {_crit_lower}-criticality vendors "
                "covering audit reports, penetration tests, DPA, incident response, and insurance evidence."
            ),
            "criticality": _crit,
            "type": "access_to_information",
            "questions": _ATI_QUESTIONS,
        },
        {
            "name": f"{_crit} Criticality AI Check",
            "description": (
                f"AI-powered risk analysis placeholder for {_crit_lower}-criticality vendors. "
                "The AI Check generates its analysis dynamically from vendor and asset data; "
                "add custom questions here to supplement the automated analysis."
            ),
            "criticality": _crit,
            "type": "ai_check",
            "questions": _AI_CHECK_QUESTIONS,
        },
    ])


def upgrade() -> None:
    bind = op.get_bind()
    _assessment_type_enum.create(bind, checkfirst=True)

    op.add_column(
        "assessment_templates",
        sa.Column(
            "type",
            postgresql.ENUM(
                "self_assessment", "trust_center", "access_to_information", "ai_check",
                name="templateassessmenttype",
                create_type=False,
            ),
            nullable=False,
            server_default="'self_assessment'",
        ),
    )
    # Drop the server default — existing rows already got 'self_assessment'
    op.execute("ALTER TABLE assessment_templates ALTER COLUMN type DROP DEFAULT")
    op.create_index("ix_assessment_templates_type", "assessment_templates", ["type"])

    # Seed new base templates for trust_center, access_to_information, ai_check
    for tmpl in _NEW_BASE_TEMPLATES:
        result = bind.execute(
            sa.text(
                "INSERT INTO assessment_templates"
                " (name, description, criticality, type, is_base_template, version, is_active, created_by, created_at, updated_at)"
                " VALUES (:name, :description,"
                "  CAST(:criticality AS vendorcriticality),"
                "  CAST(:type AS templateassessmenttype),"
                "  true, 1, true, 'system', now(), now())"
                " RETURNING id"
            ),
            {
                "name": tmpl["name"],
                "description": tmpl["description"],
                "criticality": tmpl["criticality"],
                "type": tmpl["type"],
            },
        )
        template_id = result.scalar()

        for i, q in enumerate(tmpl["questions"]):
            bind.execute(
                sa.text(
                    "INSERT INTO assessment_template_questions"
                    " (template_id, sort_order, title, description, type, options, required, created_at)"
                    " VALUES (:tid, :ord, :title, NULL, CAST(:qtype AS templatequestiontype), NULL, true, now())"
                ),
                {"tid": template_id, "ord": i + 1, "title": q["title"], "qtype": q["type"]},
            )


def downgrade() -> None:
    bind = op.get_bind()
    # Remove templates seeded in this migration (non-self_assessment types)
    bind.execute(sa.text(
        "DELETE FROM assessment_template_questions WHERE template_id IN"
        " (SELECT id FROM assessment_templates WHERE type != 'self_assessment')"
    ))
    bind.execute(sa.text(
        "DELETE FROM assessment_templates WHERE type != 'self_assessment'"
    ))
    op.drop_index("ix_assessment_templates_type", table_name="assessment_templates")
    op.drop_column("assessment_templates", "type")
    _assessment_type_enum.drop(bind, checkfirst=True)
