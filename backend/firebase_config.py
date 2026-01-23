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
    
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Firebase not initialized yet
        if settings.USE_WORKLOAD_IDENTITY:
            # Use Application Default Credentials (for GCP environments)
            firebase_admin.initialize_app()
        else:
            # Use service account key file
            if not os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Firebase credentials file not found at {settings.FIREBASE_CREDENTIALS_PATH}"
                )
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
    
    _db = firestore.client()
    return _db

@lru_cache()
def get_db():
    """Get Firestore database client"""
    if _db is None:
        return initialize_firebase()
    return _db
