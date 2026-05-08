"""Orchestrates all security intelligence scans for an asset."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.asset import Asset
from app.models.security import AssetVulnerability, SecurityScanResult
from app.models.vendor import Vendor
from app.services.security_intel import ai_check, cisa_kev, epss, hibp, nvd, osv

SOURCES = ["nvd", "cisa_kev", "epss", "osv", "hibp", "ai"]


def create_pending_results(db: Session, asset_id: int) -> None:
    """Upsert scan result records to pending state for all sources."""
    for source in SOURCES:
        existing = (
            db.query(SecurityScanResult)
            .filter(SecurityScanResult.asset_id == asset_id, SecurityScanResult.source == source)
            .first()
        )
        if existing:
            existing.status = "pending"
            existing.results = None
            existing.error = None
            existing.scanned_at = None
        else:
            db.add(SecurityScanResult(asset_id=asset_id, source=source, status="pending"))
    db.commit()


def _run_one(db: Session, asset: Asset, vendor: Vendor | None, source: str, fn) -> None:
    record = (
        db.query(SecurityScanResult)
        .filter(SecurityScanResult.asset_id == asset.id, SecurityScanResult.source == source)
        .first()
    )
    if not record:
        return

    record.status = "running"
    db.commit()

    try:
        data = fn(db, asset, vendor)
        record.status = "completed"
        record.results = data
    except Exception as exc:
        record.status = "failed"
        record.error = str(exc)[:500]

    record.scanned_at = datetime.utcnow()
    db.commit()


def run_full_scan(asset_id: int) -> None:
    """Background task entry point. Creates its own DB session."""
    db: Session = SessionLocal()
    try:
        asset = db.get(Asset, asset_id)
        if not asset:
            return

        vendor = db.get(Vendor, asset.vendor_id)

        # Clear old vulnerabilities so re-scan starts fresh
        db.query(AssetVulnerability).filter(AssetVulnerability.asset_id == asset_id).delete()
        db.commit()

        _run_one(db, asset, vendor, "nvd", nvd.run)
        _run_one(db, asset, vendor, "cisa_kev", cisa_kev.run)
        _run_one(db, asset, vendor, "epss", epss.run)
        _run_one(db, asset, vendor, "osv", osv.run)
        _run_one(db, asset, vendor, "hibp", hibp.run)
        _run_one(db, asset, vendor, "ai", ai_check.run)
    finally:
        db.close()
