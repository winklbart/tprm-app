"""Claude AI security analysis service."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.asset import Asset
from app.models.risk import Risk
from app.models.security import AssetVulnerability, SecurityScanResult
from app.models.vendor import Vendor


def _build_prompt(asset: Asset, vendor: Vendor | None, scan_results: list[SecurityScanResult], vulns: list[AssetVulnerability]) -> str:
    vendor_info = "Unknown"
    if vendor:
        vendor_info = f"{vendor.name} ({vendor.category}, {vendor.criticality} criticality, {vendor.country or 'country unknown'})"

    cve_lines = []
    for v in vulns[:20]:
        kev_flag = " ⚠️ CISA KEV" if v.in_cisa_kev else ""
        epss_str = f" EPSS:{v.epss_score:.0%}" if v.epss_score is not None else ""
        cve_lines.append(f"  - {v.cve_id} [{v.severity}] CVSS:{v.cvss_score or '?'}{epss_str}{kev_flag}: {(v.description or '')[:120]}")

    source_summaries = []
    for r in scan_results:
        if r.status != "completed" or not r.results or r.source == "ai":
            continue
        res = r.results
        if r.source == "nvd":
            source_summaries.append(f"NVD: {res.get('total', 0)} CVEs (see list above)")
        elif r.source == "cisa_kev":
            source_summaries.append(f"CISA KEV: {res.get('total', 0)} match(es)")
        elif r.source == "epss":
            source_summaries.append(f"EPSS: {res.get('enriched', 0)} CVEs enriched with exploit probability")
        elif r.source == "osv":
            source_summaries.append(f"OSV: {res.get('total', 0)} open-source vulnerability record(s)")
        elif r.source == "hibp":
            if res.get("skipped"):
                source_summaries.append(f"HIBP: skipped ({res.get('reason', '')})")
            else:
                source_summaries.append(f"HIBP: {res.get('total', 0)} domain breach(es) for {res.get('domain', '?')}")

    prompt = f"""You are a cybersecurity expert performing a third-party risk assessment.

Vendor: {vendor_info}
Asset: {asset.name} v{asset.version or 'unknown'} | Type: {asset.type} | Classification: {asset.data_classification}

Security scan results:
{chr(10).join(source_summaries) or "No scan data available."}

CVE details ({len(vulns)} total, showing up to 20):
{chr(10).join(cve_lines) or "  None found."}

Return ONLY valid JSON — no markdown, no explanation:
{{
  "risk_score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "findings": [
    {{"severity": "Critical|High|Medium|Low", "title": "<short title>", "description": "<detail>", "recommendation": "<action>"}}
  ],
  "suggested_risks": [
    {{"category": "Data Privacy|Operational|Financial|Compliance|Reputational", "title": "<risk title>", "likelihood": <1-5>, "impact": <1-5>}}
  ]
}}"""
    return prompt


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    if not settings.anthropic_api_key:
        return {"error": "ANTHROPIC_API_KEY not configured", "risk_score": None}

    scan_results = db.query(SecurityScanResult).filter(SecurityScanResult.asset_id == asset.id).all()
    vulns = db.query(AssetVulnerability).filter(AssetVulnerability.asset_id == asset.id).all()

    prompt = _build_prompt(asset, vendor, scan_results, vulns)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {"error": f"Claude returned non-JSON: {exc}", "raw": raw[:500] if "raw" in dir() else ""}
    except Exception as exc:
        return {"error": str(exc)}

    # Auto-create suggested risks
    for risk_data in result.get("suggested_risks", []):
        title = risk_data.get("title", "")
        if not title:
            continue
        existing = db.query(Risk).filter(Risk.vendor_id == asset.vendor_id, Risk.title == title).first()
        if not existing:
            likelihood = max(1, min(5, int(risk_data.get("likelihood", 3))))
            impact = max(1, min(5, int(risk_data.get("impact", 3))))
            category = risk_data.get("category", "Operational")
            if category not in ("Data Privacy", "Operational", "Financial", "Compliance", "Reputational"):
                category = "Operational"
            db.add(Risk(
                vendor_id=asset.vendor_id,
                asset_id=asset.id,
                title=title,
                description="Auto-generated from AI security analysis.",
                category=category,
                likelihood=likelihood,
                impact=impact,
                risk_score=likelihood * impact,
                status="Open",
            ))
    db.commit()

    return result
