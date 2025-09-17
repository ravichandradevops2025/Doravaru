import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database - SQLite for simplicity
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./doravaru.db")
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "demo-key")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    
    # CORS - allow GitHub Pages domain
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "https://yourusername.github.io",  # Replace with your GitHub username
        "https://*.github.io"
    ]
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    class Config:
        env_file = ".env"

settings = Settings()