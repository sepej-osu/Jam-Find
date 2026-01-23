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
    # TODO: Verify user can only create their own profile
    # TODO: Get database connection
    # TODO: Check if profile already exists for this user_id
    # TODO: Check if email is already taken
    # TODO: Create profile document with timestamps
    # TODO: Save to Firestore
    # TODO: Return the created profile
    # TODO: Handle errors (HTTPException, GoogleCloudError, general exceptions)
    pass


@router.get("/profiles/{user_id}", response_model=ProfileResponse)
async def get_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Get a user profile by user_id (user can only view their own profile)"""
    # TODO: Verify user can only access their own profile
    # TODO: Get database connection
    # TODO: Fetch profile document from Firestore
    # TODO: Check if profile exists (raise 404 if not)
    # TODO: Return the profile data
    # TODO: Handle errors
    pass


@router.put("/profiles/{user_id}", response_model=ProfileResponse)
async def update_profile(
    user_id: str,
    profile_update: ProfileUpdate,
    current_user_id: str = Depends(get_current_user)
):
    """Update a user profile (user can only update their own profile)"""
    # TODO: Verify user can only update their own profile
    # TODO: Get database connection
    # TODO: Check if profile exists
    # TODO: Get only the fields that were provided (exclude_unset=True)
    # TODO: If email is being updated, check if it's already taken by another user
    # TODO: Add updated_at timestamp
    # TODO: Update the document in Firestore
    # TODO: Fetch and return the updated profile
    # TODO: Handle errors
    pass


@router.delete("/profiles/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user)
):
    """Delete a user profile (user can only delete their own profile)"""
    # TODO: Verify user can only delete their own profile
    # TODO: Get database connection
    # TODO: Check if profile exists (raise 404 if not)
    # TODO: Delete the document from Firestore
    # TODO: Return None
    # TODO: Handle errors
    pass


@router.get("/profiles", response_model=List[ProfileResponse])
async def list_profiles(
    limit: int = 10,
    start_after: Optional[str] = None,
    current_user_id: str = Depends(get_current_user)
):
    """List all profiles (paginated)
    
    Args:
        limit: Maximum number of profiles to return (default: 10, max: 100)
        start_after: User ID to start after for pagination
    """
    # TODO: Get database connection
    # TODO: Limit the max number of results to 100
    # TODO: Build query with ordering and limit
    # TODO: Apply pagination cursor if start_after is provided
    # TODO: Fetch documents and convert to ProfileResponse objects
    # TODO: Return list of profiles
    # TODO: Handle errors
    pass
