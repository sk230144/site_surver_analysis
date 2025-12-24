from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import ReportOut
from app.db.models import Project, Report

router = APIRouter(tags=["reports"])

@router.get("/projects/{project_id}/reports", response_model=list[ReportOut])
def list_reports(project_id: int, db: Session = Depends(get_db)):
    """List all reports for a project"""
    return list(db.execute(
        select(Report)
        .where(Report.project_id == project_id)
        .order_by(Report.id.desc())
    ).scalars().all())

@router.post("/projects/{project_id}/reports/generate", response_model=ReportOut)
def generate_report(project_id: int, db: Session = Depends(get_db)):
    """Trigger report generation for a project"""
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")

    rep = Report(project_id=project_id, status="queued", meta={}, storage_url=None)
    db.add(rep)
    db.commit()
    db.refresh(rep)

    # Optional: enqueue Celery job (works without worker)
    try:
        from app.worker import enqueue_report
        enqueue_report(rep.id, project_id)
    except Exception:
        pass  # Continue even if worker not available

    return rep
