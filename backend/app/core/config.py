"""
Configuration Settings for Mentora FastAPI Backend
Simple and clean configuration using Pydantic
"""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings - loads from environment variables
    """
    
    # Project Info
    PROJECT_NAME: str = "Mentora API"
    VERSION: str = "2.0.0 - FastAPI"
    DESCRIPTION: str = "AI Study Assistant Backend"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-make-it-long-and-random"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATABASE_URL: str = f"sqlite+aiosqlite:///{PROJECT_ROOT}/data/database/mentora.db"
    
    # File Storage
    MEDIA_ROOT: Path = PROJECT_ROOT / "data" / "media"
    DOCUMENTS_PATH: Path = MEDIA_ROOT / "documents"
    AVATARS_PATH: Path = MEDIA_ROOT / "avatars"
    VECTOR_DB_PATH: Path = PROJECT_ROOT / "data" / "vector_db" / "chroma_db"
    
    # AI Configuration
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-pro"
    
    # CORS Origins (comma-separated list)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def cors_origins_list(self) -> list:
        """Convert CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Email Settings (SMTP)
    SMTP_HOST: Optional[str] = None  # e.g., smtp.gmail.com
    SMTP_PORT: int = 587  # 587 for TLS, 465 for SSL
    SMTP_USER: Optional[str] = None  # Your email address
    SMTP_PASSWORD: Optional[str] = None  # Your email password or app password
    FROM_EMAIL: Optional[str] = None  # Email to send from
    FROM_NAME: str = "Mentora"  # Display name
    SMTP_USE_TLS: bool = True  # True for TLS (587), False for SSL (465)
    
    # App Settings
    DEBUG: bool = True
    
    class Config:
        # Look for .env in project root
        env_file = str(Path(__file__).resolve().parent.parent.parent.parent / ".env")
        case_sensitive = True
        extra = "ignore"  # Ignore unknown environment variables


# Create settings instance
settings = Settings()

# Ensure directories exist
settings.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
settings.DOCUMENTS_PATH.mkdir(parents=True, exist_ok=True)
settings.AVATARS_PATH.mkdir(parents=True, exist_ok=True)
settings.VECTOR_DB_PATH.mkdir(parents=True, exist_ok=True)
