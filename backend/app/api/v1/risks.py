import enum

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.risk import Risk, RiskCategory, RiskStatus
from app.models.vendor import Vendor
from app.schemas.common import PaginatedResponse
from app.schemas.risk import RiskCreate, RiskRead, RiskUpdate

router = APIRouter(prefix="/risks", tags=["risks"])


def _to_values(d: dict) -> dict:
    return {k: v.value if isinstance(v, enum.Enum) else v for k, v in d.items()}


def _with_vendor_name(risk: Risk, vendor_name: str | None) -> RiskRead:
    r = RiskRead.model_validate(risk)
    r.vendor_name = vendor_name
    return r


@router.get("", response_model=PaginatedResponse[RiskRead])
def list_risks(
    vendor_id: int | None = Query(None),
    asset_id: int | None = Query(None),
    status: RiskStatus | None = Query(None),
    category: RiskCategory | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Risk)
    if vendor_id is not None:
        q = q.filter(Risk.vendor_id == vendor_id)
    if asset_id is not None:
        q = q.filter(Risk.asset_id == asset_id)
    if status:
        q = q.filter(Risk.status == status)
    if category:
        q = q.filter(Risk.category == category)

    total = q.count()
    items = q.order_by(Risk.risk_score.desc()).offset(offset).limit(limit).all()

    vendor_ids = {r.vendor_id for r in items}
    vendor_names = {v.id: v.name for v in db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()}

    return PaginatedResponse(
        items=[_with_vendor_name(r, vendor_names.get(r.vendor_id)) for r in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{risk_id}", response_model=RiskRead)
def get_risk(risk_id: int, db: Session = Depends(get_db)):
    risk = db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    vendor = db.get(Vendor, risk.vendor_id)
    return _with_vendor_name(risk, vendor.name if vendor else None)


@router.post("", response_model=RiskRead, status_code=201)
def create_risk(payload: RiskCreate, db: Session = Depends(get_db)):
    data = _to_values(payload.model_dump())
    data["risk_score"] = payload.likelihood * payload.impact
    risk = Risk(**data)
    db.add(risk)
    db.commit()
    db.refresh(risk)
    vendor = db.get(Vendor, risk.vendor_id)
    return _with_vendor_name(risk, vendor.name if vendor else None)


@router.put("/{risk_id}", response_model=RiskRead)
def update_risk(risk_id: int, payload: RiskUpdate, db: Session = Depends(get_db)):
    risk = db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    updates = _to_values(payload.model_dump(exclude_unset=True))
    for field, value in updates.items():
        setattr(risk, field, value)
    if "likelihood" in updates or "impact" in updates:
        risk.risk_score = risk.likelihood * risk.impact
    db.commit()
    db.refresh(risk)
    vendor = db.get(Vendor, risk.vendor_id)
    return _with_vendor_name(risk, vendor.name if vendor else None)


@router.delete("/{risk_id}", status_code=204)
def delete_risk(risk_id: int, db: Session = Depends(get_db)):
    risk = db.get(Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    db.delete(risk)
    db.commit()
