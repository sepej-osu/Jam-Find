from models import MessageCreate, MessageResponse
from firebase_config import get_db
from datetime import datetime, timezone
from fastapi import HTTPException, status
from typing import Optional
from google.cloud import firestore
from services import conversation_service

async def send_message(conversation_id: str, sender_id: str, message_create: MessageCreate) -> MessageResponse:
    """
    Send a message to a conversation.
    Verifies conversation exists and user is a participant.
    Updates conversation's last_message fields.
    """
    try:
        # Verify conversation exists and user is participant
        await conversation_service.get_conversation_by_id(conversation_id, sender_id)
        
        db = get_db()
        now = datetime.now(timezone.utc)
        
        # Write message data to a temporary variable before writing to Firestore.
        message_data = {
            "sender_id": sender_id,
            "content": message_create.content,
            "created_at": now
        }
        
        # create the document reference for the new message in the subcollection
        message_ref = db.collection("conversations").document(conversation_id)\
            .collection("messages").document()
        # set the data for the new message document
        message_ref.set(message_data)
        
        # Update conversation's last_message fields 
        db.collection("conversations").document(conversation_id).update({
            "last_message_preview": message_create.content[:100],
            "last_message_sent_at": now,
            "last_message_sender_id": sender_id,
            "updated_at": now
        })
        
        return MessageResponse(
            message_id=message_ref.id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=message_create.content,
            created_at=now
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def list_messages(conversation_id: str, current_user_id: str, limit: int = 20, last_doc_id: Optional[str] = None):
    """
    List messages from a conversation with cursor pagination.
    Verifies user is a participant in the conversation.
    """
    try:
        # Verify conversation exists and user is participant
        await conversation_service.get_conversation_by_id(conversation_id, current_user_id)
        
        db = get_db()
        # We query the messages subcollection for the conversation, ordering by created_at descending for pagination.
        query = db.collection("conversations").document(conversation_id)\
            .collection("messages")\
            .order_by("created_at", direction=firestore.Query.DESCENDING)
        # If last_doc_id is provided, we use it as the starting point for the next page of results.
        if last_doc_id:
            last_doc = db.collection("conversations").document(conversation_id)\
                .collection("messages").document(last_doc_id).get()
            query = query.start_after(last_doc)
        # again, here we fetch one more document than the limit to determine if there is a next page.
        docs = query.limit(limit + 1).stream()
        messages = []
        
        # we convert each document to a MessageResponse model, including the message_id and conversation_id in the response.
        for doc in docs:
            data = doc.to_dict()
            messages.append(MessageResponse(**data, message_id=doc.id, conversation_id=conversation_id))
        
        # Handle pagination by checking if we have more messages than the limit.
        # If so, we set the next_page_token to the ID of the last message in the current page.
        next_page_token = None
        if len(messages) > limit:
            messages = messages[:limit]
            next_page_token = messages[-1].message_id
        
        return {"messages": messages, "nextPageToken": next_page_token}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))