from pydantic import BaseModel, Field
from typing import Any

class ProjectCreate(BaseModel):
    name: str
    address: str | None = None

class ProjectOut(BaseModel):
    id: int
    name: str
    address: str | None
    status: str
    class Config:
        from_attributes = True

class AssetCreate(BaseModel):
    kind: str = Field(..., description="photo|model|drone|doc")
    filename: str
    content_type: str | None = None
    storage_url: str
    metadata: dict[str, Any] = Field(default_factory=dict)

class AssetOut(BaseModel):
    id: int
    project_id: int
    kind: str
    filename: str
    content_type: str | None
    storage_url: str
    metadata: dict[str, Any]
    class Config:
        from_attributes = True

class RoofPlaneCreate(BaseModel):
    name: str | None = None
    tilt_deg: float | None = None
    azimuth_deg: float | None = None
    polygon_wkt: str

class RoofPlaneOut(RoofPlaneCreate):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class ObstructionCreate(BaseModel):
    type: str
    polygon_wkt: str
    height_m: float | None = None

class ObstructionOut(ObstructionCreate):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class LayoutCreate(BaseModel):
    name: str = "Layout v1"
    data: dict[str, Any] = Field(default_factory=dict)

class LayoutOut(LayoutCreate):
    id: int
    project_id: int
    class Config:
        from_attributes = True

class RuleSetCreate(BaseModel):
    jurisdiction: str
    version: str = "v1"
    rules: dict[str, Any] = Field(default_factory=dict)

class RuleSetOut(RuleSetCreate):
    id: int
    class Config:
        from_attributes = True

class AnalysisRequest(BaseModel):
    kind: str = Field(..., description="shading|compliance|roof_risk|electrical")

class AnalysisOut(BaseModel):
    id: int
    project_id: int
    kind: str
    status: str
    result: dict
    class Config:
        from_attributes = True

class ReportRequest(BaseModel):
    include_assets: bool = True
    include_analysis: bool = True

class ReportOut(BaseModel):
    id: int
    project_id: int
    status: str
    storage_url: str | None
    metadata: dict
    class Config:
        from_attributes = True
