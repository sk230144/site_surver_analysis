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
    proj = db.get(Project, project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    rep = Report(project_id=project_id, status="running", meta={}, storage_url=None)
    db.add(rep)
    db.commit()
    db.refresh(rep)

    # GENERATE PDF SYNCHRONOUSLY (works on free tier hosting without background workers)
    try:
        from app.db.models import Asset, AnalysisResult
        from app.services.reports import build_minimal_report

        # Fetch all data needed for report
        assets = db.execute(select(Asset).where(Asset.project_id == project_id)).scalars().all()
        analyses = db.execute(select(AnalysisResult).where(AnalysisResult.project_id == project_id)).scalars().all()

        # Generate PDF
        pdf_bytes = build_minimal_report(
            project={"id": proj.id, "name": proj.name, "address": proj.address},
            assets=[{"kind": a.kind, "filename": a.filename, "storage_url": a.storage_url, "content_type": a.content_type} for a in assets],
            analyses=[{"kind": r.kind, "status": r.status, "result": r.result} for r in analyses],
        )

        # Save PDF to disk
        os.makedirs("reports_out", exist_ok=True)
        out_path = os.path.join("reports_out", f"project_{project_id}_report_{rep.id}.pdf")
        with open(out_path, "wb") as f:
            f.write(pdf_bytes)

        # Update report status
        rep.storage_url = f"file://{out_path}"
        rep.status = "done"
        db.commit()
        db.refresh(rep)

    except Exception as e:
        rep.status = "failed"
        rep.meta = {"error": str(e)}
        db.commit()
        db.refresh(rep)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

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
