# steps.md — Step-by-step implementation checklist (file-by-file)

This file tells you **what to implement in each file** to complete the platform feature-by-feature.
Each step includes:
- Goal
- Achievement (acceptance)
- Files to edit/create
- What code to add

---

## Step 0 — Run the starter stack
**Goal:** Run DB + API + Web and create a project from the UI.  
**Achieve:** `GET /health` ok, create/list projects in UI.  
**Files:** `docker-compose.yml`, `backend/app/main.py`, `frontend/app/projects/page.tsx`

---

## Step 1 — Project Detail UI + Assets + Analysis + Reports buttons
**Goal:** One page per project with everything visible.  
**Achieve:** `/projects/[id]` shows project + assets + analysis triggers + reports list.  
**Files:**
- `frontend/app/projects/[id]/page.tsx`
- `backend/app/api/routes/assets.py`
- `backend/app/api/routes/analysis.py`
- `backend/app/api/routes/reports.py`

---

## Step 2 — Real file uploads (signed URL)
**Goal:** Upload photos/models without manually pasting URLs.  
**Achieve:** Frontend requests upload URL → uploads → creates asset row.  
**Files to add:**
- `backend/app/api/routes/uploads.py` (presigned URL)
- `backend/app/services/storage.py` (local + S3/R2)
- `frontend/app/projects/[id]/page.tsx` (file picker)

---

## Step 3 — Geometry foundation (roof planes + obstructions)
**Goal:** Store roof planes and obstructions.  
**Achieve:** Create/list roof planes and obstructions for a project.  
**Files:**
- `backend/app/api/routes/geometry.py`
- `backend/app/services/geometry.py`
- `frontend/app/projects/[id]/geometry/page.tsx`

---

## Step 4 — Layout CRUD
**Goal:** Save panel layout JSON.  
**Achieve:** Create/list layouts.  
**Files:**
- `backend/app/api/routes/layouts.py`
- `frontend/app/projects/[id]/layouts/page.tsx`

---

## Step 5 — Compliance checker (starter → real)
**Goal:** Return rule violations for a layout.  
**Achieve:** Compliance analysis returns structured `violations[]`.  
**Files:**
- `backend/app/services/compliance.py`
- `backend/app/worker.py` (wire real compliance)
- `backend/app/api/routes/rulesets.py`

---

## Step 6 — Shading analysis v1 (useful approximation)
**Goal:** Per-plane shade risk result stored in DB.  
**Achieve:** Shading analysis returns `planes[]` risk values.  
**Files:**
- `backend/app/services/shading.py`
- `backend/app/worker.py`

---

## Step 7 — 3D viewer + manual drawing (first usable)
**Goal:** View model and draw polygons on it.  
**Achieve:** Save drawn polygons as roof planes/obstructions.  
**Files to add:**
- `frontend/components/ModelViewer.tsx`
- `frontend/app/projects/[id]/model/page.tsx`

---

## Step 8 — Roof risk AI (scaffold first)
**Goal:** Stable API contract for roof CV.  
**Achieve:** returns `flags[]` + confidence.  
**Files:**
- `backend/app/services/roof_risk.py`
- `backend/app/worker.py`

---

## Step 9 — Electrical feasibility AI (scaffold first)
**Goal:** Stable API contract for electrical CV/OCR.  
**Achieve:** returns upgrade recommendation + reasons.  
**Files:**
- `backend/app/services/electrical.py`
- `backend/app/worker.py`

---

## Step 10 — Reports / Permit pack
**Goal:** One-click PDF report generation.  
**Achieve:** Report is generated and URL stored.  
**Files:**
- `backend/app/services/reports.py`
- `backend/app/api/routes/reports.py`
- `backend/app/worker.py`
- `frontend/app/projects/[id]/reports/page.tsx`

---

## Step 11 — Upgrade WKT → true PostGIS geometries
**Goal:** correct + scalable spatial operations.  
**Achieve:** migrate columns to geometry + add spatial indexes.  
**Files:**
- `backend/alembic/versions/XXXX_geometry_upgrade.py`
- `backend/app/db/models.py` (geoalchemy2)
- `backend/requirements.txt`
