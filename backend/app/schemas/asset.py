from datetime import date, datetime

from pydantic import BaseModel

from app.models.asset import AssetType, DataClassification


class AssetBase(BaseModel):
    vendor_id: int
    name: str
    type: AssetType
    version: str | None = None
    description: str | None = None
    owner: str | None = None
    license_expiry: date | None = None
    data_classification: DataClassification


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = None
    type: AssetType | None = None
    version: str | None = None
    description: str | None = None
    owner: str | None = None
    license_expiry: date | None = None
    data_classification: DataClassification | None = None


class AssetRead(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
