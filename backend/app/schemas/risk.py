from datetime import datetime

from pydantic import BaseModel, Field

from app.models.risk import RiskCategory, RiskStatus


class RiskBase(BaseModel):
    vendor_id: int
    asset_id: int | None = None
    assessment_id: int | None = None
    title: str
    description: str | None = None
    category: RiskCategory
    likelihood: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    mitigation_plan: str | None = None
    owner: str | None = None
    status: RiskStatus = RiskStatus.open


class RiskCreate(RiskBase):
    pass


class RiskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: RiskCategory | None = None
    likelihood: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    mitigation_plan: str | None = None
    owner: str | None = None
    status: RiskStatus | None = None
    asset_id: int | None = None


class RiskRead(RiskBase):
    id: int
    risk_score: int
    vendor_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
