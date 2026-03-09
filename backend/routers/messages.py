from fastapi import APIRouter, status, Depends, Query
from typing import Optional
from models import MessageCreate, MessageResponse
from auth import get_current_user
from services import message_service


router = APIRouter()
@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    message: MessageCreate,
    current_user_id: str = Depends(get_current_user)
):
    return await message_service.send_message(conversation_id, current_user_id, message)


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    limit: int = Query(20, ge=1),
    last_doc_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user)
):
    return await message_service.list_messages(conversation_id, current_user_id, limit, last_doc_id)

