import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssetType(str, enum.Enum):
    Software = "Software"
    SaaS = "SaaS"
    API = "API"
    On_Premise = "On-Premise"
    Hardware = "Hardware"


class DataClassification(str, enum.Enum):
    Public = "Public"
    Internal = "Internal"
    Confidential = "Confidential"
    Restricted = "Restricted"


_type_col = Enum("Software", "SaaS", "API", "On-Premise", "Hardware", name="assettype")
_classification_col = Enum("Public", "Internal", "Confidential", "Restricted", name="dataclassification")


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[str] = mapped_column(_type_col, nullable=False)
    version: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    owner: Mapped[str | None] = mapped_column(String(255))
    license_expiry: Mapped[date | None] = mapped_column(Date)
    data_classification: Mapped[str] = mapped_column(_classification_col, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
