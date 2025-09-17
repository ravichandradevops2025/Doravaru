# app/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/doravaru_db"
    
    # API Keys
    OPENAI_API_KEY: str = "your-openai-api-key-here"
    TWITTER_BEARER_TOKEN: Optional[str] = None
    TRADINGVIEW_API_KEY: Optional[str] = None
    
    # Redis (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"

settings = Settings()