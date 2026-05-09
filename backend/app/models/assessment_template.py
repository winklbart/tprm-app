import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TemplateQuestionType(str, enum.Enum):
    yes_no = "yes_no"
    text = "text"
    multiple_choice = "multiple_choice"
    file_upload = "file_upload"
    rating = "rating"


_question_type_col = Enum(
    "yes_no", "text", "multiple_choice", "file_upload", "rating",
    name="templatequestiontype",
)

_vendor_criticality_col = Enum(
    "Low", "Medium", "High", "Critical",
    name="vendorcriticality",
    create_constraint=False,
)

_template_assessment_type_col = Enum(
    "self_assessment", "trust_center", "access_to_information", "ai_check",
    name="templateassessmenttype",
)


class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    criticality: Mapped[str | None] = mapped_column(_vendor_criticality_col)
    type: Mapped[str] = mapped_column(_template_assessment_type_col, nullable=False, default="self_assessment")
    is_base_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AssessmentTemplateQuestion(Base):
    __tablename__ = "assessment_template_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessment_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(_question_type_col, nullable=False)
    options: Mapped[list | None] = mapped_column(JSONB)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
