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

@router.post("/projects/{project_id}/analysis/shading/run_with_screenshot", response_model=AnalysisOut)
async def run_shading_with_screenshot(
    project_id: int,
    geometry_screenshot: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Run shading analysis with optional geometry screenshot for AI enhancement.

    If geometry_screenshot is provided, saves it as an asset and uses it for hybrid AI+math analysis.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save geometry screenshot if provided
    geometry_asset = None
    if geometry_screenshot:
        try:
            upload_dir = f"storage/uploads/project_{project_id}"
            os.makedirs(upload_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"geometry_{timestamp}_{geometry_screenshot.filename}"
            file_path = os.path.join(upload_dir, filename)

            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(geometry_screenshot.file, buffer)

            # Create asset record
            geometry_asset = Asset(
                project_id=project_id,
                kind="geometry_screenshot",
                storage_url=f"/{file_path}",
                metadata={"timestamp": timestamp}
            )
            db.add(geometry_asset)
            db.commit()
            db.refresh(geometry_asset)
        except Exception as e:
            # Continue without geometry screenshot if upload fails
            pass

    # Now run the shading analysis (it will find the geometry_screenshot we just created)
    return run_analysis(project_id, "shading", db)


@router.post("/projects/{project_id}/analysis/{kind}/run", response_model=AnalysisOut)
def run_analysis(project_id: int, kind: str, db: Session = Depends(get_db)):
    """Trigger analysis run for a specific kind"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if kind not in VALID_ANALYSIS_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis kind. Must be one of: {', '.join(VALID_ANALYSIS_KINDS)}"
        )

    rec = AnalysisResult(project_id=project_id, kind=kind, status="running", result={})
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Run analysis synchronously (Celery worker not available on free tier)
    from sqlalchemy import select
    from app.db.models import RoofPlane, Obstruction, Layout, Asset

    if kind == "shading":
        from app.services.shading import run_shading_analysis
        planes = db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id)).scalars().all()
        obs = db.execute(select(Obstruction).where(Obstruction.project_id == project_id)).scalars().all()

        # HYBRID APPROACH: Run mathematical analysis first
        math_result = run_shading_analysis(
            roof_planes=[{
                "id": p.id,
                "polygon_wkt": p.polygon_wkt,
                "name": p.name,
                "tilt_deg": p.tilt_deg,
                "azimuth_deg": p.azimuth_deg
            } for p in planes],
            obstructions=[{
                "id": o.id,
                "polygon_wkt": o.polygon_wkt,
                "type": o.type,
                "height_m": o.height_m
            } for o in obs],
        )

        # Try to enhance with AI analysis if possible
        # NEW: Run AI analysis using geometry data (no screenshot needed!)
        from app.core.config import settings

        ai_result = None

        if settings.GEMINI_API_KEY and len(planes) > 0 and len(obs) > 0:
            # Use NEW geometry-only AI analysis
            try:
                from app.services.gemini_vision import analyze_shading_from_geometry_data

                roof_planes_data = [{
                    "id": p.id,
                    "name": p.name,
                    "tilt_deg": p.tilt_deg,
                    "azimuth_deg": p.azimuth_deg
                } for p in planes]

                obstructions_data = [{
                    "id": o.id,
                    "type": o.type,
                    "height_m": o.height_m
                } for o in obs]

                latitude = getattr(project, 'latitude', None)
                longitude = getattr(project, 'longitude', None)

                ai_result = analyze_shading_from_geometry_data(
                    roof_planes_data,
                    obstructions_data,
                    latitude,
                    longitude
                )
            except Exception as e:
                # AI failed, continue with math-only result
                math_result["ai_enhancement_error"] = str(e)

        # Combine mathematical and AI results for hybrid analysis
        if ai_result and "error" not in ai_result:
            # HYBRID MODE: Blend math and AI results
            math_score = math_result.get("average_shade_risk", 0)
            ai_score = ai_result.get("overall_shade_risk_score", 0)

            # Weighted average: 40% math, 60% AI (AI is more accurate for visual analysis)
            hybrid_score = (math_score * 0.4) + (ai_score * 0.6)

            # Calculate confidence based on agreement
            score_diff = abs(math_score - ai_score)
            if score_diff < 10:
                confidence = "very_high"
            elif score_diff < 20:
                confidence = "high"
            elif score_diff < 30:
                confidence = "medium"
            else:
                confidence = "low"

            rec.result = {
                "analysis_method": "hybrid_math_ai",
                "summary": f"🎯 Hybrid Analysis (Math + AI) - Confidence: {confidence.replace('_', ' ').title()}",
                "hybrid_shade_risk_score": round(hybrid_score, 1),
                "confidence": confidence,

                # Math results
                "math_analysis": {
                    "score": math_score,
                    "details": math_result
                },

                # AI results
                "ai_analysis": {
                    "score": ai_score,
                    "findings": ai_result.get("findings", []),
                    "time_of_day_impact": ai_result.get("time_of_day_impact"),
                    "seasonal_impact": ai_result.get("seasonal_impact"),
                    "recommendations": ai_result.get("recommendations", [])
                },

                # Combined insights
                "final_assessment": {
                    "shade_risk_score": round(hybrid_score, 1),
                    "estimated_annual_loss_percent": round((math_result.get("planes", [{}])[0].get("estimated_annual_loss_percent", 0) * 0.4) + (ai_result.get("estimated_annual_loss_percent", 0) * 0.6), 1),
                    "consensus": "Both analyses agree" if score_diff < 15 else "Analyses show different perspectives",
                    "dominant_obstruction": ai_result.get("dominant_obstruction") or math_result.get("planes", [{}])[0].get("dominant_obstruction")
                },

                "total_roof_planes": math_result.get("total_roof_planes"),
                "total_obstructions": math_result.get("total_obstructions")
            }
        else:
            # AI not available or failed - use math-only result with note
            rec.result = math_result
            rec.result["analysis_method"] = "mathematical_only"
            if ai_result and "error" in ai_result:
                rec.result["ai_note"] = f"AI enhancement unavailable: {ai_result.get('error')}"
            else:
                rec.result["ai_note"] = "Upload a geometry screenshot to enable AI-enhanced hybrid analysis"
    elif kind == "compliance":
        from app.services.compliance import run_compliance_analysis
        planes = db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id)).scalars().all()
        layouts = db.execute(select(Layout).where(Layout.project_id == project_id)).scalars().all()

        layout_dicts = []
        for l in layouts:
            layout_data = l.data if l.data else {}
            layout_dicts.append({
                "id": l.id,
                "roof_plane_id": layout_data.get("roof_plane_id"),
                "panel_count": layout_data.get("panel_count", 0),
                "offset_from_edge_m": layout_data.get("offset_from_edge_m", 0.0),
                "layout_config": layout_data.get("layout_config", {})
            })

        rec.result = run_compliance_analysis(
            roof_planes=[{
                "id": p.id,
                "polygon_wkt": p.polygon_wkt,
                "name": p.name,
                "tilt_deg": p.tilt_deg,
                "azimuth_deg": p.azimuth_deg
            } for p in planes],
            layouts=layout_dicts
        )
    elif kind == "roof_risk":
        from app.services.roof_risk import run_roof_risk
        imgs = db.execute(select(Asset).where(Asset.project_id == project_id, Asset.kind == "photo")).scalars().all()
        rec.result = run_roof_risk([a.storage_url for a in imgs], {})
    elif kind == "electrical":
        rec.result = {"summary": "Use the /projects/{id}/analysis/electrical/run_with_data endpoint with panel data"}
    else:
        rec.result = {"summary": f"Unknown analysis kind: {kind}"}

    rec.status = "done"
    db.commit()

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

    # Run analysis synchronously (Celery worker not available on free tier)
    from app.services.roof_risk import run_roof_risk
    rec.status = "running"
    db.commit()

    rec.result = run_roof_risk(saved_image_urls, survey_dict, saved_image_paths)
    rec.result["uploaded_images"] = saved_image_urls
    rec.result["image_count"] = len(saved_image_urls)

    rec.status = "done"
    db.commit()

    return rec

@router.post("/projects/{project_id}/analysis/electrical/run_with_data", response_model=AnalysisOut)
async def run_electrical_with_data(
    project_id: int,
    images: List[UploadFile] = File(default=[]),
    electrical_data: str = Form(...),
    db: Session = Depends(get_db)
):
    """Run electrical analysis with optional panel images and electrical specifications"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse electrical data
    try:
        electrical_dict = json.loads(electrical_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid electrical data JSON")

    # Save uploaded panel images as assets (optional)
    upload_dir = f"storage/uploads/project_{project_id}"
    os.makedirs(upload_dir, exist_ok=True)

    saved_image_urls = []
    saved_image_paths = []

    for image in images:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"panel_{timestamp}_{image.filename}"
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
            meta={"file_size": os.path.getsize(file_path), "source": "electrical_analysis"}
        )
        db.add(asset)
        saved_image_urls.append(asset.storage_url)
        saved_image_paths.append(file_path)

    db.commit()

    # Create analysis result record
    rec = AnalysisResult(
        project_id=project_id,
        kind="electrical",
        status="queued",
        result={}
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Run analysis synchronously (Celery worker not available on free tier)
    from app.services.electrical import run_electrical_analysis
    rec.status = "running"
    db.commit()

    rec.result = run_electrical_analysis(electrical_dict, saved_image_paths if saved_image_paths else None)
    rec.result["uploaded_images"] = saved_image_urls
    rec.result["image_count"] = len(saved_image_urls)

    rec.status = "done"
    db.commit()

    return rec
