from celery import Celery
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import AnalysisResult, RoofPlane, Obstruction, Asset, Report, Project
from app.services.shading import run_shading_analysis
from app.services.compliance import run_compliance_check
from app.services.roof_risk import run_roof_risk
from app.services.electrical import run_electrical_feasibility
from app.services.reports import build_minimal_report

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
            rec.result = run_shading_analysis(
                roof_planes=[{"id": p.id, "polygon_wkt": p.polygon_wkt} for p in planes],
                obstructions=[{"id": o.id, "polygon_wkt": o.polygon_wkt, "type": o.type} for o in obs],
            )
        elif kind == "compliance":
            rec.result = {"summary": "Compliance scaffold", "violations": run_compliance_check({}, {})}
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
            assets=[{"kind": a.kind, "filename": a.filename, "storage_url": a.storage_url} for a in assets],
            analyses=[{"kind": r.kind, "status": r.status} for r in analyses],
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
