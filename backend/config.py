from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Development mode
    # bypass authentication for testing changing DEV_MODE to True in the .env file
    DEV_MODE: bool = False
    DEV_USER_ID: str = "dev_test_user_123"
    
    # CORS configuration
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Workload Identity Federation (recommended for production)
    USE_WORKLOAD_IDENTITY: bool = False
    
    # Service account key (fallback for local development)
    FIREBASE_CREDENTIALS_PATH: str = "serviceAccountKey.json"
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
