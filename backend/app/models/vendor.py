import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class VendorCriticality(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class VendorStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"
    Under_Review = "Under Review"
    Offboarded = "Offboarded"


class VendorCategory(str, enum.Enum):
    Cloud_Provider = "Cloud Provider"
    Software_Vendor = "Software Vendor"
    Consultant = "Consultant"
    Hardware = "Hardware"
    Other = "Other"


_criticality_type = Enum("Low", "Medium", "High", "Critical", name="vendorcriticality")
_status_type = Enum("Active", "Inactive", "Under Review", "Offboarded", name="vendorstatus")
_category_type = Enum("Cloud Provider", "Software Vendor", "Consultant", "Hardware", "Other", name="vendorcategory")


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    criticality: Mapped[str] = mapped_column(_criticality_type, nullable=False)
    status: Mapped[str] = mapped_column(_status_type, nullable=False, default="Active")
    category: Mapped[str] = mapped_column(_category_type, nullable=False)
    country: Mapped[str | None] = mapped_column(String(100))
    website: Mapped[str | None] = mapped_column(String(500))
    primary_contact_name: Mapped[str | None] = mapped_column(String(255))
    primary_contact_email: Mapped[str | None] = mapped_column(String(255))
    risk_score: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
