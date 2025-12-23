from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import RoofPlaneCreate, RoofPlaneOut, ObstructionCreate, ObstructionOut
from app.db.models import Project, RoofPlane, Obstruction
from app.services.geometry import validate_polygon_wkt

router = APIRouter(prefix="/projects/{project_id}", tags=["geometry"])

@router.post("/roof-planes", response_model=RoofPlaneOut)
def create_roof_plane(project_id: int, payload: RoofPlaneCreate, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    validate_polygon_wkt(payload.polygon_wkt)
    item = RoofPlane(project_id=project_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/roof-planes", response_model=list[RoofPlaneOut])
def list_roof_planes(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id).order_by(RoofPlane.id.desc())).scalars().all())

@router.post("/obstructions", response_model=ObstructionOut)
def create_obstruction(project_id: int, payload: ObstructionCreate, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    validate_polygon_wkt(payload.polygon_wkt)
    item = Obstruction(project_id=project_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/obstructions", response_model=list[ObstructionOut])
def list_obstructions(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(Obstruction).where(Obstruction.project_id == project_id).order_by(Obstruction.id.desc())).scalars().all())
