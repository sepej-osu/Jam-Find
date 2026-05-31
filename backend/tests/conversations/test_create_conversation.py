"""
test_create_conversation.py

Tests for POST /conversations
"""

import pytest
from conftest import make_profile, make_conversation


USER_A = "user-alice"
USER_B = "user-bob"


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_create_conversation_returns_201(client, auth, db):
    make_profile(db, USER_A, "Alice", "Smith")
    make_profile(db, USER_B, "Bob", "Jones")

    with auth(USER_A):
        resp = client.post("/conversations", json={"recipient_id": USER_B})

    assert resp.status_code == 201
    body = resp.json()
    assert set(body["participant_ids"]) == {USER_A, USER_B}
    assert "conversation_id" in body
    assert body["last_message_preview"] is None


def test_create_conversation_stores_participant_snapshots(client, auth, db):
    make_profile(db, USER_A, "Alice", "Smith")
    make_profile(db, USER_B, "Bob", "Jones")

    with auth(USER_A):
        resp = client.post("/conversations", json={"recipient_id": USER_B})

    snapshots = resp.json()["participant_snapshots"]
    assert snapshots[USER_A]["firstName"] == "Alice"
    assert snapshots[USER_B]["firstName"] == "Bob"


def test_create_conversation_returns_existing_if_duplicate(client, auth, db):
    """Second POST between the same two users must return the existing conversation."""
    make_profile(db, USER_A, "Alice", "Smith")
    make_profile(db, USER_B, "Bob", "Jones")

    with auth(USER_A):
        resp1 = client.post("/conversations", json={"recipient_id": USER_B})
        resp2 = client.post("/conversations", json={"recipient_id": USER_B})

    assert resp1.json()["conversation_id"] == resp2.json()["conversation_id"]


# ---------------------------------------------------------------------------
# Validation failures
# ---------------------------------------------------------------------------

def test_create_conversation_with_self_returns_400(client, auth, db):
    make_profile(db, USER_A, "Alice", "Smith")

    with auth(USER_A):
        resp = client.post("/conversations", json={"recipient_id": USER_A})

    assert resp.status_code == 400
    assert "yourself" in resp.json()["detail"].lower()


def test_create_conversation_missing_recipient_id_returns_422(client, auth, db):
    make_profile(db, USER_A, "Alice", "Smith")

    with auth(USER_A):
        resp = client.post("/conversations", json={})

    assert resp.status_code == 422


def test_create_conversation_current_user_profile_missing_returns_404(client, auth, db):
    # Only seed the recipient — caller has no profile.
    make_profile(db, USER_B, "Bob", "Jones")

    with auth(USER_A):
        resp = client.post("/conversations", json={"recipient_id": USER_B})

    assert resp.status_code == 404
    assert "current user" in resp.json()["detail"].lower()


def test_create_conversation_recipient_profile_missing_returns_404(client, auth, db):
    make_profile(db, USER_A, "Alice", "Smith")
    # Deliberately do NOT seed USER_B's profile.

    with auth(USER_A):
        resp = client.post("/conversations", json={"recipient_id": USER_B})

    assert resp.status_code == 404
    assert "recipient" in resp.json()["detail"].lower()
