from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import LayoutCreate, LayoutOut
from app.db.models import Project, Layout

router = APIRouter(prefix="/projects/{project_id}/layouts", tags=["layouts"])

@router.post("", response_model=LayoutOut)
def create_layout(project_id: int, payload: LayoutCreate, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    item = Layout(project_id=project_id, name=payload.name, data=payload.data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("", response_model=list[LayoutOut])
def list_layouts(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(Layout).where(Layout.project_id == project_id).order_by(Layout.id.desc())).scalars().all())
