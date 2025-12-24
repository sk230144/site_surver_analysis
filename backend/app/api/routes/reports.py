from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import ReportOut
from app.db.models import Project, Report
from pathlib import Path
import os

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

@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a report and its associated PDF file"""
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete the PDF file if it exists
    if report.storage_url:
        try:
            # storage_url looks like: file://reports_out/project_7_report_11.pdf
            file_path = report.storage_url.replace('file://', '')
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            # Log error but continue with DB deletion
            print(f"Error deleting report file: {e}")

    db.delete(report)
    db.commit()
    return {"ok": True, "message": "Report deleted"}
