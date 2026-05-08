from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SecurityScanResult(Base):
    __tablename__ = "security_scan_results"
    __table_args__ = (UniqueConstraint("asset_id", "source", name="uq_scan_asset_source"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)   # nvd | cisa_kev | epss | osv | hibp | ai
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending | running | completed | failed
    results: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AssetVulnerability(Base):
    __tablename__ = "asset_vulnerabilities"
    __table_args__ = (UniqueConstraint("asset_id", "cve_id", name="uq_vuln_asset_cve"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cvss_score: Mapped[float | None] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="Informational")
    epss_score: Mapped[float | None] = mapped_column(Float)
    in_cisa_kev: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_date: Mapped[str | None] = mapped_column(String(20))
    url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
