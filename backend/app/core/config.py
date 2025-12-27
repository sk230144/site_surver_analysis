from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://solar:solar@localhost:5432/solar_platform"
    REDIS_URL: str = "redis://localhost:6379/0"
    APP_ENV: str = "dev"
    GEMINI_API_KEY: str = ""  # Google Gemini API key for roof image analysis

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
