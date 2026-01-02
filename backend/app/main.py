from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.api.routes import api_router
from app.api.deps import get_db
from pathlib import Path

app = FastAPI(title="Solar AI Platform API", version="0.2.0")

# CORS origins - supports both development and production
import os
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOAD_DIR = Path(__file__).parent.parent / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount storage directory (for compatibility with /storage/uploads paths)
STORAGE_DIR = Path(__file__).parent.parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

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

@app.delete("/assets/{asset_id}")
async def delete_asset_endpoint(asset_id: int, db: Session = Depends(get_db)):
    """Delete an asset"""
    from app.db.models import Asset
    import os

    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Try to delete the physical file
    if asset.storage_url:
        file_path = asset.storage_url.replace('/storage/', 'storage/')
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass  # Continue even if file deletion fails

    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted successfully"}

app.include_router(api_router)

@app.get("/health")
def health():
    return {"ok": True}
