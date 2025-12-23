from fastapi import APIRouter
from app.api.routes.projects import router as projects
from app.api.routes.assets import router as assets
from app.api.routes.geometry import router as geometry
from app.api.routes.layouts import router as layouts
from app.api.routes.rulesets import router as rulesets
from app.api.routes.analysis import router as analysis
from app.api.routes.reports import router as reports

api_router = APIRouter()
api_router.include_router(projects)
api_router.include_router(assets)
api_router.include_router(geometry)
api_router.include_router(layouts)
api_router.include_router(rulesets)
api_router.include_router(analysis)
api_router.include_router(reports)
