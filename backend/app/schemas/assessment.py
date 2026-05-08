from datetime import date, datetime

from pydantic import BaseModel


class AssessmentBase(BaseModel):
    vendor_id: int
    asset_id: int | None = None
    type: str
    due_date: date | None = None
    assigned_to: str | None = None


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    status: str | None = None
    due_date: date | None = None
    assigned_to: str | None = None


class AssessmentRead(AssessmentBase):
    id: int
    status: str
    questions: list | None = None
    answers: dict | None = None
    ai_result: dict | None = None
    created_by: str | None = None
    public_token: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    vendor_name: str | None = None

    model_config = {"from_attributes": True}
