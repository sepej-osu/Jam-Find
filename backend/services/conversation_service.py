from models import ConversationCreate, ConversationResponse, PaginatedConversationsResponse
from firebase_config import get_db
from datetime import datetime, timezone
from fastapi import HTTPException, status
from typing import Optional
from google.cloud.firestore_v1.base_query import FieldFilter

COLLECTION_NAME = "conversations"


def _build_profile_snapshot(profile_data: dict) -> dict:
    """Normalize profile fields for denormalized conversation snapshots."""
    return {
        "first_name": profile_data.get("firstName") or profile_data.get("first_name"),
        "last_name": profile_data.get("lastName") or profile_data.get("last_name"),
        "profile_pic_url": profile_data.get("profilePicUrl") or profile_data.get("profile_pic_url")
    }


def validate_participant(recipient_id: str, current_user_id: str):
    """Helper function to validate that a user ID is unique."""
    if current_user_id == recipient_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create a conversation with yourself")


async def create_conversation(conversation: ConversationCreate, current_user_id: str) -> ConversationResponse:
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        recipient_id = conversation.recipient_id
        
        validate_participant(recipient_id, current_user_id)

        current_user_profile_doc = db.collection("profiles").document(current_user_id).get()
        if current_user_profile_doc.exists is False:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current user profile not found")

        recipient_profile_doc = db.collection("profiles").document(recipient_id).get()
        if recipient_profile_doc.exists is False:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user not found")

        participant_snapshots = {
            current_user_id: _build_profile_snapshot(current_user_profile_doc.to_dict() or {}),
            recipient_id: _build_profile_snapshot(recipient_profile_doc.to_dict() or {})
        }
        
                # Check if conversation already exists between these two users
        existing_convos = db.collection(COLLECTION_NAME)\
                    .where(filter=FieldFilter("participant_ids", "array_contains", current_user_id)).stream()
        
        for doc in existing_convos:
            data = doc.to_dict()
            if recipient_id in data.get("participant_ids", []):
                if not data.get("participant_snapshots"):
                    data["participant_snapshots"] = participant_snapshots
                    db.collection(COLLECTION_NAME).document(doc.id).update({
                        "participant_snapshots": participant_snapshots,
                        "updated_at": now
                    })
                # Conversation already exists, return it
                return ConversationResponse(**data, conversation_id=doc.id)
        
        conversation_data = {
            "created_at": now,
            "updated_at": now,
            "participant_ids": [current_user_id, recipient_id],
            "last_message_preview": None,
            "last_message_sent_at": None,
            "last_message_sender_id": None,
            "participant_snapshots": participant_snapshots
        }
        new_conversation_ref = db.collection(COLLECTION_NAME).document()
        new_conversation_ref.set(conversation_data)
        
        # Build response with conversation_id
        conversation_data["conversation_id"] = new_conversation_ref.id
        return ConversationResponse(**conversation_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def list_conversations(
    current_user_id: str,             
    limit: int = 10, 
    last_doc_id: Optional[str] = None) -> PaginatedConversationsResponse:

    try:
        db = get_db()
        
        # Keep query index-free for MVP stability: fetch participant matches,
        # then sort/paginate in Python by updated_at descending.
        docs = db.collection(COLLECTION_NAME)\
            .where(filter=FieldFilter("participant_ids", "array_contains", current_user_id))\
            .stream()

        all_conversations = []
        for doc in docs:
            data = doc.to_dict()
            all_conversations.append(ConversationResponse(**data, conversation_id=doc.id))

        all_conversations.sort(
            key=lambda convo: convo.updated_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )

        start_index = 0
        if last_doc_id:
            for index, convo in enumerate(all_conversations):
                if convo.conversation_id == last_doc_id:
                    start_index = index + 1
                    break

        page = all_conversations[start_index:start_index + limit + 1]
        next_page_token = None
        if len(page) > limit:
            next_page_token = page[limit - 1].conversation_id
            page = page[:limit]
        
        return PaginatedConversationsResponse(conversations=page, next_page_token=next_page_token)
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def get_conversation_by_id(conversation_id: str, current_user_id: str) -> ConversationResponse:
    """
    Fetch a conversation and verify the current user is a participant.
    Used internally by message routes to validate access before operating on messages.
    Raises 404 if not found, 403 if user is not a participant.
    """
    try:
        db = get_db()
        doc = db.collection(COLLECTION_NAME).document(conversation_id).get()
        
        if not doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
        data = doc.to_dict()
        
        if current_user_id not in data.get("participant_ids", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this conversation")
        
        return ConversationResponse(**data, conversation_id=doc.id)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    