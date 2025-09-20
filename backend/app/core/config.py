import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Angel One API Configuration
    ANGEL_API_KEY: str = "a18ffda4"
    ANGEL_SECRET: str = "801865f61-201-46cd-bdb9-b20e64322a2a"
    ANGEL_CLIENT_CODE: str = "V127611"
    ANGEL_MPIN: str = os.getenv("ANGEL_MPIN", "")  # Set this in environment
    ANGEL_TOTP_SECRET: str = "YA2QSAUCI6L6IDCYMT6BQUGDKU"
    
    # API Configuration
    ANGEL_BASE_URL: str = "https://apiconnect.angelone.in"
    
    # Application Configuration
    APP_NAME: str = "Doravaru Trading Platform"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()