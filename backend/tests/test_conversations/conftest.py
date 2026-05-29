"""
conftest.py — shared fixtures for conversation tests.

Requirements:
    pip install pytest pytest-asyncio httpx firebase-admin fastapi

Environment:
    Set FIRESTORE_EMULATOR_HOST=localhost:8080 before running, or start
    the emulator and export it yourself:

        firebase emulators:start --only firestore
        export FIRESTORE_EMULATOR_HOST=localhost:8080
        pytest

The conftest patches `firebase_config.get_db` so every test uses the
emulator instead of production Firestore.
"""

import os
import pytest
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi.testclient import TestClient

# Point the SDK at the local emulator before any app code imports it.
os.environ.setdefault("FIRESTORE_EMULATOR_HOST", "localhost:8080")

# ---------------------------------------------------------------------------
# Firebase / Firestore setup
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def firebase_app():
    """Initialize a Firebase app once per test session."""
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault())
    yield firebase_admin.get_app()


@pytest.fixture(scope="session")
def db(firebase_app):
    """Return a Firestore client connected to the emulator."""
    return firestore.client()


# ---------------------------------------------------------------------------
# Wipe emulator data between tests so state never leaks
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clean_firestore(db):
    """Delete all documents in used collections before each test."""
    for collection in ("conversations", "profiles"):
        for doc in db.collection(collection).stream():
            doc.reference.delete()
    yield


# ---------------------------------------------------------------------------
# FastAPI TestClient
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app(firebase_app):
    """
    Build the FastAPI app and patch get_db to use the emulator client.
    Import your actual app here — adjust the import path as needed.
    """
    from unittest.mock import patch
    import firebase_admin.firestore as _fs
    from fastapi import FastAPI
    import router as conversation_router  # adjust if your file is named differently

    _app = FastAPI()
    _app.include_router(conversation_router.router)

    emulator_db = _fs.client()

    with patch("firebase_config.get_db", return_value=emulator_db):
        yield _app


@pytest.fixture
def client(app):
    return TestClient(app)


# ---------------------------------------------------------------------------
# Auth helper — override get_current_user per-test
# ---------------------------------------------------------------------------

@pytest.fixture
def auth(app):
    """
    Returns a context-manager-style helper.

    Usage:
        def test_something(client, auth):
            with auth("user-123"):
                resp = client.get("/conversations")
    """
    from contextlib import contextmanager
    from unittest.mock import patch
    import auth as auth_module  # adjust import if needed

    @contextmanager
    def _auth(user_id: str):
        with patch.object(auth_module, "get_current_user", return_value=user_id):
            yield

    return _auth


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def make_profile(db, user_id: str, first="Alice", last="Smith", pic=None):
    db.collection("profiles").document(user_id).set({
        "firstName": first,
        "lastName": last,
        "profilePicUrl": pic,
    })


def make_conversation(db, user_a: str, user_b: str, extra: dict | None = None) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    data = {
        "createdAt": now,
        "updatedAt": now,
        "participant_ids": [user_a, user_b],
        "last_message_preview": None,
        "last_message_sent_at": None,
        "last_message_sender_id": None,
        "participant_snapshots": {
            user_a: {"firstName": "Alice", "lastName": "Smith", "profilePicUrl": None},
            user_b: {"firstName": "Bob",   "lastName": "Jones", "profilePicUrl": None},
        },
    }
    if extra:
        data.update(extra)
    ref = db.collection("conversations").document()
    ref.set(data)
    return ref.id
