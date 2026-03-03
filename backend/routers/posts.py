from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Annotated
from models import PostCreate, PostUpdate, PostResponse, PaginatedPostsResponse, PostListParams
from auth import get_current_user
from services import post_service

router = APIRouter()

COLLECTION_NAME = "posts"

@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    current_user_id: str = Depends(get_current_user)
):
    return await post_service.create_post(post, current_user_id)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    return await post_service.get_post(post_id, current_user_id)


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    current_user_id: str = Depends(get_current_user)
):
    return await post_service.update_post(post_id, post_update, current_user_id)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    return await post_service.delete_post(post_id, current_user_id)


@router.get("/posts", response_model=PaginatedPostsResponse)
async def list_posts(
    params: Annotated[PostListParams, Query()],
    current_user_id: str = Depends(get_current_user)
):
    return await post_service.list_posts(params, current_user_id)