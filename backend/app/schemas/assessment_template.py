from datetime import datetime

from pydantic import BaseModel


class TemplateQuestionBase(BaseModel):
    sort_order: int
    title: str
    description: str | None = None
    type: str
    options: list[str] | None = None
    required: bool = True


class TemplateQuestionCreate(TemplateQuestionBase):
    pass


class TemplateQuestionRead(TemplateQuestionBase):
    id: int
    template_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AssessmentTemplateBase(BaseModel):
    name: str
    description: str | None = None
    criticality: str | None = None
    type: str = "self_assessment"


class AssessmentTemplateCreate(AssessmentTemplateBase):
    questions: list[TemplateQuestionCreate] = []


class AssessmentTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    criticality: str | None = None
    is_active: bool | None = None
    # type is intentionally excluded — immutable after creation


class AssessmentTemplateRead(AssessmentTemplateBase):
    id: int
    is_base_template: bool
    version: int
    is_active: bool
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    question_count: int = 0

    model_config = {"from_attributes": True}


class AssessmentTemplateDetail(AssessmentTemplateRead):
    questions: list[TemplateQuestionRead] = []
