from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import ProjectCreate, ProjectOut
from app.db.models import Project
import os
import uuid
from pathlib import Path

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=payload.name, address=payload.address)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return list(db.execute(select(Project).order_by(Project.id.desc())).scalars().all())

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project by ID"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True, "message": f"Project {project_id} deleted successfully"}

@router.post("/{project_id}/upload-image")
async def upload_geometry_image(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload an image for geometry editing"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Create upload directory
    upload_dir = Path("storage/uploads") / f"project_{project_id}"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else '.png'
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename

    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update project with image URL
    image_url = f"/projects/{project_id}/image/{unique_filename}"
    project.uploaded_image_url = image_url
    project.geometry_view_mode = "uploaded"
    db.commit()
    db.refresh(project)

    return {"ok": True, "image_url": image_url}

@router.get("/{project_id}/image/{filename}")
async def get_geometry_image(project_id: int, filename: str):
    """Serve uploaded geometry image"""
    from fastapi.responses import FileResponse

    file_path = Path("storage/uploads") / f"project_{project_id}" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path)

@router.patch("/{project_id}/view-mode")
def update_view_mode(
    project_id: int,
    view_mode: str,
    db: Session = Depends(get_db)
):
    """Update geometry view mode preference"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if view_mode not in ["satellite", "uploaded", "map"]:
        raise HTTPException(status_code=400, detail="Invalid view mode")

    project.geometry_view_mode = view_mode
    db.commit()

    return {"ok": True, "view_mode": view_mode}
