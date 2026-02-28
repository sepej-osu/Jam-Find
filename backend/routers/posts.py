from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from models import PostCreate, PostUpdate, PostResponse, PostType, PaginatedPostsResponse, GenreType, InstrumentType, Instrument
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from google.cloud import firestore
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

@router.get("/posts", response_model=PaginatedPostsResponse)
async def list_posts(
    limit: int = 10,
    last_doc_id: Optional[str] = Query(None),
    # Filters
    post_type: Optional[List[PostType]] = Query(None),
    instruments: Optional[List[str]] = Query(None, description="Format: 'InstrumentName:SkillLevel' (e.g. 'drums:3')"),
    instrument_mode: str = Query("any", regex="^(any|all)$"),
    genres: Optional[List[GenreType]] = Query(None),
    genre_mode: str = Query("any", regex="^(any|all)$"),
    # Location
    nearby_geohash: Optional[str] = Query(None),
    # Sorting
    sort_by: str = Query("createdAt", regex="^(createdAt|likes)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    # User
    user_id: str = Query(None, description="Filter posts by a specific user ID"),
    current_user_id: str = Depends(get_current_user)
):

    # Parse instrument requirements: {"electric_guitar": (2, 4)}
    # This allows for min/max skill level filter per instrument.
    # If max is not provided, we assume 5. If skill level is not provided, we assume 1.
    instrument_requirements = {}
    if instruments:
        for item in instruments:
            parts = item.split(":")
            slug = parts[0].lower()
            
            if len(parts) == 3: # Format 'slug:min:max'
                try:
                    instrument_requirements[slug] = (int(parts[1]), int(parts[2]))
                except ValueError:
                    instrument_requirements[slug] = (1, 5)
            elif len(parts) == 2: # Format 'slug:min' (default max to 5)
                try:
                    instrument_requirements[slug] = (int(parts[1]), 5)
                except ValueError:
                    instrument_requirements[slug] = (1, 5)
            else:
                instrument_requirements[slug] = (1, 5)

    # Post Type requirments (only 1)
    if post_type and len(post_type) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one post_type can be filtered at a time."
        )

    try:
        db = get_db()
        results = []
        current_last_id = last_doc_id
        
        # We fetch in slightly larger batches to minimize round-trips
        # If too many posts are filtered out by the Python logic,
        # we might return very few results and have to make many DB calls to fill a page
        internal_fetch_limit = limit * 2

        while len(results) < limit:
            posts_ref = db.collection(COLLECTION_NAME)
            query = posts_ref

            if user_id:
                query = query.where(filter=FieldFilter("userId", "==", user_id))
            if post_type:
                query = query.where(filter=FieldFilter("postType", "==", post_type[0]))
            if genres:
                query = query.where(filter=FieldFilter("genres", "array_contains_any", genres))

            # Sorting
            direction = firestore.Query.ASCENDING if sort_order == "asc" else firestore.Query.DESCENDING
            
            # Range
            if nearby_geohash:
                prefix = nearby_geohash[:4] # Using a shorter prefix for broader matches
                end_prefix = prefix[:-1] + chr(ord(prefix[-1]) + 1) # Increment last char to get upper bound
                query = query.where(filter=FieldFilter("location.geohash", ">=", prefix)) # Start of geohash range
                query = query.where(filter=FieldFilter("location.geohash", "<", end_prefix)) # End of geohash range
                query = query.order_by("location.geohash") # Order by geohash prefix
            
            query = query.order_by(sort_by, direction=direction).limit(internal_fetch_limit)

            # Pagination cursor for the current loop iteration
            if current_last_id:
                last_doc_snapshot = posts_ref.document(current_last_id).get()
                if last_doc_snapshot.exists:
                    query = query.start_after(last_doc_snapshot)
                else:
                    break # Cursor invalid or end of data

            docs = list(query.stream())
            if not docs:
                break # No more documents in DB

            for doc in docs:
                if len(results) >= limit:
                    break
                
                data = doc.to_dict()
                current_last_id = doc.id # Update cursor to the very last doc inspected
                
                # FILTERS
                
                # Genre "All" Mode check
                if genres and genre_mode == "all":
                    post_genres = data.get("genres", [])
                    if not all(g in post_genres for g in genres):
                        continue

                # Instruments & Skill Check
                if instrument_requirements:
                    post_instrument_data = data.get("instruments", [])
                    matches = []
                    
                    for instrument, (min_lvl, max_lvl) in instrument_requirements.items():
                        for post_instrument in post_instrument_data: # Iterate through post's instruments to find a match
                            # Get DB values
                            post_instrument_name = post_instrument.get("name") # Make sure it's in slug format in DB
                            post_instrument_skill = int(post_instrument.get("skillLevel", 1))
                            
                            # Check if name matches AND skill is within [min, max]
                            if post_instrument_name == instrument and min_lvl <= post_instrument_skill <= max_lvl:
                                matches.append(instrument)
                                break

                    if instrument_mode == "any":
                        if not matches:
                            continue
                    else: # "all" mode
                        if len(matches) < len(instrument_requirements):
                            continue

                # Data formatting
                # Need to convert Firestore timestamps to ISO format for the API response
                for field in ["createdAt", "updatedAt"]:
                    if field in data and hasattr(data[field], "to_datetime"):
                        data[field] = data[field].to_datetime()

                data["postId"] = doc.id
                results.append(add_computed_fields(data, current_user_id))

        # Calculate the token
        # We only provide a token if we successfully filled a whole page.
        # If results < limit, it means we hit the end of the collection.
        pagination_token = None
        if len(results) == limit:
            pagination_token = current_last_id

        return {
            "posts": results,
            "nextPageToken": pagination_token
        }

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