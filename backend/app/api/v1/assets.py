import enum

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session


def _to_values(d: dict) -> dict:
    return {k: v.value if isinstance(v, enum.Enum) else v for k, v in d.items()}

from app.core.database import get_db
from app.models.asset import Asset, AssetType, DataClassification
from app.models.vendor import Vendor
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=PaginatedResponse[AssetRead])
def list_assets(
    vendor_id: int | None = Query(None),
    type: AssetType | None = Query(None),
    data_classification: DataClassification | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Asset)
    if vendor_id is not None:
        q = q.filter(Asset.vendor_id == vendor_id)
    if type:
        q = q.filter(Asset.type == type)
    if data_classification:
        q = q.filter(Asset.data_classification == data_classification)
    if search:
        q = q.filter(Asset.name.ilike(f"%{search}%"))

    total = q.count()
    items = q.order_by(Asset.name).offset(offset).limit(limit).all()
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("", response_model=AssetRead, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    if not db.get(Vendor, payload.vendor_id):
        raise HTTPException(status_code=404, detail="Vendor not found")
    asset = Asset(**_to_values(payload.model_dump()))
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/{asset_id}", response_model=AssetRead)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, value in _to_values(payload.model_dump(exclude_unset=True)).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
