from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from models import ProfileCreate, ProfileUpdate, ProfileResponse
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from auth import get_current_user, verify_user_access

router = APIRouter()

COLLECTION_NAME = "profiles"


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
        
        # Check if profile already exists for this user_id
        existing_profile = profiles_ref.document(profile.user_id).get()
        if existing_profile.exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Profile already exists for user_id: {profile.user_id}"
            )
        
        # Check if email is already taken
        email_query = profiles_ref.where(filter=FieldFilter("email", "==", profile.email)).limit(1).get()
        if len(list(email_query)) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email {profile.email} is already registered"
            )
        
        # Create profile document with timestamps
        now = datetime.utcnow()
        profile_data = profile.model_dump(by_alias=True)
        profile_data["created_at"] = now
        profile_data["updated_at"] = now
        
        # Save to Firestore
        profiles_ref.document(profile.user_id).set(profile_data)
        
        # Return the created profile
        return ProfileResponse(**profile_data)
        
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
                detail=f"Profile not found for user_id: {user_id}"
            )
        profile_data = profile_doc.to_dict()
        return ProfileResponse(**profile_data)
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
            detail=f"An error occurred while getting profile: {str(e)}"
        )


@router.put("/profiles/{user_id}", response_model=ProfileResponse)
async def update_profile(
    user_id: str,
    profile_update: ProfileUpdate,
    current_user_id: str = Depends(get_current_user)
):
    """Update a user profile (user can only update their own profile)"""
    # Verify user can only  their own profile
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
                detail=f"Profile not found for user_id: {user_id}"
            )
        existing_data = profile_doc.to_dict()
        update_data = profile_update.model_dump(exclude_unset=True)

        # Check email uniqueness only if email is being changed
        if "email" in update_data:
            new_email = update_data["email"]
            current_email = existing_data.get("email")
            
            # Only check uniqueness if email is actually changing
            if new_email != current_email:
                email_query = profiles_ref.where(
                    filter=FieldFilter("email", "==", new_email)
                ).limit(1).get()
                
                # Check if any other user has this email
                for doc in email_query:
                    if doc.id != user_id:
                        raise HTTPException(
                            # TODO: Add rate limiting or email verification to prevent abuse
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Email {new_email} is already registered"
                        )

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        # Update the document in Firestore
        profiles_ref.document(user_id).update(update_data)
        # Return the updated profile
        existing_data.update(update_data)
        return ProfileResponse(**existing_data)
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
            detail=f"An error occurred while updating profile: {str(e)}"
        )


@router.delete("/profiles/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user)
):
    # Verify user can only delete their own profile
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
                detail=f"Profile not found for user_id: {user_id}"
            )
        
        # Delete the document from Firestore
        profiles_ref.document(user_id).delete()
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
            detail=f"An error occurred while deleting profile: {str(e)}"
        )

@router.get("/profiles", response_model=List[ProfileResponse])
async def list_profiles(
    limit: int = 10,
    start_after: Optional[str] = None,
    current_user_id: str = Depends(get_current_user)
):
    """List all profiles (paginated) sorted by creation date.
    
    Args:
        limit: Maximum number of profiles to return (default: 10, max: 100)
        start_after: User ID to start after for pagination
    """
    # Limit the max number of results to 100
    max_allowed_limit = 100
    limit = min(limit, max_allowed_limit)
    try:
        db = get_db()
        profiles_ref = db.collection(COLLECTION_NAME)
        query = profiles_ref.order_by("created_at").limit(limit)
        if start_after:
            start_doc = profiles_ref.document(start_after).get()
            if not start_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"start_after user_id {start_after} does not exist"
                )
            query = query.start_after(start_doc)
        profile_docs = query.stream()
        profiles = [ProfileResponse(**doc.to_dict()) for doc in profile_docs]
        return profiles
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
            detail=f"An error occurred while getting profiles: {str(e)}"
        )