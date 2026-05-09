from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.assessment_template import AssessmentTemplate, AssessmentTemplateQuestion
from app.schemas.assessment_template import (
    AssessmentTemplateCreate,
    AssessmentTemplateDetail,
    AssessmentTemplateRead,
    AssessmentTemplateUpdate,
    TemplateQuestionCreate,
    TemplateQuestionRead,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/assessment-templates", tags=["assessment-templates"])

VALID_CRITICALITIES = {"Low", "Medium", "High", "Critical"}
VALID_QUESTION_TYPES = {"yes_no", "text", "multiple_choice", "file_upload", "rating"}
VALID_ASSESSMENT_TYPES = {"self_assessment", "trust_center", "access_to_information", "ai_check"}


def _enforce_single_active(
    db: Session, template_id: int, criticality: str | None, template_type: str
) -> None:
    """When activating a template, deactivate all other active templates with the same
    (criticality, type) pair. No-op for templates without a criticality assignment."""
    if not criticality:
        return
    db.query(AssessmentTemplate).filter(
        AssessmentTemplate.type == template_type,
        AssessmentTemplate.criticality == criticality,
        AssessmentTemplate.id != template_id,
        AssessmentTemplate.is_active == True,
    ).update({"is_active": False}, synchronize_session=False)


def _build_read(tmpl: AssessmentTemplate, question_count: int) -> AssessmentTemplateRead:
    r = AssessmentTemplateRead.model_validate(tmpl)
    r.question_count = question_count
    return r


def _build_detail(tmpl: AssessmentTemplate, questions: list[AssessmentTemplateQuestion]) -> AssessmentTemplateDetail:
    d = AssessmentTemplateDetail.model_validate(tmpl)
    d.question_count = len(questions)
    d.questions = [TemplateQuestionRead.model_validate(q) for q in questions]
    return d


@router.get("", response_model=PaginatedResponse[AssessmentTemplateRead])
def list_templates(
    type: str | None = Query(None),
    criticality: str | None = Query(None),
    is_base_template: bool | None = Query(None),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(AssessmentTemplate)
    if type:
        q = q.filter(AssessmentTemplate.type == type)
    if criticality:
        q = q.filter(AssessmentTemplate.criticality == criticality)
    if is_base_template is not None:
        q = q.filter(AssessmentTemplate.is_base_template == is_base_template)
    if is_active is not None:
        q = q.filter(AssessmentTemplate.is_active == is_active)
    if search:
        q = q.filter(AssessmentTemplate.name.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(AssessmentTemplate.is_base_template.desc(), AssessmentTemplate.created_at.desc()).offset(offset).limit(limit).all()

    counts = {
        tmpl.id: db.query(AssessmentTemplateQuestion).filter(
            AssessmentTemplateQuestion.template_id == tmpl.id
        ).count()
        for tmpl in items
    }

    return PaginatedResponse(
        items=[_build_read(t, counts.get(t.id, 0)) for t in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{template_id}", response_model=AssessmentTemplateDetail)
def get_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.get(AssessmentTemplate, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == template_id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    return _build_detail(tmpl, questions)


@router.post("", response_model=AssessmentTemplateDetail, status_code=201)
def create_template(payload: AssessmentTemplateCreate, db: Session = Depends(get_db)):
    if payload.criticality and payload.criticality not in VALID_CRITICALITIES:
        raise HTTPException(status_code=422, detail=f"Invalid criticality: {payload.criticality}")
    if payload.type not in VALID_ASSESSMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid type: {payload.type}")
    for q in payload.questions:
        if q.type not in VALID_QUESTION_TYPES:
            raise HTTPException(status_code=422, detail=f"Invalid question type: {q.type}")

    tmpl = AssessmentTemplate(
        name=payload.name,
        description=payload.description,
        criticality=payload.criticality,
        type=payload.type,
        is_base_template=False,
        version=1,
        is_active=True,
    )
    db.add(tmpl)
    db.flush()

    # New templates are always created active — deactivate siblings for same (criticality, type)
    _enforce_single_active(db, tmpl.id, payload.criticality, payload.type)

    for i, q in enumerate(payload.questions):
        db.add(AssessmentTemplateQuestion(
            template_id=tmpl.id,
            sort_order=q.sort_order if q.sort_order else i + 1,
            title=q.title,
            description=q.description,
            type=q.type,
            options=q.options,
            required=q.required,
        ))

    db.commit()
    db.refresh(tmpl)
    questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == tmpl.id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    return _build_detail(tmpl, questions)


@router.put("/{template_id}", response_model=AssessmentTemplateDetail)
def update_template(template_id: int, payload: AssessmentTemplateUpdate, db: Session = Depends(get_db)):
    tmpl = db.get(AssessmentTemplate, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.criticality and payload.criticality not in VALID_CRITICALITIES:
        raise HTTPException(status_code=422, detail=f"Invalid criticality: {payload.criticality}")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(tmpl, field, value)

    # If activating this template, deactivate all other templates with same (criticality, type)
    if updates.get("is_active") is True:
        effective_criticality = updates.get("criticality") or tmpl.criticality
        _enforce_single_active(db, tmpl.id, effective_criticality, tmpl.type)

    db.commit()
    db.refresh(tmpl)
    questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == template_id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    return _build_detail(tmpl, questions)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.get(AssessmentTemplate, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if tmpl.is_base_template:
        raise HTTPException(status_code=409, detail="Base templates cannot be deleted")
    tmpl.is_active = False
    db.commit()


@router.post("/{template_id}/duplicate", response_model=AssessmentTemplateDetail, status_code=201)
def duplicate_template(template_id: int, db: Session = Depends(get_db)):
    source = db.get(AssessmentTemplate, template_id)
    if not source:
        raise HTTPException(status_code=404, detail="Template not found")

    copy = AssessmentTemplate(
        name=f"{source.name} (Copy)",
        description=source.description,
        criticality=source.criticality,
        type=source.type,
        is_base_template=False,
        version=1,
        is_active=True,
    )
    db.add(copy)
    db.flush()

    # Duplicate starts active — deactivate siblings for same (criticality, type)
    _enforce_single_active(db, copy.id, source.criticality, source.type)

    source_questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == template_id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    for q in source_questions:
        db.add(AssessmentTemplateQuestion(
            template_id=copy.id,
            sort_order=q.sort_order,
            title=q.title,
            description=q.description,
            type=q.type,
            options=q.options,
            required=q.required,
        ))

    db.commit()
    db.refresh(copy)
    new_questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == copy.id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    return _build_detail(copy, new_questions)


@router.put("/{template_id}/questions", response_model=AssessmentTemplateDetail)
def replace_questions(template_id: int, payload: list[TemplateQuestionCreate], db: Session = Depends(get_db)):
    tmpl = db.get(AssessmentTemplate, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for q in payload:
        if q.type not in VALID_QUESTION_TYPES:
            raise HTTPException(status_code=422, detail=f"Invalid question type: {q.type}")

    db.query(AssessmentTemplateQuestion).filter(
        AssessmentTemplateQuestion.template_id == template_id
    ).delete()

    for i, q in enumerate(payload):
        db.add(AssessmentTemplateQuestion(
            template_id=template_id,
            sort_order=q.sort_order if q.sort_order else i + 1,
            title=q.title,
            description=q.description,
            type=q.type,
            options=q.options,
            required=q.required,
        ))

    db.commit()
    db.refresh(tmpl)
    questions = (
        db.query(AssessmentTemplateQuestion)
        .filter(AssessmentTemplateQuestion.template_id == template_id)
        .order_by(AssessmentTemplateQuestion.sort_order)
        .all()
    )
    return _build_detail(tmpl, questions)
