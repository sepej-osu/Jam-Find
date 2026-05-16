from models import MessageCreate, MessageResponse
from firebase_config import get_db
from datetime import datetime, timezone
from fastapi import HTTPException, status
from typing import Optional
from google.cloud import firestore

async def send_message(conversation_id: str, sender_id: str, message_create: MessageCreate) -> MessageResponse:
    """
    Send a message to a conversation.
    Verifies conversation exists and user is a participant.
    Updates conversation's last_message fields.
    """
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        convo_ref = db.collection("conversations").document(conversation_id)
        message_ref = convo_ref.collection("messages").document()

        # Write message + conversation update atomically so concurrent deletion
        # (which marks is_deleting=true) is detected and rejected.
        @firestore.transactional
        def _write_message(transaction):
            convo_doc = convo_ref.get(transaction=transaction)
            if not convo_doc.exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

            convo_data = convo_doc.to_dict()
            if sender_id not in convo_data.get("participant_ids", []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a participant in this conversation"
                )

            if convo_data.get("is_deleting"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Conversation is being deleted"
                )

            message_data = {
                "sender_id": sender_id,
                "content": message_create.content,
                "createdAt": now
            }

            transaction.set(message_ref, message_data)
            transaction.update(convo_ref, {
                "last_message_preview": message_create.content[:100],
                "last_message_sent_at": now,
                "last_message_sender_id": sender_id,
                "updatedAt": now
            })

        transaction = db.transaction()
        _write_message(transaction)
        
        return MessageResponse(
            message_id=message_ref.id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=message_create.content,
            createdAt=now
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
        # We query the messages subcollection for the conversation, ordering by createdAt descending for pagination.
        query = db.collection("conversations").document(conversation_id)\
            .collection("messages")\
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
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
