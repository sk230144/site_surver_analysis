# Solar Site Survey & AI Design Platform — Starter Monorepo

## Tech Stack
- Next.js (TypeScript) + Tailwind
- FastAPI (Python) + Celery + Redis
- PostgreSQL + PostGIS (single DB)

## Docs
- `docs/requirements.md`
- `docs/steps.md`

## Run
```bash
docker compose up -d db redis

cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Worker:
```bash
cd backend
source .venv/bin/activate
celery -A app.worker.celery_app worker --loglevel=INFO
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
