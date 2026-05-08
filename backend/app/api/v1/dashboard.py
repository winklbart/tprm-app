from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.assessment import Assessment
from app.models.asset import Asset
from app.models.risk import Risk
from app.models.vendor import Vendor
from app.schemas.dashboard import DashboardData, OverdueAssessment, RecentRisk, TopVendor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    vendor_count = db.query(func.count(Vendor.id)).scalar() or 0
    asset_count = db.query(func.count(Asset.id)).scalar() or 0
    risk_count = db.query(func.count(Risk.id)).scalar() or 0
    open_risk_count = db.query(func.count(Risk.id)).filter(Risk.status == "Open").scalar() or 0
    assessment_count = db.query(func.count(Assessment.id)).scalar() or 0
    today = date.today()
    overdue_count = (
        db.query(func.count(Assessment.id))
        .filter(Assessment.due_date < today, Assessment.status.notin_(["Completed", "Closed"]))
        .scalar() or 0
    )

    vendor_by_criticality = dict(
        db.query(Vendor.criticality, func.count(Vendor.id)).group_by(Vendor.criticality).all()
    )
    risk_by_status = dict(
        db.query(Risk.status, func.count(Risk.id)).group_by(Risk.status).all()
    )
    risk_by_category = dict(
        db.query(Risk.category, func.count(Risk.id)).group_by(Risk.category).all()
    )
    assessment_by_status = dict(
        db.query(Assessment.status, func.count(Assessment.id)).group_by(Assessment.status).all()
    )

    top_risk_rows = (
        db.query(
            Vendor.id,
            Vendor.name,
            Vendor.criticality,
            func.count(Risk.id).label("risk_count"),
            func.max(Risk.risk_score).label("max_risk_score"),
        )
        .join(Risk, Risk.vendor_id == Vendor.id)
        .group_by(Vendor.id, Vendor.name, Vendor.criticality)
        .order_by(func.max(Risk.risk_score).desc())
        .limit(5)
        .all()
    )
    top_risk_vendors = [
        TopVendor(
            id=row.id,
            name=row.name,
            criticality=row.criticality,
            risk_count=row.risk_count,
            max_risk_score=row.max_risk_score,
        )
        for row in top_risk_rows
    ]

    recent_risk_rows = (
        db.query(Risk, Vendor.name.label("vendor_name"))
        .outerjoin(Vendor, Vendor.id == Risk.vendor_id)
        .order_by(Risk.created_at.desc())
        .limit(5)
        .all()
    )
    recent_risks = [
        RecentRisk(
            id=row.Risk.id,
            title=row.Risk.title,
            category=row.Risk.category,
            risk_score=row.Risk.risk_score,
            status=row.Risk.status,
            vendor_name=row.vendor_name,
        )
        for row in recent_risk_rows
    ]

    overdue_rows = (
        db.query(Assessment, Vendor.name.label("vendor_name"))
        .outerjoin(Vendor, Vendor.id == Assessment.vendor_id)
        .filter(Assessment.due_date < today, Assessment.status.notin_(["Completed", "Closed"]))
        .order_by(Assessment.due_date.asc())
        .limit(10)
        .all()
    )
    overdue_assessments = [
        OverdueAssessment(
            id=row.Assessment.id,
            vendor_name=row.vendor_name,
            type=row.Assessment.type,
            due_date=str(row.Assessment.due_date) if row.Assessment.due_date else None,
            assigned_to=row.Assessment.assigned_to,
            days_overdue=(today - row.Assessment.due_date).days if row.Assessment.due_date else 0,
        )
        for row in overdue_rows
    ]

    return DashboardData(
        vendor_count=vendor_count,
        asset_count=asset_count,
        risk_count=risk_count,
        open_risk_count=open_risk_count,
        assessment_count=assessment_count,
        overdue_count=overdue_count,
        vendor_by_criticality=vendor_by_criticality,
        risk_by_status=risk_by_status,
        risk_by_category=risk_by_category,
        assessment_by_status=assessment_by_status,
        top_risk_vendors=top_risk_vendors,
        recent_risks=recent_risks,
        overdue_assessments=overdue_assessments,
    )
