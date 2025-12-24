from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import AnalysisOut
from app.db.models import AnalysisResult, Project

router = APIRouter(tags=["analysis"])

VALID_ANALYSIS_KINDS = {"shading", "compliance", "roof_risk", "electrical"}

@router.get("/projects/{project_id}/analysis", response_model=list[AnalysisOut])
def list_analysis(project_id: int, db: Session = Depends(get_db)):
    """List all analysis results for a project"""
    return list(db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.project_id == project_id)
        .order_by(AnalysisResult.id.desc())
    ).scalars().all())

@router.post("/projects/{project_id}/analysis/{kind}/run", response_model=AnalysisOut)
def run_analysis(project_id: int, kind: str, db: Session = Depends(get_db)):
    """Trigger analysis run for a specific kind"""
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")

    if kind not in VALID_ANALYSIS_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis kind. Must be one of: {', '.join(VALID_ANALYSIS_KINDS)}"
        )

    rec = AnalysisResult(project_id=project_id, kind=kind, status="queued", result={})
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Optional: enqueue Celery job (works without worker)
    try:
        from app.worker import enqueue_analysis
        enqueue_analysis(rec.id, kind, project_id)
    except Exception:
        pass  # Continue even if worker not available

    return rec
