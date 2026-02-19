from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime, timezone
from models import PostCreate, PostUpdate, PostResponse
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from auth import get_current_user, verify_user_access
from routers.geo import geocode_zip

router = APIRouter()

COLLECTION_NAME = "posts"
PROFILES_COLLECTION = "profiles"

def add_computed_fields(post_data: dict, current_user_id: str = None) -> dict:
    """Add computed likes field and likedByCurrentUser flag"""
    # Computes likes from length of likedBy array
    post_data["likes"] = len(post_data.get("likedBy", []))
    
    # Check if current user has liked this post
    if current_user_id:
        post_data["liked_by_current_user"] = current_user_id in post_data.get("likedBy", [])
    else:
        post_data["liked_by_current_user"] = False
    
    return post_data

def _has_real_coords(loc: Optional[dict]) -> bool:
    if not isinstance(loc, dict):
        return False
    lat = loc.get("lat")
    lng = loc.get("lng")
    if lat is None or lng is None:
        return False
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except Exception:
        return False
    if abs(lat_f) < 0.000001 and abs(lng_f) < 0.000001:
        return False
    return True

def _zip_from_profile(profile: dict) -> str:
    z = (profile.get("zipCode") or profile.get("zip_code") or "").strip()
    return z

def _location_from_profile(profile: dict) -> Optional[dict]:
    loc = profile.get("location")
    if _has_real_coords(loc):
        return {
            "lat": float(loc.get("lat")),
            "lng": float(loc.get("lng")),
        }

    z = _zip_from_profile(profile)
    if not z:
        return None

    geo = geocode_zip(z)
    return {
        "lat": float(geo.lat),
        "lng": float(geo.lng),
    }

def _normalize_post_location(post_data: dict, profile: dict) -> None:
    loc = post_data.get("location")
    if _has_real_coords(loc):
        post_data["location"] = {
            "lat": float(loc.get("lat")),
            "lng": float(loc.get("lng")),
        }
        return

    fallback = _location_from_profile(profile)
    if fallback:
        post_data["location"] = fallback
    else:
        post_data["location"] = None

@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    current_user_id: str = Depends(get_current_user)
):
    """Create a new post"""
    try:
        # Get database connection
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)
        profiles_ref = db.collection(PROFILES_COLLECTION)

        profile_doc = profiles_ref.document(current_user_id).get()
        if not profile_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user profile not found"
            )
        profile_data = profile_doc.to_dict() or {}
        
        # Create post document with timestamps and auto-generated ID
        now = datetime.now(timezone.utc)
        post_data = post.model_dump(by_alias=True)
        post_data["userId"] = current_user_id
        post_data["created_at"] = now
        post_data["updated_at"] = now
        post_data["edited"] = False
        post_data["likedBy"] = []

        _normalize_post_location(post_data, profile_data)
        
        # Let Firestore auto-generate the document ID
        new_post_ref = posts_ref.document()
        post_data["postId"] = new_post_ref.id
        
        # Save to Firestore
        new_post_ref.set(post_data)
        
        # Return the created post with computed fields
        post_data["likes"] = 0
        post_data["liked_by_current_user"] = False
        return PostResponse(**post_data)
        
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
        post_data = post_doc.to_dict() or {}
        if not post_data.get("postId"):
            post_data["postId"] = post_doc.id
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


@router.put("/posts/{post_id}", response_model=PostResponse)
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
                detail=f"Post not found with post_id: {post_id}"
            )
        existing_data = post_doc.to_dict() or {}
        
        # Verify user can only update their own post
        verify_user_access(current_user_id, existing_data.get("userId"))
        
        update_data = post_update.model_dump(exclude_unset=True, by_alias=True)

        # Add updated_at timestamp and mark as edited
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["edited"] = True  # Mark post as edited
        # Update the document in Firestore
        posts_ref.document(post_id).update(update_data)
        # Return the updated post
        existing_data.update(update_data)
        if not existing_data.get("postId"):
            existing_data["postId"] = post_id
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
                detail=f"Post not found with post_id: {post_id}"
            )
        
        post_data = post_doc.to_dict() or {}
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
    start_after: Optional[str] = None,
    user_id: Optional[str] = None,
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
            query = posts_ref.where(filter=FieldFilter("userId", "==", user_id)).order_by("created_at").limit(limit)
        else:
            query = posts_ref.order_by("created_at").limit(limit)
        
        if start_after:
            start_doc = posts_ref.document(start_after).get()
            if not start_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"start_after post_id {start_after} does not exist"
                )
            query = query.start_after(start_doc)
        post_docs = query.stream()
        posts = []
        for doc in post_docs:
            p = doc.to_dict() or {}
            if not p.get("postId"):
                p["postId"] = doc.id
            posts.append(PostResponse(**add_computed_fields(p, current_user_id)))
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