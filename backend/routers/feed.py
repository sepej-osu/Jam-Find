from fastapi import APIRouter, Depends, HTTPException
from firebase_config import get_db
from auth import get_current_user
from utils.geo import miles_between, get_coords_from_location

router = APIRouter()

PROFILES_COLLECTION = "profiles"
POSTS_COLLECTION = "posts"

@router.get("/posts/feed")
async def get_feed(
    radius_miles: int = 25,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user)
):
    if radius_miles < 1 or radius_miles > 500:
        raise HTTPException(status_code=400, detail="radius_miles must be between 1 and 500")

    if limit < 1:
        limit = 1
    if limit > 200:
        limit = 200

    db = get_db()
    profiles_ref = db.collection(PROFILES_COLLECTION)
    posts_ref = db.collection(POSTS_COLLECTION)

    me_doc = profiles_ref.document(current_user_id).get()
    if not me_doc.exists:
        raise HTTPException(status_code=404, detail="Current user profile not found")

    me = me_doc.to_dict() or {}
    my_lat, my_lng = get_coords_from_location(me.get("location"))
    if my_lat is None or my_lng is None:
        raise HTTPException(status_code=400, detail="Your profile is missing location coordinates")

    profile_cache = {}
    results = []

    for doc in posts_ref.stream():
        post = doc.to_dict() or {}
        post_id = post.get("postId") or post.get("post_id") or doc.id
        post["postId"] = post_id

        author_id = post.get("userId") or post.get("user_id")
        if not author_id:
            continue

        if author_id not in profile_cache:
            author_doc = profiles_ref.document(author_id).get()
            if not author_doc.exists:
                profile_cache[author_id] = None
                continue
            profile_cache[author_id] = author_doc.to_dict() or {}

        author = profile_cache[author_id]
        if author is None:
            continue

        target_lat, target_lng = get_coords_from_location(author.get("location"))
        if target_lat is None or target_lng is None:
            continue

        dist = miles_between(my_lat, my_lng, target_lat, target_lng)
        if dist <= radius_miles:
            post["distanceMiles"] = round(dist, 2)

            liked_by = post.get("likedBy") or []
            post["likes"] = len(liked_by)
            post["likedByCurrentUser"] = current_user_id in liked_by

            results.append(post)

        if len(results) >= limit:
            break

    results.sort(key=lambda x: x.get("distanceMiles", 999999))
    return results