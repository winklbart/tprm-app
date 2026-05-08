import csv
import enum
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session


def _to_values(d: dict) -> dict:
    """Replace any enum instances in a dict with their .value string."""
    return {k: v.value if isinstance(v, enum.Enum) else v for k, v in d.items()}

from app.core.database import get_db
from app.models.assessment import Assessment
from app.models.asset import Asset
from app.models.risk import Risk
from app.models.vendor import Vendor, VendorCategory, VendorCriticality, VendorStatus
from app.schemas.asset import AssetRead
from app.schemas.common import PaginatedResponse
from app.schemas.vendor import CSVImportResult, VendorCreate, VendorRead, VendorUpdate

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=PaginatedResponse[VendorRead])
def list_vendors(
    search: str | None = Query(None),
    criticality: VendorCriticality | None = Query(None),
    status: VendorStatus | None = Query(None),
    category: VendorCategory | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Vendor)
    if search:
        q = q.filter(
            or_(
                Vendor.name.ilike(f"%{search}%"),
                Vendor.primary_contact_email.ilike(f"%{search}%"),
                Vendor.country.ilike(f"%{search}%"),
            )
        )
    if criticality:
        q = q.filter(Vendor.criticality == criticality)
    if status:
        q = q.filter(Vendor.status == status)
    if category:
        q = q.filter(Vendor.category == category)

    total = q.count()
    items = q.order_by(Vendor.name).offset(offset).limit(limit).all()
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("", response_model=VendorRead, status_code=201)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    vendor = Vendor(**_to_values(payload.model_dump()))
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=VendorRead)
def update_vendor(vendor_id: int, payload: VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, value in _to_values(payload.model_dump(exclude_unset=True)).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    db.commit()


class AssessmentSummary(BaseModel):
    id: int
    type: str
    status: str
    due_date: str | None = None

    model_config = {"from_attributes": True}


class RiskSummary(BaseModel):
    id: int
    title: str
    category: str
    risk_score: int
    status: str

    model_config = {"from_attributes": True}


class VendorProfile(VendorRead):
    assets: list[AssetRead] = []
    assessments: list[AssessmentSummary] = []
    risks: list[RiskSummary] = []


@router.get("/{vendor_id}/profile", response_model=VendorProfile)
def get_vendor_profile(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    assets = db.query(Asset).filter(Asset.vendor_id == vendor_id).all()
    assessments = db.query(Assessment).filter(Assessment.vendor_id == vendor_id).order_by(Assessment.created_at.desc()).limit(20).all()
    risks = db.query(Risk).filter(Risk.vendor_id == vendor_id).order_by(Risk.risk_score.desc()).all()

    profile = VendorProfile.model_validate(vendor)
    profile.assets = [AssetRead.model_validate(a) for a in assets]
    profile.assessments = [
        AssessmentSummary(
            id=a.id,
            type=a.type,
            status=a.status,
            due_date=str(a.due_date) if a.due_date else None,
        )
        for a in assessments
    ]
    profile.risks = [
        RiskSummary(
            id=r.id,
            title=r.title,
            category=r.category,
            risk_score=r.risk_score,
            status=r.status,
        )
        for r in risks
    ]
    return profile


@router.get("/{vendor_id}/report", response_class=HTMLResponse)
def vendor_report(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    assets = db.query(Asset).filter(Asset.vendor_id == vendor_id).all()
    risks = db.query(Risk).filter(Risk.vendor_id == vendor_id).order_by(Risk.risk_score.desc()).all()
    assessments = db.query(Assessment).filter(Assessment.vendor_id == vendor_id).order_by(Assessment.created_at.desc()).all()

    from datetime import datetime as dt
    now = dt.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    def score_color(s: int) -> str:
        if s >= 20: return "#991b1b"
        if s >= 15: return "#9a3412"
        if s >= 10: return "#854d0e"
        return "#166534"

    assets_rows = "".join(
        f"<tr><td>{a.name}</td><td>{a.type}</td><td>{a.data_classification}</td>"
        f"<td>{a.owner or '—'}</td><td>{a.license_expiry or '—'}</td></tr>"
        for a in assets
    ) or "<tr><td colspan='5' style='color:#64748b;text-align:center'>No assets</td></tr>"

    risks_rows = "".join(
        f"<tr><td>{r.title}</td><td>{r.category}</td>"
        f"<td style='font-weight:600;color:{score_color(r.risk_score)}'>{r.risk_score}</td>"
        f"<td>{r.status}</td></tr>"
        for r in risks
    ) or "<tr><td colspan='4' style='color:#64748b;text-align:center'>No risks</td></tr>"

    assessments_rows = "".join(
        f"<tr><td>{a.type.replace('_',' ').title()}</td><td>{a.status}</td>"
        f"<td>{a.due_date or '—'}</td><td>{a.assigned_to or '—'}</td></tr>"
        for a in assessments
    ) or "<tr><td colspan='4' style='color:#64748b;text-align:center'>No assessments</td></tr>"

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Vendor Report — {vendor.name}</title>
<style>
body{{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;margin:40px}}
h1{{font-size:22px;color:#0f172a;margin-bottom:4px}}
h2{{font-size:15px;color:#334155;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}}
.meta{{color:#64748b;font-size:12px;margin-bottom:24px}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;margin-bottom:16px}}
.label{{font-weight:600;color:#64748b}}
table{{width:100%;border-collapse:collapse;margin-top:8px}}
th{{text-align:left;font-size:12px;color:#64748b;padding:4px 8px;border-bottom:1px solid #e2e8f0}}
td{{padding:4px 8px;border-bottom:1px solid #f1f5f9}}
@media print{{body{{margin:20px}}}}
</style></head><body>
<h1>Vendor Risk Report — {vendor.name}</h1>
<div class="meta">Generated {now}</div>
<h2>Vendor Details</h2>
<div class="grid">
<div><span class="label">Criticality:</span> {vendor.criticality}</div>
<div><span class="label">Status:</span> {vendor.status}</div>
<div><span class="label">Category:</span> {vendor.category}</div>
<div><span class="label">Country:</span> {vendor.country or '—'}</div>
<div><span class="label">Risk Score:</span> {f'{vendor.risk_score:.0f}' if vendor.risk_score else '—'}</div>
<div><span class="label">Contact:</span> {vendor.primary_contact_name or '—'} ({vendor.primary_contact_email or '—'})</div>
</div>
<h2>Assets ({len(assets)})</h2>
<table><thead><tr><th>Name</th><th>Type</th><th>Classification</th><th>Owner</th><th>License Expiry</th></tr></thead>
<tbody>{assets_rows}</tbody></table>
<h2>Risks ({len(risks)})</h2>
<table><thead><tr><th>Title</th><th>Category</th><th>Score</th><th>Status</th></tr></thead>
<tbody>{risks_rows}</tbody></table>
<h2>Assessments ({len(assessments)})</h2>
<table><thead><tr><th>Type</th><th>Status</th><th>Due Date</th><th>Assigned To</th></tr></thead>
<tbody>{assessments_rows}</tbody></table>
<script>window.print();</script>
</body></html>"""
    return HTMLResponse(content=html)


@router.post("/import/csv", response_model=CSVImportResult)
def import_vendors_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required = {"name", "criticality", "category"}
    if reader.fieldnames is None or not required.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {', '.join(required)}",
        )

    imported = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        try:
            vendor = Vendor(
                name=row["name"].strip(),
                criticality=VendorCriticality(row["criticality"].strip()),
                category=VendorCategory(row["category"].strip()),
                status=VendorStatus(row.get("status", VendorStatus.Active.value).strip()),
                country=row.get("country", "").strip() or None,
                website=row.get("website", "").strip() or None,
                primary_contact_name=row.get("primary_contact_name", "").strip() or None,
                primary_contact_email=row.get("primary_contact_email", "").strip() or None,
                notes=row.get("notes", "").strip() or None,
            )
            db.add(vendor)
            imported += 1
        except (ValueError, KeyError) as e:
            errors.append(f"Row {i}: {e}")

    db.commit()
    return CSVImportResult(imported=imported, errors=errors)
