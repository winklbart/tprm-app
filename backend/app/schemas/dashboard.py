from pydantic import BaseModel


class TopVendor(BaseModel):
    id: int
    name: str
    criticality: str
    risk_count: int
    max_risk_score: int


class RecentRisk(BaseModel):
    id: int
    title: str
    category: str
    risk_score: int
    status: str
    vendor_name: str | None = None


class OverdueAssessment(BaseModel):
    id: int
    vendor_name: str | None = None
    type: str
    due_date: str | None = None
    assigned_to: str | None = None
    days_overdue: int


class DashboardData(BaseModel):
    vendor_count: int
    asset_count: int
    risk_count: int
    open_risk_count: int
    assessment_count: int
    overdue_count: int
    vendor_by_criticality: dict[str, int]
    risk_by_status: dict[str, int]
    risk_by_category: dict[str, int]
    assessment_by_status: dict[str, int]
    top_risk_vendors: list[TopVendor]
    recent_risks: list[RecentRisk]
    overdue_assessments: list[OverdueAssessment]
