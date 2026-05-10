from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from models import ReviewCreate, ReviewResponse, PaginatedReviewsResponse
from firebase_config import get_db
from google.cloud import exceptions as gcp_exceptions, firestore as firestore_client
from google.api_core import exceptions as api_exceptions
from google.cloud.firestore_v1.base_query import FieldFilter
from auth import get_current_user

router = APIRouter()

REVIEWS_COLLECTION = "reviews"
PROFILES_COLLECTION = "profiles"


def _recalculate_and_update_aggregates(db, reviewed_user_id: str):
    """Recompute averageRating and reviewCount from scratch inside a Firestore transaction.
    Using a transaction ensures the read and write are atomic, preventing inconsistent
    aggregates under concurrent create/delete operations."""
    profile_ref = db.collection(PROFILES_COLLECTION).document(reviewed_user_id)
    reviews_query = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("reviewedUserId", "==", reviewed_user_id))
    )

    # Firestore transactions require a callback function that takes the transaction as an argument
    @firestore_client.transactional
    def _txn(transaction):
        ratings = [doc.to_dict().get("rating", 0) for doc in transaction.get(reviews_query)]
        count = len(ratings)
        average = round(sum(ratings) / count, 2) if count > 0 else None
        transaction.update(profile_ref, {
            "reviewCount": count,
            "averageRating": average,
        })

    _txn(db.transaction())


@router.post(
    "/profiles/{user_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    user_id: str,
    review: ReviewCreate,
    current_user_id: str = Depends(get_current_user),
):
    """Submit a star rating (1–5) and optional text review for another user.
    A user may not review themselves, and may only submit one review per reviewed user."""
    if current_user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot review yourself.",
        )

    try:
        db = get_db()

        # Verify the reviewed user exists
        profile_doc = db.collection(PROFILES_COLLECTION).document(user_id).get()
        if not profile_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}",
            )

        # Verify the reviewer has a profile (must be a registered user)
        reviewer_doc = db.collection(PROFILES_COLLECTION).document(current_user_id).get()
        if not reviewer_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Your profile was not found. Please create a profile before submitting reviews.",
            )
        reviewer_data = reviewer_doc.to_dict()

        # Deterministic document ID enforces one review per reviewer per reviewed user.
        review_id = f"{current_user_id}_{user_id}"
        now = datetime.now(timezone.utc)
        review_data = {
            "reviewId": review_id,
            "reviewerId": current_user_id,
            "reviewedUserId": user_id,
            "rating": review.rating,
            "text": review.text,
            "reviewerFirstName": reviewer_data.get("firstName", ""),
            "reviewerLastName": reviewer_data.get("lastName", ""),
            "reviewerProfilePicUrl": reviewer_data.get("profilePicUrl"),
            "createdAt": now,
        }

        try:
            db.collection(REVIEWS_COLLECTION).document(review_id).create(review_data)
        except api_exceptions.AlreadyExists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted a review for this user.",
            )
        _recalculate_and_update_aggregates(db, user_id)

        return ReviewResponse(**review_data)

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")


@router.get(
    "/profiles/{user_id}/reviews",
    response_model=PaginatedReviewsResponse,
)
async def list_reviews(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    last_doc_id: Optional[str] = Query(default=None),
    current_user_id: str = Depends(get_current_user),
):
    """List reviews for a user, sorted by newest first. Supports cursor-based pagination."""
    try:
        db = get_db()

        # Verify the reviewed user exists
        if not db.collection(PROFILES_COLLECTION).document(user_id).get().exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}",
            )

        query = (
            db.collection(REVIEWS_COLLECTION)
            .where(filter=FieldFilter("reviewedUserId", "==", user_id))
            .order_by("createdAt", direction="DESCENDING")
            .limit(limit + 1)
        )

        if last_doc_id:
            last_doc = db.collection(REVIEWS_COLLECTION).document(last_doc_id).get()
            if last_doc.exists:
                query = query.start_after(last_doc)

        docs = list(query.stream())
        has_more = len(docs) > limit
        docs = docs[:limit]

        reviews = [ReviewResponse(**doc.to_dict()) for doc in docs]
        next_token = docs[-1].id if has_more else None

        return PaginatedReviewsResponse(reviews=reviews, next_page_token=next_token)

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")


@router.get(
    "/profiles/{user_id}/reviews/my",
    response_model=Optional[ReviewResponse],
)
async def get_my_review(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
):
    """Get the current user's own review for a specific user, or null if none exists."""
    try:
        db = get_db()

        if not db.collection(PROFILES_COLLECTION).document(user_id).get().exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}",
            )

        review_id = f"{current_user_id}_{user_id}"
        doc = db.collection(REVIEWS_COLLECTION).document(review_id).get()
        if not doc.exists:
            return None
        return ReviewResponse(**doc.to_dict())

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")


@router.delete(
    "/profiles/{user_id}/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_review(
    user_id: str,
    review_id: str,
    current_user_id: str = Depends(get_current_user),
):
    """Delete a review. Only the reviewer who submitted it may delete it."""
    try:
        db = get_db()

        review_doc = db.collection(REVIEWS_COLLECTION).document(review_id).get()
        if not review_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review not found: {review_id}",
            )

        review_data = review_doc.to_dict()
        if review_data.get("reviewerId") != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own reviews.",
            )
        if review_data.get("reviewedUserId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review not found: {review_id}",
            )

        db.collection(REVIEWS_COLLECTION).document(review_id).delete()
        _recalculate_and_update_aggregates(db, user_id)
        return None

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")
