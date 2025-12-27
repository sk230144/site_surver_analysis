from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import AnalysisOut
from app.db.models import AnalysisResult, Project, Asset
from typing import List
import json
import os
import shutil
from datetime import datetime

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

@router.post("/projects/{project_id}/analysis/roof_risk/run_with_data", response_model=AnalysisOut)
async def run_roof_risk_with_data(
    project_id: int,
    images: List[UploadFile] = File(...),
    survey_data: str = Form(...),
    db: Session = Depends(get_db)
):
    """Run roof risk analysis with uploaded images and survey data"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse survey data
    try:
        survey_dict = json.loads(survey_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid survey data JSON")

    # Save uploaded images as assets
    upload_dir = f"storage/uploads/project_{project_id}"
    os.makedirs(upload_dir, exist_ok=True)

    saved_image_urls = []
    saved_image_paths = []

    for image in images:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"roof_{timestamp}_{image.filename}"
        file_path = os.path.join(upload_dir, filename)

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        # Create asset record
        asset = Asset(
            project_id=project_id,
            kind="photo",
            filename=filename,
            storage_url=f"/storage/uploads/project_{project_id}/{filename}",
            content_type=image.content_type,
            meta={"file_size": os.path.getsize(file_path), "source": "roof_risk_analysis"}
        )
        db.add(asset)
        saved_image_urls.append(asset.storage_url)
        saved_image_paths.append(file_path)

    db.commit()

    # Create analysis result record
    rec = AnalysisResult(
        project_id=project_id,
        kind="roof_risk",
        status="queued",
        result={}
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Enqueue analysis with images and survey data
    try:
        from app.worker import enqueue_roof_risk_with_data
        enqueue_roof_risk_with_data(rec.id, project_id, saved_image_paths, survey_dict)
    except Exception as e:
        # If worker not available, run synchronously
        from app.services.roof_risk import run_roof_risk
        rec.status = "running"
        db.commit()

        rec.result = run_roof_risk(saved_image_urls, survey_dict)
        rec.result["uploaded_images"] = saved_image_urls
        rec.result["image_count"] = len(saved_image_urls)

        rec.status = "done"
        db.commit()

    return rec
