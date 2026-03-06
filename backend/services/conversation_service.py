from models import ConversationCreate, ConversationResponse, PaginatedConversationsResponse
from firebase_config import get_db
from datetime import datetime, timezone
from fastapi import HTTPException, status
from typing import Optional
from google.cloud import firestore

COLLECTION_NAME = "conversations"


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

        # check if recipient has a profile in the database
        if db.collection("profiles").document(recipient_id).get().exists is False:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user not found")
        
                # Check if conversation already exists between these two users
        existing_convos = db.collection(COLLECTION_NAME)\
            .where("participant_ids", "array-contains", current_user_id).stream()
        
        for doc in existing_convos:
            data = doc.to_dict()
            if recipient_id in data.get("participant_ids", []):
                # Conversation already exists, return it
                return ConversationResponse(**data, conversation_id=doc.id)
        
        conversation_data = {
            "created_at": now,
            "updated_at": now,
            "participant_ids": [current_user_id, recipient_id],
            "last_message_preview": None,
            "last_message_sent_at": None,
            "last_message_sender_id": None
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
        
        query = db.collection(COLLECTION_NAME)\
            .where("participant_ids", "array-contains", current_user_id)\
            .order_by("updated_at", direction=firestore.Query.DESCENDING)
        
        if last_doc_id:
            last_doc = db.collection(COLLECTION_NAME).document(last_doc_id).get()
            query = query.start_after(last_doc)
        
        docs = query.limit(limit + 1).stream()
        conversations = []
        
        for doc in docs:
            data = doc.to_dict()
            conversations.append(ConversationResponse(**data, conversation_id=doc.id))
        
        # Handle pagination
        next_page_token = None
        if len(conversations) > limit:
            conversations = conversations[:limit]
            next_page_token = conversations[-1].conversation_id
        
        return PaginatedConversationsResponse(conversations=conversations, next_page_token=next_page_token)
        
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
    