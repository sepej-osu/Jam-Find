import firebase_admin
from firebase_admin import credentials, firestore
from functools import lru_cache
from config import settings
import os

_db = None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _db
    
    if _db is not None:
        return _db
    
    if settings.USE_EMULATOR:
        os.environ.setdefault("FIRESTORE_EMULATOR_HOST", settings.FIRESTORE_EMULATOR_HOST)
        os.environ.setdefault("FIREBASE_AUTH_EMULATOR_HOST", settings.FIREBASE_AUTH_EMULATOR_HOST)
        os.environ.setdefault("STORAGE_EMULATOR_HOST", settings.STORAGE_EMULATOR_HOST)
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.GOOGLE_CLOUD_PROJECT)
    
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Firebase not initialized yet
        if settings.USE_WORKLOAD_IDENTITY:
            # Use Application Default Credentials (for GCP environments)
            firebase_admin.initialize_app(options={
                "storageBucket": settings.GOOGLE_STORAGE_BUCKET
            })
        else:
            # Use service account key file
            if not os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Firebase credentials file not found at {settings.FIREBASE_CREDENTIALS_PATH}"
                )
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred,{
                    "storageBucket": settings.GOOGLE_STORAGE_BUCKET
            })
    
    _db = firestore.client()
    return _db

@lru_cache()
def get_db():
    """Get Firestore database client"""
    if _db is None:
        return initialize_firebase()
    return _db
