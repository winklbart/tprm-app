"""add public_token to assessments

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("assessments", sa.Column("public_token", sa.String(64), nullable=True))
    op.create_unique_constraint("uq_assessments_public_token", "assessments", ["public_token"])


def downgrade() -> None:
    op.drop_constraint("uq_assessments_public_token", "assessments", type_="unique")
    op.drop_column("assessments", "public_token")
