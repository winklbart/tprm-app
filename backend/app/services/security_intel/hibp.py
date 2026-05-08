"""HaveIBeenPwned domain breach check service."""
from __future__ import annotations

from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.asset import Asset
from app.models.vendor import Vendor


def _extract_domain(website: str) -> str | None:
    try:
        parsed = urlparse(website)
        netloc = parsed.netloc or parsed.path
        return netloc.lstrip("www.").split(":")[0] or None
    except Exception:
        return None


def run(db: Session, asset: Asset, vendor: Vendor | None) -> dict:
    api_key = settings.hibp_api_key
    if not api_key:
        return {"skipped": True, "reason": "HIBP_API_KEY not configured"}

    website = vendor.website if vendor else None
    if not website:
        return {"skipped": True, "reason": "Vendor has no website configured"}

    domain = _extract_domain(website)
    if not domain:
        return {"skipped": True, "reason": f"Could not parse domain from: {website}"}

    try:
        resp = httpx.get(
            f"https://haveibeenpwned.com/api/v3/breacheddomain/{domain}",
            headers={"hibp-api-key": api_key, "user-agent": "TPRMHub"},
            timeout=30,
        )
    except Exception as exc:
        return {"error": str(exc), "domain": domain, "breaches": []}

    if resp.status_code == 404:
        return {"domain": domain, "breaches": [], "total": 0}

    if resp.status_code == 401:
        return {"error": "Invalid HIBP API key", "domain": domain, "breaches": []}

    if not resp.is_success:
        return {"error": f"HIBP API error {resp.status_code}", "domain": domain, "breaches": []}

    data = resp.json()
    # data is a dict: { "BreachName": ["email1", "email2"], ... }
    breaches = []
    for breach_name, emails in (data.items() if isinstance(data, dict) else []):
        count = len(emails) if isinstance(emails, list) else 1
        breaches.append({"name": breach_name, "email_count": count})

    return {"domain": domain, "breaches": breaches, "total": len(breaches)}
