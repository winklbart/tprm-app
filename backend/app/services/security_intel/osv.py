"""OSV (Open Source Vulnerabilities) database service."""
from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.vendor import Vendor

_OSV_URL = "https://api.osv.dev/v1/query"
_ECOSYSTEMS = ["PyPI", "npm", "Maven", "Go", "RubyGems"]


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    all_vulns: list[dict] = []
    seen_ids: set[str] = set()

    for ecosystem in _ECOSYSTEMS[:3]:  # Try top 3 ecosystems
        body: dict = {"package": {"name": asset.name, "ecosystem": ecosystem}}
        if asset.version:
            body["version"] = asset.version

        try:
            resp = httpx.post(_OSV_URL, json=body, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                for vuln in data.get("vulns", []):
                    vuln_id = vuln.get("id", "")
                    if vuln_id in seen_ids:
                        continue
                    seen_ids.add(vuln_id)

                    aliases = vuln.get("aliases", [])
                    cve_alias = next((a for a in aliases if a.startswith("CVE-")), None)
                    severity = _extract_severity(vuln)

                    all_vulns.append({
                        "id": vuln_id,
                        "summary": vuln.get("summary", "")[:200],
                        "cve_alias": cve_alias,
                        "severity": severity,
                        "ecosystem": ecosystem,
                        "published": str(vuln.get("published", ""))[:10],
                    })
        except Exception:
            continue

    return {"vulns": all_vulns, "total": len(all_vulns)}


def _extract_severity(vuln: dict) -> str:
    for sev in vuln.get("severity", []):
        score_str = sev.get("score", "")
        try:
            score = float(score_str)
            if score >= 9.0:
                return "Critical"
            if score >= 7.0:
                return "High"
            if score >= 4.0:
                return "Medium"
            return "Low"
        except (ValueError, TypeError):
            pass
    return "Unknown"
