from fastapi import APIRouter, HTTPException, status, Depends
from firebase_config import get_db
from google.cloud import exceptions as gcp_exceptions
from google.cloud.firestore import ArrayUnion, ArrayRemove
from auth import get_current_user
from models import LikeResponse

router = APIRouter()

COLLECTION_NAME = "posts"

@router.post("/posts/{post_id}/like", response_model=LikeResponse)
async def toggle_like_post(
    post_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Toggle like on a post. If user hasn't liked, add like. If already liked, remove like."""
    try:
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)
        post_ref = posts_ref.document(post_id)
        
        # Check if post exists
        post_doc = post_ref.get()
        if not post_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post not found with post_id: {post_id}"
            )
        
        post_data = post_doc.to_dict()
        liked_by = post_data.get("likedBy", [])
        
        # Check if user has already liked the post
        if current_user_id in liked_by:
            # Unlike: remove user from liked_by
            post_ref.update({
                "likedBy": ArrayRemove([current_user_id])
            })
            new_likes_count = len(liked_by) - 1
            return LikeResponse(
                post_id=post_id,
                likes=new_likes_count,
                liked=False,
                message="Post unliked successfully"
            )
        else:
            # Like: add user to liked_by
            post_ref.update({
                "likedBy": ArrayUnion([current_user_id])
            })
            new_likes_count = len(liked_by) + 1
            return LikeResponse(
                post_id=post_id,
                likes=new_likes_count,
                liked=True,
                message="Post liked successfully"
            )
        
    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while toggling like: {str(e)}"
        )
