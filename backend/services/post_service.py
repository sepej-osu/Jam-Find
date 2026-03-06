from models import PostCreate, PostUpdate, PostResponse, PostListParams
from firebase_config import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import exceptions as gcp_exceptions
from google.cloud import firestore
from fastapi import HTTPException, status
from datetime import datetime, timezone
from utils.location import resolve_location_from_zip, haversine_miles, bounding_box_from_miles

COLLECTION_NAME = "posts"

def add_computed_fields(post_data: dict, current_user_id: str = None) -> dict:
    """Add computed likes field and likedByCurrentUser flag"""
    post_data["likes"] = len(post_data.get("likedBy", []))
    if current_user_id:
        post_data["likedByCurrentUser"] = current_user_id in post_data.get("likedBy", [])
    else:
        post_data["likedByCurrentUser"] = False
    return post_data


async def create_post(post: PostCreate, current_user_id: str) -> PostResponse:
    try:
        db = get_db()
        post_data = post.model_dump(by_alias=True)
        now = datetime.now(timezone.utc)

        user_doc = db.collection("profiles").document(current_user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
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
            "likedBy": [],
            "likes": 0,
        })

        new_post_ref = db.collection(COLLECTION_NAME).document()
        post_data["postId"] = new_post_ref.id
        new_post_ref.set(post_data)

        return PostResponse(**add_computed_fields(post_data, current_user_id))

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred while creating post: {str(e)}")


async def get_post(post_id: str, current_user_id: str) -> PostResponse:
    try:
        db = get_db()
        post_doc = db.collection(COLLECTION_NAME).document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post not found with post_id: {post_id}")
        return PostResponse(**add_computed_fields(post_doc.to_dict(), current_user_id))

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred while getting post: {str(e)}")


async def update_post(post_id: str, post_update: PostUpdate, current_user_id: str) -> PostResponse:
    from auth import verify_user_access
    try:
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)
        post_doc = posts_ref.document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post not found with postId: {post_id}")
        existing_data = post_doc.to_dict()

        verify_user_access(current_user_id, existing_data.get("userId"))

        update_data = post_update.model_dump(exclude_unset=True, by_alias=True)
        update_data["updatedAt"] = datetime.now(timezone.utc)
        update_data["edited"] = True

        loc = update_data.get("location")
        if loc and loc.get("zipCode"):
            resolved = await resolve_location_from_zip(loc["zipCode"])
            if resolved:
                update_data["location"] = resolved.model_dump(by_alias=True)
        posts_ref.document(post_id).update(update_data)
        existing_data.update(update_data)
        return PostResponse(**add_computed_fields(existing_data, current_user_id))

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred while updating post: {str(e)}")


async def delete_post(post_id: str, current_user_id: str) -> None:
    from auth import verify_user_access
    try:
        db = get_db()
        posts_ref = db.collection(COLLECTION_NAME)
        post_doc = posts_ref.document(post_id).get()
        if not post_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post not found with postId: {post_id}")

        verify_user_access(current_user_id, post_doc.to_dict().get("userId"))
        posts_ref.document(post_id).delete()

    except HTTPException:
        raise
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred while deleting post: {str(e)}")

def _matches_instruments(data: dict, params) -> bool:
    """Returns False if the post doesn't satisfy the instrument/skill-level filter."""
    post_instruments = data.get("instruments", [])
    matches = []
    for instrument, (min_lvl, max_lvl) in params.instrument_requirements.items():
        for pi in post_instruments:
            if pi.get("name") == instrument and min_lvl <= int(pi.get("skillLevel", 1)) <= max_lvl:
                matches.append(instrument)
                break
    if params.instrument_mode == "any":
        return bool(matches)
    return len(matches) == len(params.instrument_requirements)


async def _list_posts_in_bbox(db, params: PostListParams, current_user_id: str) -> dict:
    """Fetch posts within a bounding box, apply Haversine trim, sort in-memory, and return a page slice.

    When a radius filter is active, Firestore forces location.lat/lng as the primary sort
    keys, making server-side sort_by=createdAt/likes incorrect. In-memory sorting fixes this.
    """
    # Default to 25 miles if radius is not provided
    effective_radius = params.radius_miles if params.radius_miles is not None else 25.0
    min_lat, max_lat, min_lng, max_lng = bounding_box_from_miles(
        params.user_lat, params.user_lng, effective_radius
    )

    posts_ref = db.collection(COLLECTION_NAME)
    query = posts_ref

    if params.user_id:
        query = query.where(filter=FieldFilter("userId", "==", params.user_id))
    if params.post_type:
        query = query.where(filter=FieldFilter("postType", "==", params.post_type))
    if params.genres:
        query = query.where(filter=FieldFilter("genres", "array_contains_any", params.genres))

    # Use a lat/lng bounding box (Firestore multi-field inequality, supported since March 2024).
    # https://puf.io/posts/how-to-perform-geoqueries-on-firestore-somewhat-efficiently/
    # Haversine below trims the corners.
    base_query = (query
        .where(filter=FieldFilter("location.lat", ">=", min_lat))
        .where(filter=FieldFilter("location.lat", "<=", max_lat))
        .where(filter=FieldFilter("location.lng", ">=", min_lng))
        .where(filter=FieldFilter("location.lng", "<=", max_lng))
        .order_by("location.lat")
        .order_by("location.lng")
    )

    # For distance sort we can stop once we have enough candidates (pragmatic optimisation;
    # acceptable because bounding-box corners are already trimmed by Haversine below).
    # For createdAt/likes we must collect ALL candidates before sorting.
    BATCH_SIZE = 500
    distance_sort = params.sort_by == "distance"
    needed = (params.page + 1) * params.limit  # used only for distance sort early-exit
    candidates = []
    last_doc = None

    while True:
        if distance_sort and len(candidates) >= needed:
            break

        batch = base_query.limit(BATCH_SIZE)
        if last_doc is not None:
            batch = batch.start_after(last_doc)

        docs = list(batch.stream())
        if not docs:
            break

        last_doc = docs[-1]

        for doc in docs:
            data = doc.to_dict()

            post_lat = data.get("location", {}).get("lat")
            post_lng = data.get("location", {}).get("lng")
            if post_lat is None or post_lng is None:
                continue

            # Final Haversine distance check to trim bounding box corners
            dist = haversine_miles(params.user_lat, params.user_lng, post_lat, post_lng)
            if dist > effective_radius:
                continue

            # Genre "all" mode check
            if params.genres and params.genre_mode == "all":
                post_genres = data.get("genres", [])
                if not all(g in post_genres for g in params.genres):
                    continue

            # Instruments & skill level check
            if params.instrument_requirements:
                if not _matches_instruments(data, params):
                    continue

            for field in ["createdAt", "updatedAt"]:
                if field in data and hasattr(data[field], "to_datetime"):
                    data[field] = data[field].to_datetime()

            data["postId"] = doc.id
            data["_dist"] = dist
            candidates.append(add_computed_fields(data, current_user_id))

        if len(docs) < BATCH_SIZE:
            break  # Exhausted the Firestore result set

    # Sort in-memory, then page-slice
    reverse = params.sort_order == "desc"
    if distance_sort:
        candidates.sort(key=lambda p: p["_dist"], reverse=reverse)
    elif params.sort_by == "likes":
        candidates.sort(key=lambda p: p.get("likes", 0), reverse=reverse)
    else:  # createdAt
        candidates.sort(
            key=lambda p: p.get("createdAt") or datetime.min.replace(tzinfo=timezone.utc),
            reverse=reverse,
        )

    for p in candidates:
        del p["_dist"]

    start = params.page * params.limit
    end = start + params.limit
    page_results = candidates[start:end]
    next_page = str(params.page + 1) if end < len(candidates) else None

    return {"posts": page_results, "nextPageToken": next_page}


async def list_posts(params: PostListParams, current_user_id: str) -> dict:
    """Fetch a paginated list of posts from Firestore, applying filters and sorting."""
    try:
        db = get_db()

        # When coordinates are provided we must collect all bounding-box candidates and
        # sort in-memory: Firestore forces location.lat/lng as the primary sort keys,
        # which would make sort_by=createdAt/likes/distance incorrect if done server-side.
        if params.user_lat is not None:
            return await _list_posts_in_bbox(db, params, current_user_id)

        results = []
        current_last_id = params.last_doc_id
        posts_ref = db.collection(COLLECTION_NAME)

        # Fetch in larger batches to minimize round-trips when many posts are filtered out.
        internal_fetch_limit = params.limit * 5

        while len(results) < params.limit:
            query = posts_ref

            if params.user_id:
                query = query.where(filter=FieldFilter("userId", "==", params.user_id))
            if params.post_type:
                query = query.where(filter=FieldFilter("postType", "==", params.post_type))
            if params.genres:
                query = query.where(filter=FieldFilter("genres", "array_contains_any", params.genres))

            direction = firestore.Query.ASCENDING if params.sort_order == "asc" else firestore.Query.DESCENDING

            query = query.order_by(params.sort_by, direction=direction).limit(internal_fetch_limit)

            # Pagination cursor for the current loop iteration
            if current_last_id:
                last_doc_snapshot = posts_ref.document(current_last_id).get()
                if last_doc_snapshot.exists:
                    query = query.start_after(last_doc_snapshot)
                else:
                    break  # Cursor invalid or end of data

            docs = list(query.stream())
            if not docs:
                break  # No more documents in DB

            for doc in docs:
                if len(results) >= params.limit:
                    break

                data = doc.to_dict()
                current_last_id = doc.id  # Update cursor to the very last doc inspected

                # Genre "all" mode check
                if params.genres and params.genre_mode == "all":
                    post_genres = data.get("genres", [])
                    if not all(g in post_genres for g in params.genres):
                        continue

                # Instruments & skill level check
                if params.instrument_requirements:
                    if not _matches_instruments(data, params):
                        continue

                # Need to convert Firestore timestamps to datetime for the API response
                for field in ["createdAt", "updatedAt"]:
                    if field in data and hasattr(data[field], "to_datetime"):
                        data[field] = data[field].to_datetime()

                data["postId"] = doc.id
                results.append(add_computed_fields(data, current_user_id))

        # We only provide a token if we successfully filled a whole page.
        # If results < limit, it means we hit the end of the collection.
        pagination_token = None
        if len(results) == params.limit:
            pagination_token = current_last_id

        return {
            "posts": results,
            "nextPageToken": pagination_token,
        }

    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while getting posts: {str(e)}",
        )
