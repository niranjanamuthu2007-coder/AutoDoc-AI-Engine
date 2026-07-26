import os
from pathlib import Path
from pydantic_settings import BaseSettings
BASE_DIR = Path(__file__).resolve().parent.parent
class Settings(BaseSettings):
    # App General Settings
    PROJECT_NAME: str = "AutoDoc AI Engine"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    # Fallback to local SQLite DB autodoc.db if PostgreSQL is not specified
    DATABASE_URL: str = "sqlite:///./autodoc.db"
    
    # JWT Auth Settings
    JWT_SECRET: str = "supersecretkeyforautodocalplatformjwttokencreation321!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth (Optional: if not set, simulated login mode will be active)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/callback"
    
    # Gemini API Key (Optional: if not set, local template QA engine is active)
    GEMINI_API_KEY: str = ""
    
    # File Storage Directories
    UPLOAD_DIR: str = str(BASE_DIR / "storage" / "uploads")
    TEMP_DIR: str = str(BASE_DIR / "storage" / "temporary")
    REPORT_DIR: str = str(BASE_DIR / "storage" / "reports")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
settings = Settings()
# Ensure storage directories exist safely
for dir_path in [settings.UPLOAD_DIR, settings.TEMP_DIR, settings.REPORT_DIR]:
    os.makedirs(dir_path, exist_ok=True)