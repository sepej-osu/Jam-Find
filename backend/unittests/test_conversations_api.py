from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth import get_current_user
from routers.conversations import router as conversations_router
from services import conversation_service


TEST_USER_ID = "user-alice"
OTHER_USER_ID = "user-bob"
THIRD_USER_ID = "user-carol"
CONVERSATION_ID = "conv_123"


@pytest.fixture()
def app():
    test_app = FastAPI()
    test_app.include_router(conversations_router, prefix="/api/v1")
    test_app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    return test_app


@pytest.fixture()
def client(app):
    return TestClient(app)


def _make_db():
    fake_db = MagicMock()
    profiles_collection = MagicMock()
    conversations_collection = MagicMock()

    def collection_side_effect(name):
        if name == "profiles":
            return profiles_collection
        if name == "conversations":
            return conversations_collection
        raise KeyError(name)

    fake_db.collection.side_effect = collection_side_effect
    return fake_db, profiles_collection, conversations_collection


def _make_profile_doc(first="Alice", last="Smith", pic=None, exists=True):
    doc = MagicMock()
    doc.exists = exists
    doc.to_dict.return_value = {
        "firstName": first,
        "lastName": last,
        "profilePicUrl": pic,
    }
    return doc


def _make_profile_ref(first="Alice", last="Smith", pic=None, exists=True):
    ref = MagicMock()
    ref.get.return_value = _make_profile_doc(first=first, last=last, pic=pic, exists=exists)
    return ref


def _make_conversation_doc(conversation_id, data, exists=True):
    doc = MagicMock(id=conversation_id)
    doc.exists = exists
    doc.to_dict.return_value = data
    return doc


def _first_value(body, *keys):
    for key in keys:
        if key in body:
            return body[key]
    raise AssertionError(f"None of the keys {keys} were present in {body}")


def _conversation_payload(
    participant_ids,
    *,
    created_at=None,
    updated_at=None,
    participant_snapshots=None,
    last_message_preview=None,
    last_message_sent_at=None,
    last_message_sender_id=None,
    extra=None,
):
    now = datetime.now(timezone.utc)
    payload = {
        "createdAt": created_at or now,
        "updatedAt": updated_at or now,
        "participant_ids": participant_ids,
        "last_message_preview": last_message_preview,
        "last_message_sent_at": last_message_sent_at,
        "last_message_sender_id": last_message_sender_id,
        "participant_snapshots": participant_snapshots
        or {
            participant_ids[0]: {
                "firstName": "Alice",
                "lastName": "Smith",
                "profilePicUrl": None,
            },
            participant_ids[1]: {
                "firstName": "Bob",
                "lastName": "Jones",
                "profilePicUrl": None,
            },
        },
    }
    if extra:
        payload.update(extra)
    return payload


def test_create_conversation_returns_201_and_stores_snapshots(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(first="Alice", last="Smith"),
        OTHER_USER_ID: _make_profile_ref(first="Bob", last="Jones"),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]
    conversations_collection.where.return_value.stream.return_value = []

    new_conversation_ref = MagicMock(id=CONVERSATION_ID)
    conversations_collection.document.return_value = new_conversation_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.post(
        "/api/v1/conversations",
        json={"recipient_id": OTHER_USER_ID},
    )

    assert response.status_code == 201
    body = response.json()
    assert set(_first_value(body, "participantIds", "participant_ids")) == {TEST_USER_ID, OTHER_USER_ID}
    assert _first_value(body, "conversationId", "conversation_id") == CONVERSATION_ID
    assert _first_value(body, "lastMessagePreview", "last_message_preview") is None

    snapshots = _first_value(body, "participantSnapshots", "participant_snapshots")
    assert snapshots[TEST_USER_ID]["firstName"] == "Alice"
    assert snapshots[OTHER_USER_ID]["firstName"] == "Bob"
    new_conversation_ref.set.assert_called_once()


def test_create_conversation_returns_existing_if_duplicate(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(first="Alice", last="Smith"),
        OTHER_USER_ID: _make_profile_ref(first="Bob", last="Jones"),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]

    existing_ref = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID]),
    )
    conversations_collection.where.return_value.stream.return_value = [existing_ref]

    new_conversation_ref = MagicMock(id="new-conversation")
    conversations_collection.document.return_value = new_conversation_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.post(
        "/api/v1/conversations",
        json={"recipient_id": OTHER_USER_ID},
    )

    assert response.status_code == 201
    assert _first_value(response.json(), "conversationId", "conversation_id") == CONVERSATION_ID
    new_conversation_ref.set.assert_not_called()


def test_create_conversation_with_self_returns_400(client):
    response = client.post(
        "/api/v1/conversations",
        json={"recipient_id": TEST_USER_ID},
    )

    assert response.status_code == 400
    assert "yourself" in response.json()["detail"].lower()


def test_create_conversation_missing_recipient_id_returns_422(client):
    response = client.post("/api/v1/conversations", json={})

    assert response.status_code == 422


def test_create_conversation_current_user_profile_missing_returns_404(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(exists=False),
        OTHER_USER_ID: _make_profile_ref(first="Bob", last="Jones"),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]
    conversations_collection.where.return_value.stream.return_value = []

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.post(
        "/api/v1/conversations",
        json={"recipient_id": OTHER_USER_ID},
    )

    assert response.status_code == 404
    assert "current user" in response.json()["detail"].lower()


def test_create_conversation_recipient_profile_missing_returns_404(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(first="Alice", last="Smith"),
        OTHER_USER_ID: _make_profile_ref(exists=False),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]
    conversations_collection.where.return_value.stream.return_value = []

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.post(
        "/api/v1/conversations",
        json={"recipient_id": OTHER_USER_ID},
    )

    assert response.status_code == 404
    assert "recipient" in response.json()["detail"].lower()


def test_list_conversations_returns_empty_list_when_none_exist(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    conversations_collection.where.return_value.stream.return_value = []

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations")

    assert response.status_code == 200
    body = response.json()
    assert _first_value(body, "conversations") == []
    assert _first_value(body, "nextPageToken", "next_page_token") is None
    conversations_collection.where.assert_called_once()


def test_list_conversations_returns_only_current_users_conversations(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    current_user_convo = _make_conversation_doc(
        "conv-current",
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID]),
    )
    conversations_collection.where.return_value.stream.return_value = [current_user_convo]

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations")

    assert response.status_code == 200
    convos = _first_value(response.json(), "conversations")
    assert len(convos) == 1
    assert set(_first_value(convos[0], "participantIds", "participant_ids")) == {TEST_USER_ID, OTHER_USER_ID}


def test_list_conversations_sorts_by_updated_at_descending(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    now = datetime.now(timezone.utc)
    older = _make_conversation_doc(
        "older",
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID], updated_at=now - timedelta(hours=2)),
    )
    newer = _make_conversation_doc(
        "newer",
        _conversation_payload([TEST_USER_ID, THIRD_USER_ID], updated_at=now - timedelta(minutes=5)),
    )
    conversations_collection.where.return_value.stream.return_value = [older, newer]

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations")

    assert response.status_code == 200
    ids = [
        _first_value(convo, "conversationId", "conversation_id")
        for convo in _first_value(response.json(), "conversations")
    ]
    assert ids == ["newer", "older"]


def test_list_conversations_default_limit_is_ten(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    docs = []
    for index in range(12):
        docs.append(
            _make_conversation_doc(
                f"conv-{index}",
                _conversation_payload([TEST_USER_ID, f"user-{index}"], updated_at=datetime.now(timezone.utc)),
            )
        )
    conversations_collection.where.return_value.stream.return_value = docs

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations")

    assert response.status_code == 200
    body = response.json()
    assert len(_first_value(body, "conversations")) == 10
    assert _first_value(body, "nextPageToken", "next_page_token") is not None


def test_list_conversations_custom_limit_respected(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    docs = [
        _make_conversation_doc(
            f"conv-{index}",
            _conversation_payload([TEST_USER_ID, f"user-{index}"], updated_at=datetime.now(timezone.utc)),
        )
        for index in range(5)
    ]
    conversations_collection.where.return_value.stream.return_value = docs

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations?limit=3")

    assert response.status_code == 200
    assert len(_first_value(response.json(), "conversations")) == 3


def test_list_conversations_limit_below_one_returns_422(client):
    response = client.get("/api/v1/conversations?limit=0")

    assert response.status_code == 422


def test_list_conversations_pagination_returns_next_page(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    now = datetime.now(timezone.utc)
    docs = []
    ids = []
    for index in range(4):
        convo_id = f"conv-{index}"
        ids.append(convo_id)
        docs.append(
            _make_conversation_doc(
                convo_id,
                _conversation_payload([TEST_USER_ID, f"user-{index}"], updated_at=now - timedelta(minutes=index)),
            )
        )
    conversations_collection.where.return_value.stream.return_value = docs

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    page1 = client.get("/api/v1/conversations?limit=2").json()
    token = _first_value(page1, "nextPageToken", "next_page_token")
    page2 = client.get(f"/api/v1/conversations?limit=2&last_doc_id={token}").json()

    page1_ids = {
        _first_value(convo, "conversationId", "conversation_id")
        for convo in _first_value(page1, "conversations")
    }
    page2_ids = {
        _first_value(convo, "conversationId", "conversation_id")
        for convo in _first_value(page2, "conversations")
    }

    assert page1_ids.isdisjoint(page2_ids)
    assert page1_ids | page2_ids == set(ids)


def test_list_conversations_last_page_has_no_next_page_token(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    docs = [
        _make_conversation_doc(
            f"conv-{index}",
            _conversation_payload([TEST_USER_ID, f"user-{index}"], updated_at=datetime.now(timezone.utc)),
        )
        for index in range(2)
    ]
    conversations_collection.where.return_value.stream.return_value = docs

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get("/api/v1/conversations?limit=10")

    assert response.status_code == 200
    assert _first_value(response.json(), "nextPageToken", "next_page_token") is None


def test_get_conversation_returns_200_for_participant(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID]),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 200
    assert _first_value(response.json(), "conversationId", "conversation_id") == CONVERSATION_ID


def test_get_conversation_non_participant_returns_403(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([OTHER_USER_ID, THIRD_USER_ID]),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 403
    assert "participant" in response.json()["detail"].lower()


def test_get_conversation_missing_returns_404(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(CONVERSATION_ID, {}, exists=False)
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 404


def test_unauthenticated_request_returns_401(app):
    app.dependency_overrides.pop(get_current_user, None)

    with TestClient(app) as anonymous_client:
        response = anonymous_client.get(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 401


def test_delete_conversation_participant_can_delete(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID]),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.delete(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 204
    convo_ref.update.assert_called_once()
    fake_db.recursive_delete.assert_called_once_with(convo_ref)


def test_delete_conversation_non_participant_returns_403(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([OTHER_USER_ID, THIRD_USER_ID]),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.delete(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 403


def test_delete_conversation_missing_returns_404(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(CONVERSATION_ID, {}, exists=False)
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.delete(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 404


def test_delete_conversation_already_deleting_returns_409(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID], extra={"is_deleting": True}),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.delete(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 409
    assert "delet" in response.json()["detail"].lower()


def test_delete_conversation_route_propagates_service_error(client, monkeypatch):
    delete_stub = AsyncMock(
        side_effect=HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation",
        )
    )
    monkeypatch.setattr(conversation_service, "delete_conversation", delete_stub)

    response = client.delete(f"/api/v1/conversations/{CONVERSATION_ID}")

    assert response.status_code == 403
    delete_stub.assert_awaited_once_with(CONVERSATION_ID, TEST_USER_ID)


def test_sync_snapshots_updates_profiles(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()
    convo_ref = MagicMock()
    
    # Original doc has outdated snapshot for OTHER_USER_ID
    original_doc = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID]),
    )
    # Updated doc has the new snapshot data that should be in the DB after the update
    updated_doc = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload(
            [TEST_USER_ID, OTHER_USER_ID],
            
            participant_snapshots={
                TEST_USER_ID: {
                    "firstName": "Alice",
                    "lastName": "Smith",
                    "profilePicUrl": None,
                },
                OTHER_USER_ID: {
                    "firstName": "Robert",
                    "lastName": "Jones",
                    "profilePicUrl": None,
                },
            },
        ),
    )
    
    convo_ref.get.side_effect = [original_doc, updated_doc]
    conversations_collection.document.return_value = convo_ref

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(first="Alice", last="Smith"),
        OTHER_USER_ID: _make_profile_ref(first="Robert", last="Jones"),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]
    
    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.patch(f"/api/v1/conversations/{CONVERSATION_ID}/sync-snapshots")

    assert response.status_code == 200
    snapshots = _first_value(response.json(), "participantSnapshots", "participant_snapshots")
    assert snapshots[OTHER_USER_ID]["firstName"] == "Robert"

    # Verify that the conversation document was updated with the new snapshots
    convo_ref.update.assert_called_once()


def test_sync_snapshots_non_participant_returns_403(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([OTHER_USER_ID, THIRD_USER_ID]),
    )
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.patch(f"/api/v1/conversations/{CONVERSATION_ID}/sync-snapshots")

    assert response.status_code == 403


def test_sync_snapshots_missing_returns_404(client, monkeypatch):
    fake_db, _, conversations_collection = _make_db()
    convo_ref = MagicMock()
    convo_ref.get.return_value = _make_conversation_doc(CONVERSATION_ID, {}, exists=False)
    conversations_collection.document.return_value = convo_ref

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.patch(f"/api/v1/conversations/{CONVERSATION_ID}/sync-snapshots")

    assert response.status_code == 404


def test_sync_snapshots_updates_updated_at_timestamp(client, monkeypatch):
    fake_db, profiles_collection, conversations_collection = _make_db()
    old_time = datetime.now(timezone.utc) - timedelta(days=1)
    convo_ref = MagicMock()
    original_doc = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload([TEST_USER_ID, OTHER_USER_ID], updated_at=old_time),
    )
    new_time = old_time + timedelta(seconds=1)
    updated_doc = _make_conversation_doc(
        CONVERSATION_ID,
        _conversation_payload(
            [TEST_USER_ID, OTHER_USER_ID],
            updated_at=new_time,
            participant_snapshots={
                TEST_USER_ID: {
                    "firstName": "Alice",
                    "lastName": "Smith",
                    "profilePicUrl": None,
                },
                OTHER_USER_ID: {
                    "firstName": "Bob",
                    "lastName": "Jones",
                    "profilePicUrl": None,
                },
            },
        ),
    )
    convo_ref.get.side_effect = [original_doc, updated_doc]
    conversations_collection.document.return_value = convo_ref

    profile_refs = {
        TEST_USER_ID: _make_profile_ref(first="Alice", last="Smith"),
        OTHER_USER_ID: _make_profile_ref(first="Bob", last="Jones"),
    }
    profiles_collection.document.side_effect = lambda user_id: profile_refs[user_id]

    monkeypatch.setattr(conversation_service, "get_db", lambda: fake_db)

    response = client.patch(f"/api/v1/conversations/{CONVERSATION_ID}/sync-snapshots")

    assert response.status_code == 200
    updated_at = _first_value(response.json(), "updatedAt", "updated_at")
    assert datetime.fromisoformat(updated_at) > old_time
