from celery import Celery
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import AnalysisResult, RoofPlane, Obstruction, Asset, Report, Project, Layout
from app.services.shading import run_shading_analysis
from app.services.shading_advanced import run_advanced_shading_analysis
from app.services.compliance import run_compliance_analysis
from app.services.roof_risk import run_roof_risk
from app.services.electrical import run_electrical_feasibility
from app.services.reports import build_minimal_report
import os

celery_app = Celery("solar_platform", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

def enqueue_analysis(record_id: int, kind: str, project_id: int) -> None:
    celery_app.send_task("app.worker.run_analysis_task", args=[record_id, kind, project_id])

def enqueue_report(report_id: int, project_id: int) -> None:
    celery_app.send_task("app.worker.run_report_task", args=[report_id, project_id])

@celery_app.task(name="app.worker.run_analysis_task")
def run_analysis_task(record_id: int, kind: str, project_id: int) -> None:
    db: Session = SessionLocal()
    try:
        rec = db.get(AnalysisResult, record_id)
        if not rec:
            return
        rec.status = "running"
        db.commit()

        if kind == "shading":
            planes = db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id)).scalars().all()
            obs = db.execute(select(Obstruction).where(Obstruction.project_id == project_id)).scalars().all()

            # Get project for location data
            project = db.get(Project, project_id)

            # Use advanced analysis if USE_ADVANCED_SHADING env var is set
            use_advanced = os.getenv("USE_ADVANCED_SHADING", "true").lower() == "true"

            if use_advanced:
                # Default to San Francisco if no location specified
                # In production, this should come from project.latitude, project.longitude
                latitude = 37.7749  # San Francisco
                longitude = -122.4194

                rec.result = run_advanced_shading_analysis(
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
                    latitude=latitude,
                    longitude=longitude
                )
            else:
                # Use simple heuristic analysis
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
        elif kind == "compliance":
            # Get roof planes and layouts for compliance check
            planes = db.execute(select(RoofPlane).where(RoofPlane.project_id == project_id)).scalars().all()
            layouts = db.execute(select(Layout).where(Layout.project_id == project_id)).scalars().all()

            # Extract layout data from JSON data field
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
            imgs = db.execute(select(Asset).where(Asset.project_id == project_id, Asset.kind == "photo")).scalars().all()
            rec.result = run_roof_risk([a.storage_url for a in imgs])
        elif kind == "electrical":
            imgs = db.execute(select(Asset).where(Asset.project_id == project_id, Asset.kind == "photo")).scalars().all()
            rec.result = run_electrical_feasibility([a.storage_url for a in imgs])
        else:
            rec.result = {"summary": f"Unknown analysis kind: {kind}"}

        rec.status = "done"
        db.commit()
    finally:
        db.close()

@celery_app.task(name="app.worker.run_report_task")
def run_report_task(report_id: int, project_id: int) -> None:
    db: Session = SessionLocal()
    try:
        rep = db.get(Report, report_id)
        proj = db.get(Project, project_id)
        if not rep or not proj:
            return
        rep.status = "running"
        db.commit()

        assets = db.execute(select(Asset).where(Asset.project_id == project_id)).scalars().all()
        analyses = db.execute(select(AnalysisResult).where(AnalysisResult.project_id == project_id)).scalars().all()

        pdf_bytes = build_minimal_report(
            project={"id": proj.id, "name": proj.name, "address": proj.address},
            assets=[{"kind": a.kind, "filename": a.filename, "storage_url": a.storage_url, "content_type": a.content_type} for a in assets],
            analyses=[{"kind": r.kind, "status": r.status, "result": r.result} for r in analyses],
        )

        import os
        os.makedirs("reports_out", exist_ok=True)
        out_path = os.path.join("reports_out", f"project_{project_id}_report_{report_id}.pdf")
        with open(out_path, "wb") as f:
            f.write(pdf_bytes)

        rep.storage_url = f"file://{out_path}"
        rep.status = "done"
        db.commit()
    finally:
        db.close()
