from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import AssetCreate, AssetOut
from app.db.models import Asset, Project
from pathlib import Path
import uuid
import shutil

router = APIRouter(tags=["assets"])

UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "storage" / "uploads"

@router.post("/projects/{project_id}/assets/upload", response_model=AssetOut)
async def upload_asset(
    project_id: int,
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a file and create an asset record"""
    # Validate project exists
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create project-specific directory
    project_dir = UPLOAD_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = project_dir / unique_filename
    
    # Save file to disk
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Create asset record
    asset = Asset(
        project_id=project_id,
        kind=kind,
        filename=file.filename,
        content_type=file.content_type,
        storage_url=f"/uploads/project_{project_id}/{unique_filename}",
        meta={"file_size": file_size, "original_filename": file.filename}
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return asset

@router.post("/projects/{project_id}/assets", response_model=AssetOut)
def create_asset(project_id: int, payload: AssetCreate, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    asset = Asset(project_id=project_id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("/projects/{project_id}/assets", response_model=list[AssetOut])
def list_assets(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(Asset).where(Asset.project_id == project_id).order_by(Asset.id.desc())).scalars().all())

@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return {"ok": True, "message": "Asset deleted"}
