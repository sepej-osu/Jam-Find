"""
test_get_conversations.py

Tests for:
  GET /conversations           (list with pagination)
  GET /conversations/{id}      (single fetch)
"""

import pytest
from datetime import datetime, timezone, timedelta
from conftest import make_profile, make_conversation


USER_A = "user-alice"
USER_B = "user-bob"
USER_C = "user-carol"
STRANGER = "user-stranger"


# ---------------------------------------------------------------------------
# GET /conversations — list
# ---------------------------------------------------------------------------

class TestListConversations:

    def test_returns_empty_list_when_no_conversations(self, client, auth, db):
        with auth(USER_A):
            resp = client.get("/conversations")

        assert resp.status_code == 200
        body = resp.json()
        assert body["conversations"] == []
        assert body["next_page_token"] is None


    def test_returns_only_users_own_conversations(self, client, auth, db):
        make_profile(db, USER_A)
        make_profile(db, USER_B)
        make_profile(db, USER_C)
        make_conversation(db, USER_A, USER_B)
        make_conversation(db, USER_B, USER_C)  # USER_A is not a participant

        with auth(USER_A):
            resp = client.get("/conversations")

        convos = resp.json()["conversations"]
        assert len(convos) == 1
        assert set(convos[0]["participant_ids"]) == {USER_A, USER_B}


    def test_conversations_sorted_by_updated_at_descending(self, client, auth, db):
        now = datetime.now(timezone.utc)
        older_id = make_conversation(db, USER_A, USER_B,
                                     extra={"updatedAt": now - timedelta(hours=2)})
        newer_id = make_conversation(db, USER_A, USER_C,
                                     extra={"updatedAt": now - timedelta(minutes=5)})

        with auth(USER_A):
            resp = client.get("/conversations")

        ids = [c["conversation_id"] for c in resp.json()["conversations"]]
        assert ids[0] == newer_id
        assert ids[1] == older_id


    def test_default_limit_is_ten(self, client, auth, db):
        # Create 12 conversations
        for i in range(12):
            other = f"user-{i}"
            make_profile(db, other)
            make_conversation(db, USER_A, other)

        with auth(USER_A):
            resp = client.get("/conversations")

        body = resp.json()
        assert len(body["conversations"]) == 10
        assert body["next_page_token"] is not None


    def test_custom_limit_respected(self, client, auth, db):
        for i in range(5):
            make_conversation(db, USER_A, f"user-{i}")

        with auth(USER_A):
            resp = client.get("/conversations?limit=3")

        assert len(resp.json()["conversations"]) == 3


    def test_limit_below_one_returns_422(self, client, auth, db):
        with auth(USER_A):
            resp = client.get("/conversations?limit=0")

        assert resp.status_code == 422


    def test_pagination_cursor_returns_next_page(self, client, auth, db):
        now = datetime.now(timezone.utc)
        ids = []
        for i in range(4):
            cid = make_conversation(db, USER_A, f"user-{i}",
                                    extra={"updatedAt": now - timedelta(minutes=i)})
            ids.append(cid)

        with auth(USER_A):
            page1 = client.get("/conversations?limit=2").json()
            token = page1["next_page_token"]
            page2 = client.get(f"/conversations?limit=2&last_doc_id={token}").json()

        p1_ids = {c["conversation_id"] for c in page1["conversations"]}
        p2_ids = {c["conversation_id"] for c in page2["conversations"]}
        assert p1_ids.isdisjoint(p2_ids)
        assert p1_ids | p2_ids == set(ids)


    def test_last_page_has_no_next_page_token(self, client, auth, db):
        for i in range(2):
            make_conversation(db, USER_A, f"user-{i}")

        with auth(USER_A):
            resp = client.get("/conversations?limit=10").json()

        assert resp["next_page_token"] is None


# ---------------------------------------------------------------------------
# GET /conversations/{id}
# ---------------------------------------------------------------------------

class TestGetConversationById:

    def test_returns_conversation_for_participant(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(USER_A):
            resp = client.get(f"/conversations/{cid}")

        assert resp.status_code == 200
        assert resp.json()["conversation_id"] == cid


    def test_non_participant_gets_403(self, client, auth, db):
        cid = make_conversation(db, USER_A, USER_B)

        with auth(STRANGER):
            resp = client.get(f"/conversations/{cid}")

        assert resp.status_code == 403
        assert "participant" in resp.json()["detail"].lower()


    def test_nonexistent_conversation_returns_404(self, client, auth, db):
        with auth(USER_A):
            resp = client.get("/conversations/does-not-exist")

        assert resp.status_code == 404


    def test_unauthenticated_request_returns_401(self, client):
        # No auth override — get_current_user should raise 401
        resp = client.get("/conversations/any-id")
        assert resp.status_code == 401
