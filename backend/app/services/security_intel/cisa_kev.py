"""CISA Known Exploited Vulnerabilities (KEV) service."""
from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.security import AssetVulnerability
from app.models.vendor import Vendor

_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    try:
        resp = httpx.get(_KEV_URL, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return {"error": str(exc), "matches": []}

    vulns = data.get("vulnerabilities", [])
    kev_cve_ids: set[str] = {v.get("cveID", "") for v in vulns}

    # Cross-reference with already-stored vulnerabilities for this asset
    asset_vulns = db.query(AssetVulnerability).filter(AssetVulnerability.asset_id == asset.id).all()
    kev_matches: list[dict] = []

    for av in asset_vulns:
        if av.cve_id in kev_cve_ids:
            av.in_cisa_kev = True
            kev_entry = next((v for v in vulns if v.get("cveID") == av.cve_id), {})
            kev_matches.append({
                "cve_id": av.cve_id,
                "product": kev_entry.get("product", ""),
                "vendor_project": kev_entry.get("vendorProject", ""),
                "vulnerability_name": kev_entry.get("vulnerabilityName", ""),
                "date_added": kev_entry.get("dateAdded", ""),
                "required_action": kev_entry.get("requiredAction", ""),
            })

    # Also check if any KEV entry matches the asset name (direct product search)
    asset_name_lower = asset.name.lower()
    direct_matches: list[dict] = []
    for v in vulns:
        product = v.get("product", "").lower()
        if asset_name_lower in product or product in asset_name_lower:
            cve_id = v.get("cveID", "")
            if cve_id not in {m["cve_id"] for m in kev_matches}:
                direct_matches.append({
                    "cve_id": cve_id,
                    "product": v.get("product", ""),
                    "vendor_project": v.get("vendorProject", ""),
                    "vulnerability_name": v.get("vulnerabilityName", ""),
                    "date_added": v.get("dateAdded", ""),
                    "required_action": v.get("requiredAction", ""),
                })

    db.commit()
    all_matches = kev_matches + direct_matches
    return {
        "kev_total": len(vulns),
        "matches": all_matches,
        "total": len(all_matches),
    }
