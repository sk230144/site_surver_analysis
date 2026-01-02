from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
