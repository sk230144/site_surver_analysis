from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.api.schemas import AnalysisRequest, AnalysisOut
from app.db.models import AnalysisResult, Project
from app.worker import enqueue_analysis

router = APIRouter(prefix="/projects/{project_id}/analysis", tags=["analysis"])

@router.post("", response_model=AnalysisOut)
def run_analysis(project_id: int, payload: AnalysisRequest, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    rec = AnalysisResult(project_id=project_id, kind=payload.kind, status="queued", result={})
    db.add(rec)
    db.commit()
    db.refresh(rec)
    enqueue_analysis(rec.id, payload.kind, project_id)
    return rec
