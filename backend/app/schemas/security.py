from datetime import datetime

from pydantic import BaseModel


class ScanResultRead(BaseModel):
    id: int
    asset_id: int
    source: str
    status: str
    results: dict | None = None
    error: str | None = None
    scanned_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VulnerabilityRead(BaseModel):
    id: int
    asset_id: int
    cve_id: str
    description: str | None = None
    cvss_score: float | None = None
    severity: str
    epss_score: float | None = None
    in_cisa_kev: bool
    published_date: str | None = None
    url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
