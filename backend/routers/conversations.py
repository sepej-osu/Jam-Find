from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Annotated, Optional
from models import ConversationCreate, ConversationResponse, PaginatedConversationsResponse
from auth import get_current_user
from services import conversation_service


router = APIRouter()
COLLECTION_NAME = "conversations"

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation: ConversationCreate,
    current_user_id: str = Depends(get_current_user)
):
    return await conversation_service.create_conversation(conversation, current_user_id)


@router.get("/conversations", response_model=PaginatedConversationsResponse)
async def list_conversations(
    limit: int = Query(10, ge=1),
    last_doc_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user)
):
    return await conversation_service.list_conversations(current_user_id, limit, last_doc_id)

