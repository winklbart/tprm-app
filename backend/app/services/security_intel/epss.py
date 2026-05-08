"""EPSS (Exploit Prediction Scoring System) enrichment service."""
from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.security import AssetVulnerability
from app.models.vendor import Vendor

_EPSS_URL = "https://api.first.org/data/v1/epss"


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    asset_vulns = db.query(AssetVulnerability).filter(AssetVulnerability.asset_id == asset.id).all()
    if not asset_vulns:
        return {"enriched": 0, "scores": []}

    cve_ids = [av.cve_id for av in asset_vulns]
    cve_param = ",".join(cve_ids[:50])  # API limit

    try:
        resp = httpx.get(_EPSS_URL, params={"cve": cve_param}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return {"error": str(exc), "enriched": 0}

    epss_by_cve: dict[str, float] = {}
    for entry in data.get("data", []):
        cve = entry.get("cve", "")
        score = entry.get("epss")
        if cve and score is not None:
            try:
                epss_by_cve[cve] = float(score)
            except (ValueError, TypeError):
                pass

    scores = []
    for av in asset_vulns:
        if av.cve_id in epss_by_cve:
            av.epss_score = epss_by_cve[av.cve_id]
            scores.append({"cve_id": av.cve_id, "epss_score": av.epss_score})

    db.commit()
    return {"enriched": len(scores), "scores": scores}
