from pydantic import BaseModel, Field, ConfigDict
from typing import Any
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    address: str | None = None

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    name: str
    address: str | None
    status: str
    created_at: datetime

class AssetCreate(BaseModel):
    kind: str = Field(..., description="photo|drone_model|document")
    filename: str
    content_type: str | None = None
    storage_url: str
    meta: dict[str, Any] = Field(default_factory=dict)

class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    kind: str
    filename: str
    content_type: str | None
    storage_url: str
    meta: dict[str, Any]
    created_at: datetime

class RoofPlaneCreate(BaseModel):
    name: str | None = None
    tilt_deg: float | None = None
    azimuth_deg: float | None = None
    polygon_wkt: str

class RoofPlaneOut(RoofPlaneCreate):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    created_at: datetime

class ObstructionCreate(BaseModel):
    type: str
    polygon_wkt: str
    height_m: float | None = None

class ObstructionOut(ObstructionCreate):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    created_at: datetime

class LayoutCreate(BaseModel):
    name: str = "Layout v1"
    data: dict[str, Any] = Field(default_factory=dict)

class LayoutOut(LayoutCreate):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    created_at: datetime

class RuleSetCreate(BaseModel):
    jurisdiction: str
    version: str = "v1"
    rules: dict[str, Any] = Field(default_factory=dict)

class RuleSetOut(RuleSetCreate):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    created_at: datetime

class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    kind: str
    status: str
    result: dict[str, Any]
    created_at: datetime
    updated_at: datetime

class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    project_id: int
    status: str
    storage_url: str | None
    meta: dict[str, Any]
    created_at: datetime
    updated_at: datetime
