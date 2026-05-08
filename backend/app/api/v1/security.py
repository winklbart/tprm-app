from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import Asset
from app.models.security import AssetVulnerability, SecurityScanResult
from app.schemas.security import ScanResultRead, VulnerabilityRead
from app.services.security_intel.orchestrator import (
    SOURCES,
    create_pending_results,
    run_full_scan,
)
from app.services.security_intel import nvd as nvd_service

router = APIRouter(tags=["security"])


@router.post("/assets/{asset_id}/security-scan", status_code=202)
async def trigger_security_scan(
    asset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    create_pending_results(db, asset_id)

    async def _bg():
        await run_in_threadpool(run_full_scan, asset_id)

    background_tasks.add_task(_bg)
    return {"message": "Security scan started", "asset_id": asset_id, "sources": SOURCES}


@router.get("/assets/{asset_id}/security-scan/status", response_model=list[ScanResultRead])
def get_scan_status(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return (
        db.query(SecurityScanResult)
        .filter(SecurityScanResult.asset_id == asset_id)
        .all()
    )


@router.get("/assets/{asset_id}/vulnerabilities", response_model=list[VulnerabilityRead])
def get_vulnerabilities(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return (
        db.query(AssetVulnerability)
        .filter(AssetVulnerability.asset_id == asset_id)
        .order_by(AssetVulnerability.cvss_score.desc().nullslast())
        .all()
    )


@router.post("/assets/{asset_id}/nvd-scan", status_code=202)
async def trigger_nvd_scan(
    asset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Upsert NVD-only pending record
    from app.services.security_intel.orchestrator import create_pending_results
    from app.models.security import SecurityScanResult

    existing = (
        db.query(SecurityScanResult)
        .filter(SecurityScanResult.asset_id == asset_id, SecurityScanResult.source == "nvd")
        .first()
    )
    if existing:
        existing.status = "pending"
        existing.results = None
        existing.error = None
        existing.scanned_at = None
        db.commit()
    else:
        db.add(SecurityScanResult(asset_id=asset_id, source="nvd", status="pending"))
        db.commit()

    from app.core.database import SessionLocal
    from app.models.security import AssetVulnerability as AV
    from app.services.security_intel.orchestrator import _run_one
    from datetime import datetime

    async def _bg():
        def _do():
            _db = SessionLocal()
            try:
                _asset = _db.get(Asset, asset_id)
                _vendor = _db.get(type(_asset).__table__.c, _asset.vendor_id) if _asset else None
                from app.models.vendor import Vendor as V
                _vendor = _db.get(V, _asset.vendor_id) if _asset else None
                _db.query(AV).filter(AV.asset_id == asset_id).delete()
                _db.commit()
                _run_one(_db, _asset, _vendor, "nvd", nvd_service.run)
            finally:
                _db.close()
        await run_in_threadpool(_do)

    background_tasks.add_task(_bg)
    return {"message": "NVD scan started", "asset_id": asset_id}
