from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.api.deps import get_db
from app.api.schemas import ProjectCreate, ProjectOut, ProjectListResponse, PaginationMeta
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

@router.get("", response_model=ProjectListResponse)
def list_projects(
    page: int = Query(1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    search: str = Query("", description="Search by project name or address"),
    db: Session = Depends(get_db)
):
    """
    List projects with pagination and search support.
    Returns paginated data with metadata.
    """
    # Calculate offset
    offset = (page - 1) * limit

    # Build base query
    query = select(Project).order_by(Project.id.desc())

    # Add search filter if search term is provided
    if search.strip():
        search_term = f"%{search.strip()}%"
        query = query.where(
            (Project.name.ilike(search_term)) |
            (Project.address.ilike(search_term))
        )

    # Get total count with search filter
    count_query = select(func.count(Project.id))
    if search.strip():
        search_term = f"%{search.strip()}%"
        count_query = count_query.where(
            (Project.name.ilike(search_term)) |
            (Project.address.ilike(search_term))
        )

    total_count = db.execute(count_query).scalar() or 0

    # Get paginated projects
    projects = list(
        db.execute(
            query.offset(offset).limit(limit)
        ).scalars().all()
    )

    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

    return ProjectListResponse(
        data=projects,
        pagination=PaginationMeta(
            total=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
    )

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
