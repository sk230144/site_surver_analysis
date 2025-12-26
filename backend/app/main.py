from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.api.routes import api_router
from app.api.deps import get_db
from pathlib import Path

app = FastAPI(title="Solar AI Platform API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOAD_DIR = Path(__file__).parent.parent / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount static files for reports
REPORTS_DIR = Path(__file__).parent.parent / "reports_out"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/reports_files", StaticFiles(directory=str(REPORTS_DIR)), name="reports")

@app.delete("/analysis/{analysis_id}")
async def delete_analysis_endpoint(analysis_id: int, db: Session = Depends(get_db)):
    """Delete an analysis result"""
    from app.db.models import AnalysisResult
    analysis = db.get(AnalysisResult, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(analysis)
    db.commit()
    return {"message": "Analysis deleted successfully"}

app.include_router(api_router)

@app.get("/health")
def health():
    return {"ok": True}
