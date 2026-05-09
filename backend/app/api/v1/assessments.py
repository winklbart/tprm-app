import secrets
import smtplib
from datetime import datetime
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.assessment import Assessment
from app.models.assessment_template import AssessmentTemplate, AssessmentTemplateQuestion
from app.models.vendor import Vendor
from app.schemas.assessment import AssessmentCreate, AssessmentRead, AssessmentUpdate
from app.schemas.common import PaginatedResponse
from app.services.assessment_templates import get_template_questions

router = APIRouter(prefix="/assessments", tags=["assessments"])
public_router = APIRouter(prefix="/public/assessments", tags=["public"])

_QUESTION_TYPE_MAP = {
    "yes_no": "yesno",
    "text": "text",
    "multiple_choice": "text",
    "file_upload": "text",
    "rating": "text",
}


def _template_qs_to_assessment_format(questions: list[AssessmentTemplateQuestion]) -> list[dict]:
    """Convert new-style template questions to the legacy assessment JSONB format."""
    return [
        {
            "id": f"q{q.sort_order}",
            "question": q.title,
            "type": _QUESTION_TYPE_MAP.get(q.type, "text"),
        }
        for q in questions
    ]


def _resolve_questions(db: Session, assessment_type: str, vendor_criticality: str) -> list[dict]:
    """Resolve the questions for a new assessment.

    For self_assessment, queries the DB for the active template:
      1. Active custom template for the criticality (is_base_template=False)
      2. Base template for the criticality (active flag is ignored — always the fallback)
      3. Hardcoded service (safety net if no templates seeded)

    All other types (trust_center, access_to_information, ai_check) continue to use
    the hardcoded service unchanged.
    """
    if assessment_type != "self_assessment":
        return get_template_questions(assessment_type, vendor_criticality)

    # 1. Active custom template
    custom = (
        db.query(AssessmentTemplate)
        .filter(
            AssessmentTemplate.criticality == vendor_criticality,
            AssessmentTemplate.is_active == True,
            AssessmentTemplate.is_base_template == False,
        )
        .first()
    )
    if custom:
        qs = (
            db.query(AssessmentTemplateQuestion)
            .filter(AssessmentTemplateQuestion.template_id == custom.id)
            .order_by(AssessmentTemplateQuestion.sort_order)
            .all()
        )
        return _template_qs_to_assessment_format(qs)

    # 2. Base template (always the fallback regardless of is_active)
    base = (
        db.query(AssessmentTemplate)
        .filter(
            AssessmentTemplate.criticality == vendor_criticality,
            AssessmentTemplate.is_base_template == True,
        )
        .first()
    )
    if base:
        qs = (
            db.query(AssessmentTemplateQuestion)
            .filter(AssessmentTemplateQuestion.template_id == base.id)
            .order_by(AssessmentTemplateQuestion.sort_order)
            .all()
        )
        return _template_qs_to_assessment_format(qs)

    # 3. Hardcoded fallback (safety net)
    return get_template_questions(assessment_type, vendor_criticality)


class PublicSubmitPayload(BaseModel):
    answers: dict


def _with_vendor_name(assessment: Assessment, vendor_name: str | None) -> AssessmentRead:
    a = AssessmentRead.model_validate(assessment)
    a.vendor_name = vendor_name
    return a


@router.get("", response_model=PaginatedResponse[AssessmentRead])
def list_assessments(
    vendor_id: int | None = Query(None),
    type: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Assessment)
    if vendor_id is not None:
        q = q.filter(Assessment.vendor_id == vendor_id)
    if type:
        q = q.filter(Assessment.type == type)
    if status:
        q = q.filter(Assessment.status == status)

    total = q.count()
    items = q.order_by(Assessment.created_at.desc()).offset(offset).limit(limit).all()

    vendor_ids = {a.vendor_id for a in items}
    vendor_names = {v.id: v.name for v in db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()}

    return PaginatedResponse(
        items=[_with_vendor_name(a, vendor_names.get(a.vendor_id)) for a in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    vendor = db.get(Vendor, assessment.vendor_id)
    return _with_vendor_name(assessment, vendor.name if vendor else None)


@router.post("", response_model=AssessmentRead, status_code=201)
def create_assessment(payload: AssessmentCreate, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, payload.vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    questions = _resolve_questions(db, payload.type, vendor.criticality)

    assessment = Assessment(
        vendor_id=payload.vendor_id,
        asset_id=payload.asset_id,
        type=payload.type,
        status="Draft",
        due_date=payload.due_date,
        assigned_to=payload.assigned_to,
        questions=questions,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _with_vendor_name(assessment, vendor.name)


@router.put("/{assessment_id}", response_model=AssessmentRead)
def update_assessment(assessment_id: int, payload: AssessmentUpdate, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    vendor = db.get(Vendor, assessment.vendor_id)
    return _with_vendor_name(assessment, vendor.name if vendor else None)


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(assessment)
    db.commit()


@router.post("/{assessment_id}/send", response_model=AssessmentRead)
def send_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    vendor = db.get(Vendor, assessment.vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if not assessment.public_token:
        assessment.public_token = secrets.token_urlsafe(32)[:64]

    assessment.status = "Sent"
    db.commit()
    db.refresh(assessment)

    public_url = f"{settings.frontend_url}/public/assessments/{assessment.public_token}"

    if settings.email_enabled and vendor.primary_contact_email:
        try:
            msg = EmailMessage()
            msg["Subject"] = f"Security Assessment Request – {vendor.name}"
            msg["From"] = settings.email_from
            msg["To"] = vendor.primary_contact_email
            msg.set_content(
                f"Dear {vendor.primary_contact_name or vendor.name},\n\n"
                f"You have been requested to complete a security assessment.\n"
                f"Please use the link below to access and submit the questionnaire:\n\n"
                f"{public_url}\n\n"
                f"Thank you."
            )
            with smtplib.SMTP(settings.email_host, settings.email_port) as smtp:
                if settings.email_user:
                    smtp.login(settings.email_user, settings.email_password)
                smtp.send_message(msg)
        except Exception as exc:
            print(f"Email send failed: {exc}")
    else:
        print(f"[EMAIL DISABLED] Assessment link: {public_url}")

    return _with_vendor_name(assessment, vendor.name)


@router.get("/{assessment_id}/export", response_class=HTMLResponse)
def export_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    vendor = db.get(Vendor, assessment.vendor_id)
    vendor_name = vendor.name if vendor else "Unknown Vendor"

    questions = assessment.questions or []
    answers = assessment.answers or {}

    rows = ""
    for q in questions:
        answer = answers.get(q["id"], "—")
        rows += f"<tr><td class='q'>{q['question']}</td><td class='a'>{answer}</td></tr>"

    completed = assessment.completed_at.strftime("%Y-%m-%d") if assessment.completed_at else "—"
    type_label = assessment.type.replace("_", " ").title()

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Assessment Report – {vendor_name}</title>
<style>
  body{{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:40px}}
  h1{{font-size:18px;margin-bottom:4px}}
  .meta{{color:#555;font-size:11px;margin-bottom:24px}}
  table{{width:100%;border-collapse:collapse}}
  th{{background:#f4f4f4;text-align:left;padding:8px;border:1px solid #ddd;font-size:11px}}
  td{{padding:8px;border:1px solid #ddd;vertical-align:top}}
  td.q{{width:50%;font-weight:500}}
  td.a{{width:50%;color:#333}}
  @media print{{body{{margin:20px}}}}
</style></head>
<body>
<h1>Security Assessment Report</h1>
<div class="meta">
  Vendor: {vendor_name} &nbsp;|&nbsp; Type: {type_label} &nbsp;|&nbsp;
  Status: {assessment.status} &nbsp;|&nbsp; Due: {assessment.due_date or "—"} &nbsp;|&nbsp;
  Completed: {completed}
</div>
<table>
  <thead><tr><th>Question</th><th>Answer</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
</body></html>"""

    return HTMLResponse(content=html)


# --- Public (no-auth) endpoints ---

@public_router.get("/{token}", response_model=AssessmentRead)
def get_public_assessment(token: str, db: Session = Depends(get_db)):
    assessment = db.query(Assessment).filter(Assessment.public_token == token).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    vendor = db.get(Vendor, assessment.vendor_id)
    return _with_vendor_name(assessment, vendor.name if vendor else None)


@public_router.post("/{token}/submit", response_model=AssessmentRead)
def submit_public_assessment(token: str, payload: PublicSubmitPayload, db: Session = Depends(get_db)):
    assessment = db.query(Assessment).filter(Assessment.public_token == token).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.status == "Completed":
        raise HTTPException(status_code=400, detail="Assessment already completed")

    assessment.answers = payload.answers
    assessment.status = "Completed"
    assessment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(assessment)
    vendor = db.get(Vendor, assessment.vendor_id)
    return _with_vendor_name(assessment, vendor.name if vendor else None)
