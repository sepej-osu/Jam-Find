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
        "first_name": profile_data.get("firstName"),
        "last_name": profile_data.get("lastName"),
        "profile_pic_url": profile_data.get("profilePicUrl")
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
            current_user_id: _build_profile_snapshot(current_user_profile_doc.to_dict()),
            recipient_id: _build_profile_snapshot(recipient_profile_doc.to_dict())
        }
        
        # Check if conversation already exists between these two users
        # we search for any conversation that contains the current user,
        # then check if the recipient is also a participant.
        existing_convos = db.collection(COLLECTION_NAME)\
                    .where(filter=FieldFilter("participant_ids", "array_contains", current_user_id)).stream()
        
        for doc in existing_convos:
            data = doc.to_dict()
            if recipient_id in data.get("participant_ids", []):
                # Conversation already exists, return it
                return ConversationResponse(**data, conversation_id=doc.id)
            
        # No existing conversation, create a new one
        conversation_data = {
            "created_at": now,
            "updated_at": now,
            "participant_ids": [current_user_id, recipient_id],
            "last_message_preview": None,
            "last_message_sent_at": None,
            "last_message_sender_id": None,
            "participant_snapshots": participant_snapshots
        }
        # Create new conversation document with auto-generated ID
        new_conversation_ref = db.collection(COLLECTION_NAME).document()
        new_conversation_ref.set(conversation_data)
        
        # Build response model including the new conversation ID from the document reference
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
    """List conversations for the current user with pagination."""
    try:
        db = get_db()
        
        # We fetch all conversations that include the current user, then sort and paginate in memory.
        docs = db.collection(COLLECTION_NAME)\
            .where(filter=FieldFilter("participant_ids", "array_contains", current_user_id))\
            .stream()

        all_conversations = []
        # we convert each document to a ConversationResponse model
        for doc in docs:
            data = doc.to_dict()
            all_conversations.append(ConversationResponse(**data, conversation_id=doc.id))
       # Then we sort the conversations by updated_at timestamp in descending order
        all_conversations.sort(key=lambda convo: convo.updated_at, reverse=True)

       # Here we implement pagination by finding the index of the last document from the previous page.
       # If last_doc_id is provided, we find its index and start the next page from the following document.
       # otherwise we start from the top of the list.
        start_index = 0
        if last_doc_id:
            for index, convo in enumerate(all_conversations):
                if convo.conversation_id == last_doc_id:
                    start_index = index + 1
                    break

        # we then take the slice of conversations for the current page based on the limit.
        # we fetch one extra document than the limit to determine if there is a next page.
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
    Used internally by message routes to validate access before letting users interact
    with messages. Raises 404 if not found, 403 if user is not a participant.
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
    