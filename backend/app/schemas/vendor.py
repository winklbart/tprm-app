from datetime import datetime

from pydantic import BaseModel

from app.models.vendor import VendorCategory, VendorCriticality, VendorStatus


class VendorBase(BaseModel):
    name: str
    criticality: VendorCriticality
    status: VendorStatus = VendorStatus.Active  # type: ignore[assignment]
    category: VendorCategory
    country: str | None = None
    website: str | None = None
    primary_contact_name: str | None = None
    primary_contact_email: str | None = None
    notes: str | None = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: str | None = None
    criticality: VendorCriticality | None = None
    status: VendorStatus | None = None
    category: VendorCategory | None = None
    country: str | None = None
    website: str | None = None
    primary_contact_name: str | None = None
    primary_contact_email: str | None = None
    notes: str | None = None


class VendorRead(VendorBase):
    id: int
    risk_score: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CSVImportResult(BaseModel):
    imported: int
    errors: list[str]
