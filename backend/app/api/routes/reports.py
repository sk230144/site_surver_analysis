from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import ReportRequest, ReportOut
from app.db.models import Project, Report
from app.worker import enqueue_report

router = APIRouter(prefix="/projects/{project_id}/reports", tags=["reports"])

@router.post("", response_model=ReportOut)
def create_report(project_id: int, payload: ReportRequest, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    rep = Report(project_id=project_id, status="queued", metadata=payload.model_dump())
    db.add(rep)
    db.commit()
    db.refresh(rep)
    enqueue_report(rep.id, project_id)
    return rep

@router.get("", response_model=list[ReportOut])
def list_reports(project_id: int, db: Session = Depends(get_db)):
    return list(db.execute(select(Report).where(Report.project_id == project_id).order_by(Report.id.desc())).scalars().all())
