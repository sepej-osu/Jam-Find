from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime, timezone
from models import ProfileCreate, ProfileUpdate, ProfileResponse
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from firebase_admin import auth, storage
from auth import get_current_user, verify_user_access
from utils.location import resolve_location_from_zip
from config import settings

router = APIRouter()

COLLECTION_NAME = "profiles"
REVIEWS_COLLECTION_NAME = "reviews"

@router.post("/profiles", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile: ProfileCreate,
    current_user_id: str = Depends(get_current_user)
):
    """Create a new user profile (user can only create their own profile)"""
    # Verify user can only create their own profile
    verify_user_access(current_user_id, profile.user_id)
        
    try:
        # Get database connection
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)

        profile_data = profile.model_dump(by_alias=True)
        
        # Check if profile already exists for this userId
        existing_profile = profiles_ref.document(profile.user_id).get()
        if existing_profile.exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Profile already exists for userId: {profile.user_id}"
            )
        
        # Check if email is already taken
        email_query = profiles_ref.where(filter=FieldFilter("email", "==", profile.email)).limit(1).get()
        if len(list(email_query)) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email {profile.email} is already registered"
            )
        
        loc = profile_data.get("location")
        if loc and loc.get("zipCode"):
            resolved = await resolve_location_from_zip(loc["zipCode"])
            if resolved:
                profile_data["location"] = resolved.model_dump(by_alias=True)

        # Create profile document with timestamps
        now = datetime.now(timezone.utc)
        profile_data["createdAt"] = now
        profile_data["updatedAt"] = now

        # Save to Firestore
        profiles_ref.document(profile.user_id).set(profile_data)
        
        # Return the created profile
        return ProfileResponse(**profile_data)
        
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
            detail=f"An error occurred while creating profile: {str(e)}"
        )


@router.get("/profiles/{user_id}", response_model=ProfileResponse)
async def get_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Get a user profile (user needs to be logged in to view profiles)"""
    try:
        # Get database connection
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)

        # Fetch profile document from Firestore
        profile_doc = profiles_ref.document(user_id).get()
        if not profile_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}"
            )
        profile_data = profile_doc.to_dict()
        
        try:
            return ProfileResponse(**profile_data)
        except Exception as validation_error:
            # This logs the specific Pydantic error to your terminal
            print(f"CRITICAL: Profile Validation Failed for {user_id}: {validation_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Profile data in database is inconsistent with server model."
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
            detail=f"An error occurred while getting profile: {str(e)}"
        )


@router.patch("/profiles/{user_id}", response_model=ProfileResponse)
async def update_profile(
    user_id: str,
    profile_update: ProfileUpdate,
    current_user_id: str = Depends(get_current_user)
):
    """Update a user profile (user can only update their own profile)"""
    # Verify user can only update their own profile
    verify_user_access(current_user_id, user_id)
    
    try:
        # Get database connection
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)

        # Check if profile exists
        profile_doc = profiles_ref.document(user_id).get()
        if not profile_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}"
            )
        existing_data = profile_doc.to_dict()
        update_data = profile_update.model_dump(exclude_unset=True, by_alias=True)

        # Check email uniqueness only if email is being changed
        if "email" in update_data:
            new_email = update_data["email"]
            current_email = existing_data.get("email")
            
            if new_email != current_email:
                email_query = profiles_ref.where(
                    filter=FieldFilter("email", "==", new_email)
                ).limit(1).get()
                
                for doc in email_query:
                    if doc.id != user_id:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Email {new_email} is already registered"
                        )

        loc = update_data.get("location")
        if loc and loc.get("zipCode"):
            resolved = await resolve_location_from_zip(loc["zipCode"])
            if resolved:
                update_data["location"] = resolved.model_dump(by_alias=True)

        # Add updated_at timestamp
        update_data["updatedAt"] = datetime.now(timezone.utc)
        
        # Update the document in Firestore
        profiles_ref.document(user_id).update(update_data)

        
        # Merge data for the response
        existing_data.update(update_data)
        return ProfileResponse(**existing_data)

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
            detail=f"An error occurred while updating profile: {str(e)}"
        )

def _delete_targeted_reviews(db, user_id: str):

    try:
        reviews_ref = db.collection("reviews")
        # Find all reviews where this user was the recipient/subject
        query = reviews_ref.where(filter=FieldFilter("reviewedUserId", "==", user_id))
        docs = query.stream()


        batch = db.batch()
        count = 0
        
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            
            # Firestore batches have a limit of 500 operations
            if count >= 500:
                batch.commit()
                batch = db.batch()
                count = 0

        if count > 0:
            batch.commit()
            
        print(f"Successfully deleted reviews targeting user: {user_id}")
        
    except Exception as e:
        print(f"Error deleting targeted reviews: {str(e)}")


def _mark_reviews_deleted(db, user_id: str) -> None:
    try:
        reviews_ref = db.collection(REVIEWS_COLLECTION_NAME)
        user_reviews = reviews_ref.where(
            filter=FieldFilter("reviewerId", "==", user_id)
        ).stream()
        batch = db.batch()
        counter = 0
        for review_doc in user_reviews:
            batch.update(review_doc.reference, {
                "isReviewerDeleted": True,
                "reviewerFirstName": "Deleted",
                "reviewerLastName": "User",
                "reviewerProfilePicUrl": None,
            })
            counter += 1
            if counter % 500 == 0:
                batch.commit()
                batch = db.batch()
                
        if counter % 500 != 0:
            batch.commit()
        
    except Exception as e:
        print(f"Warning: Failed to mark reviews as deleted for user {user_id}: {str(e)}")


def _delete_storage_files(user_id: str) -> None:
    if not user_id:
        return

    try:
        bucket = storage.bucket()
        blobs = list(bucket.list_blobs(prefix=f"users/{user_id}/"))
        
        if not blobs:
            return 

        # Delete all blobs found under the prefix
        bucket.delete_blobs(blobs) 
    # we catch and alog issues but continue with deletion
    except Exception as e:
        print(f"Error: {e}")


@router.delete("/profiles/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user)
):
    verify_user_access(current_user_id, user_id)

    try:
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)

        if not profiles_ref.document(user_id).get().exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for userId: {user_id}"
            )

        # Best-effort cleanup 
        _mark_reviews_deleted(db, user_id)

        _delete_targeted_reviews(db, user_id)

        _delete_storage_files(user_id)

        # The order of the delete operations matter to prevent orphaned profiles.
        if not settings.DEV_MODE:
            try:
                auth.delete_user(user_id)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete auth account: {str(e)}"
                )

        try:
            profiles_ref.document(user_id).delete()
        except Exception as e:
            print(f"CLEANUP NEEDED: Auth deleted but profile remains for {user_id}: {str(e)}")

        return None
    # Here we catch and re-raise HTTPExceptions to ensure they are returned as intended
    except HTTPException:
        raise
    # For any other exceptions, we return a 503 to indicate a service issue, but we log the details for debugging
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")


@router.get("/profiles", response_model=List[ProfileResponse])
async def list_profiles(
    limit: int = 10,
    start_after: Optional[str] = None,
    current_user_id: str = Depends(get_current_user)
):
    """List all profiles (paginated) sorted by creation date."""
    max_allowed_limit = 100
    limit = min(limit, max_allowed_limit)
    try:
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)
        query = profiles_ref.order_by("createdAt").limit(limit)
        
        if start_after:
            start_doc = profiles_ref.document(start_after).get()
            if not start_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"startAfter userId {start_after} does not exist"
                )
            query = query.start_after(start_doc)
            
        profile_docs = query.stream()
        return [ProfileResponse(**doc.to_dict()) for doc in profile_docs]
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
            detail=f"An error occurred while getting profiles: {str(e)}"
        )