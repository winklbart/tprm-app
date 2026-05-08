import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssessmentType(str, enum.Enum):
    self_assessment = "self_assessment"
    ai_check = "ai_check"
    trust_center = "trust_center"
    access_to_information = "access_to_information"


class AssessmentStatus(str, enum.Enum):
    draft = "Draft"
    sent = "Sent"
    in_progress = "In Progress"
    completed = "Completed"
    overdue = "Overdue"
    closed = "Closed"


_assessment_type_col = Enum(
    "self_assessment", "ai_check", "trust_center", "access_to_information",
    name="assessmenttype",
)
_assessment_status_col = Enum(
    "Draft", "Sent", "In Progress", "Completed", "Overdue", "Closed",
    name="assessmentstatus",
)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), index=True)
    type: Mapped[str] = mapped_column(_assessment_type_col, nullable=False)
    status: Mapped[str] = mapped_column(_assessment_status_col, nullable=False, default="Draft")
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    questions: Mapped[list | None] = mapped_column(JSONB)
    answers: Mapped[dict | None] = mapped_column(JSONB)
    ai_result: Mapped[dict | None] = mapped_column(JSONB)
    created_by: Mapped[str | None] = mapped_column(String(255))
    assigned_to: Mapped[str | None] = mapped_column(String(255))
    public_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
