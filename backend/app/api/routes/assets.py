from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import AssetCreate, AssetOut
from app.db.models import Asset, Project

router = APIRouter(prefix="/projects/{project_id}/assets", tags=["assets"])

@router.post("", response_model=AssetOut)
def create_asset(project_id: int, payload: AssetCreate, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    asset = Asset(project_id=project_id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("", response_model=list[AssetOut])
def list_assets(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(Asset).where(Asset.project_id == project_id).order_by(Asset.id.desc())).scalars().all())
