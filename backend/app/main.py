from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import api_router
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

app.include_router(api_router)

@app.get("/health")
def health():
    return {"ok": True}
