"""
test_delete_and_sync.py

Tests for:
  DELETE /conversations/{id}
  PATCH  /conversations/{id}/sync-snapshots
"""

import pytest
from conftest import make_profile, make_conversation


USER_A = "user-alice"
USER_B = "user-bob"
STRANGER = "user-stranger"


# ---------------------------------------------------------------------------
# DELETE /conversations/{id}
# ---------------------------------------------------------------------------

class TestDeleteConversation:

    def test_participant_can_delete(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(USER_A):
            resp = client.delete(f"/conversations/{cid}")

        assert resp.status_code == 204


    def test_deleted_conversation_no_longer_fetchable(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(USER_A):
            client.delete(f"/conversations/{cid}")
            resp = client.get(f"/conversations/{cid}")

        assert resp.status_code == 404


    def test_non_participant_cannot_delete(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(STRANGER):
            resp = client.delete(f"/conversations/{cid}")

        assert resp.status_code == 403


    def test_delete_nonexistent_conversation_returns_404(self, client, auth, db):
        with auth(USER_A):
            resp = client.delete("/conversations/ghost-id")

        assert resp.status_code == 404


    def test_delete_already_deleting_conversation_returns_409(self, client, auth, db):
        """If is_deleting flag is already set, a second DELETE must get 409."""
        cid = make_conversation(db, USER_A, USER_B, extra={"is_deleting": True})

        with auth(USER_A):
            resp = client.delete(f"/conversations/{cid}")

        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# PATCH /conversations/{id}/sync-snapshots
# ---------------------------------------------------------------------------

class TestSyncSnapshots:

    def test_snapshots_updated_from_profiles(self, client, auth, db):
        make_profile(db, USER_A, "Alice", "Smith")
        make_profile(db, USER_B, "Bob", "Jones")
        cid = make_conversation(db, USER_A, USER_B)

        # Update USER_B's profile after the conversation was created.
        db.collection("profiles").document(USER_B).update({"firstName": "Robert"})

        with auth(USER_A):
            resp = client.patch(f"/conversations/{cid}/sync-snapshots")

        assert resp.status_code == 200
        snapshots = resp.json()["participant_snapshots"]
        assert snapshots[USER_B]["firstName"] == "Robert"


    def test_non_participant_cannot_sync(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(STRANGER):
            resp = client.patch(f"/conversations/{cid}/sync-snapshots")

        assert resp.status_code == 403


    def test_sync_nonexistent_conversation_returns_404(self, client, auth, db):
        with auth(USER_A):
            resp = client.patch("/conversations/ghost-id/sync-snapshots")

        assert resp.status_code == 404


    def test_sync_with_deleted_profile_uses_fallback(self, client, auth, db):
        """If one participant's profile is gone, snapshot falls back to 'Deleted User'."""
        make_profile(db, USER_A, "Alice", "Smith")
        # USER_B has no profile document at all.
        cid = make_conversation(db, USER_A, USER_B)

        with auth(USER_A):
            resp = client.patch(f"/conversations/{cid}/sync-snapshots")

        assert resp.status_code == 200
        snapshots = resp.json()["participant_snapshots"]
        assert snapshots[USER_B]["firstName"] == "Deleted"
        assert snapshots[USER_B]["lastName"] == "User"
        assert snapshots[USER_B]["profilePicUrl"] is None


    def test_sync_updates_updated_at_timestamp(self, client, auth, db):
        from datetime import datetime, timezone, timedelta

        make_profile(db, USER_A, "Alice", "Smith")
        make_profile(db, USER_B, "Bob", "Jones")

        old_time = datetime.now(timezone.utc) - timedelta(days=1)
        cid = make_conversation(db, USER_A, USER_B, extra={"updatedAt": old_time})

        with auth(USER_A):
            resp = client.patch(f"/conversations/{cid}/sync-snapshots")

        updated_at_str = resp.json()["updated_at"]
        updated_at = datetime.fromisoformat(updated_at_str)
        # Should be fresher than the seed time
        assert updated_at > old_time
