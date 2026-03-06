from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from models import (
    ConversationBase,
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)


def test_message_create_valid_content() -> None:
    payload = MessageCreate(content="Hey, want to jam this weekend?")
    assert payload.content == "Hey, want to jam this weekend?"


def test_message_create_rejects_empty_content() -> None:
    with pytest.raises(ValidationError):
        MessageCreate(content="")


def test_message_create_rejects_too_long_content() -> None:
    with pytest.raises(ValidationError):
        MessageCreate(content="x" * 2001)


def test_message_response_accepts_alias_fields() -> None:
    message = MessageResponse(
        messageId="msg_123",
        conversationId="conv_1",
        senderId="uid_sender",
        content="See you there",
        createdAt="2026-03-05T12:00:00Z",
    )

    assert message.message_id == "msg_123"
    assert message.conversation_id == "conv_1"
    assert message.sender_id == "uid_sender"
    assert message.content == "See you there"


def test_message_response_accepts_python_field_names() -> None:
    created_at = datetime.now(timezone.utc)
    message = MessageResponse(
        message_id="msg_456",
        conversation_id="conv_2",
        sender_id="uid_sender",
        content="Python field names work too",
        created_at=created_at,
    )

    assert message.created_at == created_at


def test_conversation_base_accepts_two_unique_participants_and_trims() -> None:
    conversation = ConversationBase(participantIds=[" uid_a ", "uid_b"])
    assert conversation.participant_ids == ["uid_a", "uid_b"]


def test_conversation_base_rejects_not_exactly_two_participants() -> None:
    with pytest.raises(ValidationError):
        ConversationBase(participantIds=["uid_a"])


def test_conversation_base_rejects_duplicate_participants() -> None:
    with pytest.raises(ValidationError):
        ConversationBase(participantIds=["uid_a", "uid_a"])


def test_conversation_base_rejects_empty_participant_values() -> None:
    with pytest.raises(ValidationError):
        ConversationBase(participantIds=["uid_a", "   "])


def test_conversation_create_requires_recipient_and_participants() -> None:
    payload = ConversationCreate(
        recipientId="uid_b",
        participantIds=["uid_a", "uid_b"],
    )

    assert payload.recipient_id == "uid_b"
    assert payload.participant_ids == ["uid_a", "uid_b"]


def test_conversation_response_accepts_alias_fields() -> None:
    response = ConversationResponse(
        conversationId="conv_1",
        participantIds=["uid_a", "uid_b"],
        createdAt="2026-03-05T12:00:00Z",
        updatedAt="2026-03-05T12:01:00Z",
        lastMessagePreview="Cool, see you then",
        lastMessageSentAt="2026-03-05T12:01:00Z",
        lastMessageSenderId="uid_a",
    )

    assert response.conversation_id == "conv_1"
    assert response.last_message_preview == "Cool, see you then"
    assert response.last_message_sender_id == "uid_a"
