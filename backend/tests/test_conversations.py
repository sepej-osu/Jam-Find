import asyncio
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Set working directory to backend folder
backend_dir = Path(__file__).parent.parent
os.chdir(backend_dir)

# Clear the settings cache BEFORE importing main
from config import get_settings
get_settings.cache_clear()
settings = get_settings()

from auth import get_current_user
from main import app
from models import MessageCreate
from services import conversation_service
from services import message_service


@pytest.fixture
def client():
    """Fixture to provide a test client for FastAPI app with overridden dependencies."""
    app.dependency_overrides[get_current_user] = lambda: settings.DEV_USER_ID
    with patch("main.initialize_firebase", return_value=None):
        with TestClient(app) as test_client:
            yield test_client
    app.dependency_overrides.clear()


def test_delete_conversation_route_propagates_service_error(client):
    """Test that the delete conversation route correctly propagates errors from the service layer."""
    with patch("routers.conversations.conversation_service.delete_conversation", new_callable=AsyncMock) as mock_delete:
        mock_delete.side_effect = HTTPException(
            status_code=403,
            detail="You are not a participant in this conversation"
        )

        response = client.delete("/api/v1/conversations/convo-123")

        assert response.status_code == 403
        mock_delete.assert_awaited_once_with("convo-123", settings.DEV_USER_ID)


def test_delete_conversation_service_requires_participant():
    db = MagicMock()
    convo_ref = MagicMock()
    convo_doc = MagicMock()
    convo_doc.exists = True
    convo_doc.to_dict.return_value = {"participant_ids": ["other-user"]}
    convo_ref.get.return_value = convo_doc
    db.collection.return_value.document.return_value = convo_ref

    with patch("services.conversation_service.get_db", return_value=db):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(conversation_service.delete_conversation("convo-123", settings.DEV_USER_ID))

    assert exc.value.status_code == 403
    db.recursive_delete.assert_not_called()


def test_delete_conversation_service_marks_deleting_before_recursive_delete():
    db = MagicMock()
    convo_ref = MagicMock()
    convo_doc = MagicMock()
    convo_doc.exists = True
    convo_doc.to_dict.return_value = {"participant_ids": [settings.DEV_USER_ID, "other-user"]}
    convo_ref.get.return_value = convo_doc
    db.collection.return_value.document.return_value = convo_ref

    operations = []
    convo_ref.update.side_effect = lambda *_, **__: operations.append("update")
    db.recursive_delete.side_effect = lambda *_, **__: operations.append("recursive_delete")

    with patch("services.conversation_service.get_db", return_value=db):
        asyncio.run(conversation_service.delete_conversation("convo-123", settings.DEV_USER_ID))

    assert operations == ["update", "recursive_delete"]
    update_payload = convo_ref.update.call_args.args[0]
    assert update_payload["is_deleting"] is True
    assert "updatedAt" in update_payload
    db.recursive_delete.assert_called_once_with(convo_ref)


def test_send_message_rejects_when_is_deleting_true():
    db = MagicMock()
    transaction = MagicMock()
    convo_ref = MagicMock()
    convo_doc = MagicMock()
    message_ref = MagicMock()
    message_ref.id = "message-123"

    convo_doc.exists = True
    convo_doc.to_dict.return_value = {
        "participant_ids": [settings.DEV_USER_ID],
        "is_deleting": True
    }
    convo_ref.get.return_value = convo_doc
    convo_ref.collection.return_value.document.return_value = message_ref
    db.collection.return_value.document.return_value = convo_ref
    db.transaction.return_value = transaction

    with patch("services.message_service.get_db", return_value=db):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                message_service.send_message(
                    "convo-123",
                    settings.DEV_USER_ID,
                    MessageCreate(content="hello")
                )
            )

    assert exc.value.status_code == 409
    transaction.set.assert_not_called()
    transaction.update.assert_not_called()
