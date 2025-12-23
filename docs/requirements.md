# requirements.md — Product Requirements (from chat)

## Major Problems in Current Site Surveys
1. **Inaccurate Preliminary Models**  
   Reliance on outdated/low-resolution satellite or aerial imagery causes wrong measurements and missed obstructions (vents, pipes, skylights). This leads to redesign after survey.

2. **Inability to Assess Roof Condition**  
   Software cannot assess roof health (rot, water damage, structural integrity) without physical inspection, risking installation on unfit roofs.

3. **Limited Electrical System Analysis**  
   Tools cannot automatically verify electrical panel capacity/age/safety compliance; requires electrician on-site.

4. **Complex & Manual Shading Analysis**  
   Basic shading exists, but accurate seasonal shading from irregular objects (trees, chimneys) and future growth is manual and error-prone.

5. **Regulatory and Permitting Bottlenecks**  
   Designs are not automatically checked against local codes, fire setbacks, or utility interconnection rules, causing permit rejections.

6. **Data Silos and Workflow Disconnect**  
   On-site notes/photos are separated from design software, requiring manual re-entry and causing errors/delays.

7. **High Cost and Skill Barrier**  
   Existing end-to-end platforms are expensive and complex for small and mid-sized installers.

---

## Advanced Software Features to Solve Them
1. **AI-Powered 3D Modeling from Drone LiDAR/Photogrammetry**  
   Generate millimeter-accurate textured 3D models capturing all obstructions.

2. **AI for Roof Condition & Structural Analysis**  
   Computer vision + thermal scans to flag cracks, moss, sagging, repairs; recommend inspection.

3. **Automated Electrical Feasibility Engine**  
   Panel photo recognition + panel spec DB integration; compute capacity and flag likely upgrades.

4. **Predictive, Dynamic Shading Simulation**  
   3D model + object recognition; simulate daily/seasonal shade for 25+ years including tree growth.

5. **Integrated Regulatory Compliance Checker**  
   Rule engine cross-references design vs local building codes/utility rules/HOA; generates compliant plans.

6. **Unified Field-to-Office Platform**  
   Mobile-to-desktop sync; photos/notes/drone models tagged and usable directly by designers.

7. **Generative AI for Optimal Design**  
   Input goals (max production/budget/aesthetics); produce multiple optimized layouts under constraints.

8. **Augmented Reality (AR) for On-Site Guidance**  
   Overlay layout on roof via tablet/AR; verify and visualize for client.

---

## Finalized Tech Stack (Solo Builder)
### Frontend
- Next.js (TypeScript)
- TailwindCSS
- TanStack Query
- 3D later: Three.js / react-three-fiber

### Backend
- FastAPI (Python) + Pydantic
- Celery + Redis for async processing

### Database
- PostgreSQL + PostGIS (single database)

### Storage
- S3/R2 for large files; Postgres stores metadata + URLs

### AI/Processing (phased)
- Open3D (future) for point-cloud/mesh processing
- Shapely/GeoPandas for geometry operations
- PyTorch for CV models
- ReportLab for PDF plan sets
