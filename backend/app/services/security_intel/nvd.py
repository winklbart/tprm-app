"""NVD / NIST CVE scan service."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.asset import Asset
from app.models.security import AssetVulnerability
from app.models.vendor import Vendor


def _extract_cvss(cve) -> tuple[float | None, str]:
    metrics = getattr(cve, "metrics", None)
    if not metrics:
        return None, "Informational"

    score: float | None = None
    severity_str: str | None = None

    for attr in ("cvssMetricV31", "cvssMetricV30"):
        items = getattr(metrics, attr, None)
        if items:
            data = getattr(items[0], "cvssData", None)
            if data:
                score = getattr(data, "baseScore", None)
                severity_str = getattr(data, "baseSeverity", None)
            break

    if score is None:
        v2 = getattr(metrics, "cvssMetricV2", None)
        if v2:
            data = getattr(v2[0], "cvssData", None)
            if data:
                score = getattr(data, "baseScore", None)
            severity_str = getattr(v2[0], "baseSeverity", None)

    if severity_str:
        sev = str(severity_str).capitalize()
        if sev in ("Critical", "High", "Medium", "Low"):
            return score, sev

    if score is not None:
        if score >= 9.0:
            return score, "Critical"
        if score >= 7.0:
            return score, "High"
        if score >= 4.0:
            return score, "Medium"
        return score, "Low"

    return None, "Informational"


def _get_description(cve) -> str:
    for desc in getattr(cve, "descriptions", []):
        if getattr(desc, "lang", "") == "en":
            return getattr(desc, "value", "")
    descs = getattr(cve, "descriptions", [])
    return getattr(descs[0], "value", "") if descs else ""


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    try:
        import nvdlib
    except ImportError:
        return {"error": "nvdlib not installed", "cves": []}

    search_term = asset.name
    if asset.version:
        search_term += f" {asset.version}"

    api_key = settings.nvd_api_key or None

    try:
        kwargs: dict = {"keywordSearch": search_term, "limit": 20}
        if api_key:
            kwargs["key"] = api_key
        cves = nvdlib.searchCVE(**kwargs)
    except Exception as exc:
        return {"error": str(exc), "cves": []}

    results = []
    for cve in cves:
        score, severity = _extract_cvss(cve)
        description = _get_description(cve)
        cve_id = getattr(cve, "id", "")
        published = str(getattr(cve, "published", ""))[:10]
        url = f"https://nvd.nist.gov/vuln/detail/{cve_id}"

        vuln = AssetVulnerability(
            asset_id=asset.id,
            cve_id=cve_id,
            description=description[:1000] if description else None,
            cvss_score=score,
            severity=severity,
            published_date=published or None,
            url=url,
        )
        try:
            db.add(vuln)
            db.flush()
        except Exception:
            db.rollback()

        results.append({
            "cve_id": cve_id,
            "description": description[:200] if description else "",
            "cvss_score": score,
            "severity": severity,
            "published_date": published,
            "url": url,
        })

    db.commit()
    return {"cves": results, "total": len(results)}
