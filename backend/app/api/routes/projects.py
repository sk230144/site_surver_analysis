from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import ProjectCreate, ProjectOut
from app.db.models import Project

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
