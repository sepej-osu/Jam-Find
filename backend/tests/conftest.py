"""
Top-level conftest.py for backend tests.

Seeds required Firestore emulator data (e.g. a profile for DEV_USER_ID)
so tests that depend on profile existence (like test_posts) can run.
"""

import os
import pytest
import firebase_admin
from firebase_admin import credentials, firestore

# Must be set before any Firebase/Firestore client is created.
os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"


@pytest.fixture(scope="session", autouse=False)
def seed_dev_profile():
    """
    Create a minimal profile document for DEV_USER_ID in the emulator
    so post creation (which checks for profile existence) doesn't 404.
    Cleaned up after the session.
    """
    from config import get_settings
    import firebase_config

    settings = get_settings()

    # Initialize Firebase if not already done.
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)

    # Clear any cached Firestore client so it picks up the emulator host.
    firebase_config._db = None
    firebase_config.get_db.cache_clear()

    db = firestore.client()
    user_id = settings.DEV_USER_ID
    profile_ref = db.collection("profiles").document(user_id)

    profile_ref.set({
        "userId": user_id,
        "firstName": "Test",
        "lastName": "User",
        "profilePicUrl": None,
    })

    yield

    profile_ref.delete()
