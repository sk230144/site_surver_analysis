"""
AI-powered shading analysis endpoint using Gemini Vision
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import AnalysisOut
from app.db.models import AnalysisResult, Project, RoofPlane, Obstruction
from datetime import datetime
import os
import shutil

router = APIRouter(tags=["analysis"])


@router.post("/projects/{project_id}/analysis/shading/ai_vision", response_model=AnalysisOut)
async def run_shading_with_ai_vision(
    project_id: int,
    geometry_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Run AI-powered shading analysis using Gemini Vision to analyze geometry editor screenshot.

    Upload an image showing:
    - GREEN areas = Solar panels on roof
    - RED areas = Obstructions (trees, chimneys, etc.)

    AI will visually analyze the spatial relationship and provide detailed shading impact assessment.
    """
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save uploaded geometry image temporarily
    upload_dir = f"storage/uploads/project_{project_id}"
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"geometry_{timestamp}_{geometry_image.filename}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(geometry_image.file, buffer)

    # Get roof planes and obstructions for context
    planes = db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id)).scalars().all()
    obs = db.execute(select(Obstruction).where(Obstruction.project_id == project_id)).scalars().all()

    # Create analysis record
    rec = AnalysisResult(
        project_id=project_id,
        kind="shading",
        status="running",
        result={}
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Run AI-powered shading analysis
    try:
        from app.services.gemini_vision import analyze_shading_with_gemini

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

        # Get project location if available
        latitude = getattr(project, 'latitude', None)
        longitude = getattr(project, 'longitude', None)

        ai_result = analyze_shading_with_gemini(
            file_path,
            roof_planes_data,
            obstructions_data,
            latitude,
            longitude
        )

        # Check if AI analysis succeeded
        if "error" in ai_result:
            # Fall back to formula-based analysis
            from app.services.shading import run_shading_analysis
            rec.result = run_shading_analysis(
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
            rec.result["ai_analysis_attempted"] = True
            rec.result["ai_error"] = ai_result.get("error")
            rec.result["analysis_method"] = "formula_fallback"
        else:
            # Use AI analysis result
            rec.result = {
                "summary": f"✨ AI-powered shading analysis using Gemini Vision",
                "analysis_method": "gemini_vision_ai",
                "overall_shade_risk": ai_result.get("overall_shade_risk_score", 0),
                "estimated_annual_loss_percent": ai_result.get("estimated_annual_loss_percent", 0),
                "confidence": ai_result.get("analysis_confidence", "medium"),
                "findings": ai_result.get("findings", []),
                "dominant_obstruction": ai_result.get("dominant_obstruction"),
                "time_of_day_impact": ai_result.get("time_of_day_impact"),
                "seasonal_impact": ai_result.get("seasonal_impact"),
                "recommendations": ai_result.get("recommendations", []),
                "geometry_image_analyzed": f"/storage/uploads/project_{project_id}/{filename}",
                "total_roof_planes": len(planes),
                "total_obstructions": len(obs)
            }

        rec.status = "done"
        db.commit()

    except Exception as e:
        rec.status = "failed"
        rec.result = {"error": str(e)}
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return rec
