from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from models import PostCreate, PostUpdate, PostResponse
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from auth import get_current_user, verify_user_access
from utils.location import resolve_location_from_zip

router = APIRouter()

COLLECTION_NAME = "posts"

def add_computed_fields(post_data: dict, current_user_id: str = None) -> dict:
    """Add computed likes field and likedByCurrentUser flag"""
    # Computes likes from length of likedBy array
    post_data["likes"] = len(post_data.get("likedBy", []))
    
    # Check if current user has liked this post
    if current_user_id:
        post_data["likedByCurrentUser"] = current_user_id in post_data.get("likedBy", [])
    else:
        post_data["likedByCurrentUser"] = False
    
    return post_data

@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    current_user_id: str = Depends(get_current_user)
):
    """Create a new post"""
    try:
        db = get_db()
        
        post_data = post.model_dump(by_alias=True)
        now = datetime.now(timezone.utc)

        user_doc = db.collection("profiles").document(current_user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        user_data = user_doc.to_dict()

        loc_data = post_data.get("location")
        if loc_data and loc_data.get("zipCode"):
            resolved = await resolve_location_from_zip(loc_data["zipCode"])
            if resolved:
                post_data["location"] = resolved.model_dump(by_alias=True)

        post_data.update({
            "userId": current_user_id,
            "firstName": user_data.get("firstName", "Unknown"),
            "lastName": user_data.get("lastName", "User"),
            "profilePicUrl": user_data.get("profilePicUrl"),
            "createdAt": now,
            "updatedAt": now,
            "edited": False,
            "likedBy": []
        })

        new_post_ref = db.collection(COLLECTION_NAME).document()
        post_data["postId"] = new_post_ref.id
        new_post_ref.set(post_data)
        
        return PostResponse(**add_computed_fields(post_data, current_user_id))
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating post: {str(e)}"
        )


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Get a post by post_id (user needs to be logged in to view posts)"""
    try:
        # Get database connection
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)

        # Fetch post document from Firestore
        post_doc = posts_ref.document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post not found with post_id: {post_id}"
            )
        post_data = post_doc.to_dict()
        return PostResponse(**add_computed_fields(post_data, current_user_id))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting post: {str(e)}"
        )


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_update: PostUpdate,
    current_user_id: str = Depends(get_current_user)
):
    """Update a post (user can only update their own post)"""
    try:
        # Get database connection
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)

        # Check if post exists
        post_doc = posts_ref.document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post not found with postId: {post_id}"
            )
        existing_data = post_doc.to_dict()
        
        # Verify user can only update their own post
        verify_user_access(current_user_id, existing_data.get("userId"))
        
        update_data = post_update.model_dump(exclude_unset=True, by_alias=True)

        # Add updatedAt timestamp and mark as edited
        update_data["updatedAt"] = datetime.now(timezone.utc)
        update_data["edited"] = True  # Mark post as edited

        loc = update_data.get("location")
        if loc and loc.get("zipCode"):
            resolved = resolve_location_from_zip(loc["zipCode"])
            if resolved:
                update_data["location"] = resolved.model_dump(by_alias=True)

        # Update the document in Firestore
        posts_ref.document(post_id).update(update_data)
        # Return the updated post
        existing_data.update(update_data)
        return PostResponse(**add_computed_fields(existing_data, current_user_id))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating post: {str(e)}"
        )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Delete a post (user can only delete their own post)"""
    try:
        # Get database connection
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)

        # Check if post exists
        post_doc = posts_ref.document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post not found with postId: {post_id}"
            )
        
        post_data = post_doc.to_dict()
        # Verify user can only delete their own post
        verify_user_access(current_user_id, post_data.get("userId"))
        
        # Delete the document from Firestore
        posts_ref.document(post_id).delete()
        return None  # 204 No Content
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting post: {str(e)}"
        )

@router.get("/posts", response_model=List[PostResponse])
async def list_posts(
    limit: int = 10,
    start_after: Optional[str] = Query(None, alias="startAfter"),
    user_id: Optional[str] = Query(None, alias="userId"),
    current_user_id: str = Depends(get_current_user)
):
    """List all posts (paginated) sorted by creation date.
    
    Args:
        limit: Maximum number of posts to return (default: 10)
        start_after: Post ID to start after for pagination
        user_id: Optional filter to get posts only from a specific user
    """
    # TODO: Add more filtering options in the future (post_type, location, instruments, genres)

    try:
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)
        
        # Filter by user_id if provided
        if user_id:
            query = posts_ref.where(filter=FieldFilter("userId", "==", user_id)).order_by("createdAt").limit(limit)
        else:
            query = posts_ref.order_by("createdAt").limit(limit)
        
        if start_after:
            start_doc = posts_ref.document(start_after).get()
            if not start_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"startAfter postId {start_after} does not exist"
                )
            query = query.start_after(start_doc)
        post_docs = query.stream()
        posts = [PostResponse(**add_computed_fields(doc.to_dict(), current_user_id)) for doc in post_docs]
        return posts
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting posts: {str(e)}"
        )