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
    DEV_USER_ID_2: str = "dev_test_user_456"
    
    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://localhost:8091",
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8091",
        "https://jamfind.com"    # Your production domain
    ]
    
    # Workload Identity Federation (recommended for production)
    USE_WORKLOAD_IDENTITY: bool = False
    
    # Service account key (fallback for local development)
    FIREBASE_CREDENTIALS_PATH: str = "serviceAccountKey.json"

    # Google Maps API Key (for geocoding and location services)
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_MAPS_API_TIMEOUT: int = 5  # seconds

    # Google Cloud Storage configuration
    GOOGLE_STORAGE_BUCKET: str = ""

    # Set to True to connect to local Firebase emulators instead of production
    USE_EMULATOR: bool = False

    # Firebase emulator configuration (local only)
    FIRESTORE_EMULATOR_HOST: str = ""
    FIREBASE_AUTH_EMULATOR_HOST: str = ""
    STORAGE_EMULATOR_HOST: str = ""
    FIREBASE_STORAGE_EMULATOR_HOST: str = ""
    GOOGLE_CLOUD_PROJECT: str = ""
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()