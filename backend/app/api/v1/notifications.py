import smtplib
from datetime import date, timedelta
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.assessment import Assessment
from app.models.asset import Asset
from app.models.vendor import Vendor

router = APIRouter(prefix="/notifications", tags=["notifications"])


class Alert(BaseModel):
    type: str
    severity: str
    message: str
    entity_id: int
    entity_type: str


@router.get("/alerts", response_model=list[Alert])
def get_alerts(db: Session = Depends(get_db)):
    alerts: list[Alert] = []
    today = date.today()

    overdue_rows = (
        db.query(Assessment, Vendor.name.label("vendor_name"))
        .outerjoin(Vendor, Vendor.id == Assessment.vendor_id)
        .filter(Assessment.due_date < today, Assessment.status.notin_(["Completed", "Closed"]))
        .all()
    )
    for row in overdue_rows:
        a = row.Assessment
        days = (today - a.due_date).days if a.due_date else 0
        alerts.append(Alert(
            type="overdue_assessment",
            severity="high" if days > 14 else "medium",
            message=f"Assessment for {row.vendor_name or 'Unknown'} is {days} day(s) overdue",
            entity_id=a.id,
            entity_type="assessment",
        ))

    soon = today + timedelta(days=30)
    expiring = db.query(Asset).filter(
        Asset.license_expiry.isnot(None),
        Asset.license_expiry >= str(today),
        Asset.license_expiry <= str(soon),
    ).all()
    for asset in expiring:
        try:
            exp_date = date.fromisoformat(asset.license_expiry)
            days_left = (exp_date - today).days
        except (ValueError, TypeError):
            continue
        alerts.append(Alert(
            type="expiring_license",
            severity="medium" if days_left > 7 else "high",
            message=f'Asset "{asset.name}" license expires in {days_left} day(s)',
            entity_id=asset.id,
            entity_type="asset",
        ))

    high_risk = db.query(Vendor).filter(Vendor.risk_score > 70).all()
    for vendor in high_risk:
        alerts.append(Alert(
            type="high_risk_vendor",
            severity="high",
            message=f'Vendor "{vendor.name}" has risk score {vendor.risk_score:.0f}',
            entity_id=vendor.id,
            entity_type="vendor",
        ))

    return alerts


@router.post("/send-overdue", status_code=200)
def send_overdue_emails(db: Session = Depends(get_db)):
    today = date.today()
    overdue_rows = (
        db.query(Assessment, Vendor.name.label("vendor_name"))
        .outerjoin(Vendor, Vendor.id == Assessment.vendor_id)
        .filter(Assessment.due_date < today, Assessment.status.notin_(["Completed", "Closed"]))
        .filter(Assessment.assigned_to.isnot(None))
        .all()
    )
    sent: list[str] = []
    for row in overdue_rows:
        a = row.Assessment
        if not a.assigned_to:
            continue
        days = (today - a.due_date).days if a.due_date else 0
        if settings.email_enabled and settings.email_host:
            try:
                msg = MIMEText(
                    f"The assessment for {row.vendor_name or 'Unknown'} was due on "
                    f"{a.due_date} ({days} days ago).\n"
                    f"Please complete it at your earliest convenience."
                )
                msg["Subject"] = f"[TPRM] Overdue Assessment Reminder: {row.vendor_name}"
                msg["From"] = settings.email_from
                msg["To"] = a.assigned_to
                with smtplib.SMTP(settings.email_host, settings.email_port) as smtp:
                    smtp.sendmail(settings.email_from, [a.assigned_to], msg.as_string())
                sent.append(a.assigned_to)
            except Exception:
                pass
        else:
            print(
                f"[NOTIFY] Would email {a.assigned_to}: "
                f"Overdue assessment #{a.id} for {row.vendor_name}"
            )
            sent.append(a.assigned_to)
    return {"sent": len(sent), "recipients": sent}
