from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth import get_current_user
from routers.messages import router as messages_router
from services import message_service



TEST_USER_ID = "user-sender"
OTHER_USER_ID = "user-recipient"
CONVERSATION_ID = "conv_123"


@pytest.fixture()
def app():
    test_app = FastAPI()
    test_app.include_router(messages_router, prefix="/api/v1")
    test_app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    return test_app


@pytest.fixture()
def client(app):
    return TestClient(app)


def _make_send_message_db(participant_ids, exists=True):
    fake_db = MagicMock()
    conversation_ref = MagicMock()
    message_collection = MagicMock()
    message_ref = MagicMock(id="msg_123")
    transaction = MagicMock()

    fake_db.collection.return_value.document.return_value = conversation_ref
    conversation_ref.collection.return_value = message_collection
    message_collection.document.return_value = message_ref
    fake_db.transaction.return_value = transaction

    conversation_doc = MagicMock()
    conversation_doc.exists = exists
    conversation_doc.to_dict.return_value = {
        "participant_ids": participant_ids,
        "is_deleting": False,
    }
    conversation_ref.get.return_value = conversation_doc

    return fake_db, conversation_ref, transaction, message_ref


def _make_list_messages_db(message_docs):
    fake_db = MagicMock()
    conversation_ref = MagicMock()
    message_collection = MagicMock()
    query = MagicMock()

    fake_db.collection.return_value.document.return_value = conversation_ref
    conversation_ref.collection.return_value = message_collection
    message_collection.order_by.return_value = query
    query.limit.return_value = query
    query.stream.return_value = message_docs

    return fake_db, conversation_ref, message_collection, query


def test_send_message_returns_201_and_updates_conversation(client, monkeypatch):
    fake_db, conversation_ref, transaction, message_ref = _make_send_message_db(
        [TEST_USER_ID, OTHER_USER_ID]
    )
    monkeypatch.setattr(message_service, "get_db", lambda: fake_db)
    monkeypatch.setattr(message_service.firestore, "transactional", lambda fn: fn)

    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": "Ready to jam this weekend?"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["messageId"] == message_ref.id
    assert body["conversationId"] == CONVERSATION_ID
    assert body["senderId"] == TEST_USER_ID
    assert body["content"] == "Ready to jam this weekend?"
    assert body["createdAt"]

    transaction.set.assert_called_once()
    update_args = transaction.update.call_args.args[1]
    assert transaction.update.call_count == 1
    assert transaction.update.call_args.args[0] == conversation_ref
    assert update_args["last_message_preview"] == "Ready to jam this weekend?"
    assert update_args["last_message_sender_id"] == TEST_USER_ID
    assert update_args["updatedAt"] == update_args["last_message_sent_at"]


def test_send_message_rejects_non_participant_with_403(client, monkeypatch):
    fake_db, _, transaction, _ = _make_send_message_db([OTHER_USER_ID])
    monkeypatch.setattr(message_service, "get_db", lambda: fake_db)
    monkeypatch.setattr(message_service.firestore, "transactional", lambda fn: fn)

    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": "Can I join?"},
    )

    assert response.status_code == 403
    assert "participant" in response.json()["detail"].lower()
    transaction.set.assert_not_called()
    transaction.update.assert_not_called()


def test_send_message_rejects_empty_content_with_422(client):
    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": ""},
    )

    assert response.status_code == 422


def test_list_messages_returns_paginated_results(client, monkeypatch):
    docs = [
        MagicMock(
            id="msg_2",
            to_dict=MagicMock(
                return_value={
                    "content": "Second message",
                    "sender_id": OTHER_USER_ID,
                    "created_at": datetime(2026, 1, 1, 12, 1, tzinfo=timezone.utc),
                }
            ),
        ),
        MagicMock(
            id="msg_1",
            to_dict=MagicMock(
                return_value={
                    "content": "First message",
                    "sender_id": TEST_USER_ID,
                    "created_at": datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
                }
            ),
        ),
    ]
    fake_db, _, _, query = _make_list_messages_db(docs)
    conversation_service_stub = SimpleNamespace(
        get_conversation_by_id=AsyncMock(return_value={"conversation_id": CONVERSATION_ID})
    )

    monkeypatch.setattr(message_service, "get_db", lambda: fake_db)
    monkeypatch.setattr(message_service, "conversation_service", conversation_service_stub, raising=False)

    response = client.get(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        params={"limit": 1},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["messages"]) == 1
    assert body["messages"][0]["messageId"] == "msg_2"
    assert body["messages"][0]["content"] == "Second message"
    assert body["nextPageToken"] == "msg_2"
    conversation_service_stub.get_conversation_by_id.assert_awaited_once_with(
        CONVERSATION_ID,
        TEST_USER_ID,
    )
    query.limit.assert_called_once_with(2)


def test_list_messages_rejects_invalid_limit_with_422(client):
    response = client.get(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        params={"limit": 0},
    )

    assert response.status_code == 422


def test_list_messages_propagates_not_found_from_conversation_lookup(client, monkeypatch):
    conversation_service_stub = SimpleNamespace(
        get_conversation_by_id=AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Conversation not found")
        )
    )
    monkeypatch.setattr(message_service, "conversation_service", conversation_service_stub, raising=False)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}/messages")

    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found"


def test_send_message_rejects_missing_content_field_with_422(client):
    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={},
    )

    assert response.status_code == 422


def test_send_message_rejects_too_long_content_with_422(client):
    long_content = "x" * 2001
    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": long_content},
    )

    assert response.status_code == 422


def test_send_message_rejects_when_conversation_is_being_deleted(client, monkeypatch):
    fake_db, conversation_ref, transaction, message_ref = _make_send_message_db(
        [TEST_USER_ID, OTHER_USER_ID]
    )
    # set the conversation document to indicate deletion in progress
    conversation_ref.get.return_value.to_dict.return_value = {
        "participant_ids": [TEST_USER_ID, OTHER_USER_ID],
        "is_deleting": True,
    }

    monkeypatch.setattr(message_service, "get_db", lambda: fake_db)
    monkeypatch.setattr(message_service.firestore, "transactional", lambda fn: fn)

    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": "Should be rejected"},
    )

    assert response.status_code == 409
    assert "delet" in response.json()["detail"].lower()


def test_send_message_propagates_db_errors_as_500(client, monkeypatch):
    def bad_db():
        raise Exception("boom")

    monkeypatch.setattr(message_service, "get_db", bad_db)

    response = client.post(
        f"/api/v1/conversations/{CONVERSATION_ID}/messages",
        json={"content": "Hello"},
    )

    assert response.status_code == 500


def test_list_messages_returns_empty_list_when_no_messages(client, monkeypatch):
    docs = []
    fake_db, _, _, query = _make_list_messages_db(docs)
    conversation_service_stub = SimpleNamespace(
        get_conversation_by_id=AsyncMock(return_value={"conversation_id": CONVERSATION_ID})
    )

    monkeypatch.setattr(message_service, "get_db", lambda: fake_db)
    monkeypatch.setattr(message_service, "conversation_service", conversation_service_stub, raising=False)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}/messages")

    assert response.status_code == 200
    body = response.json()
    assert body["messages"] == []
    assert body["nextPageToken"] is None


def test_list_messages_propagates_db_errors_as_500(client, monkeypatch):
    def bad_db():
        raise Exception("boom")

    monkeypatch.setattr(message_service, "get_db", bad_db)

    response = client.get(f"/api/v1/conversations/{CONVERSATION_ID}/messages")

    assert response.status_code == 500