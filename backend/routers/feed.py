from fastapi import APIRouter, Depends, HTTPException
from firebase_config import get_db
from auth import get_current_user
import math

router = APIRouter()

PROFILES_COLLECTION = "profiles"
POSTS_COLLECTION = "posts"

def miles_between(lat1, lng1, lat2, lng2) -> float:
    R = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def _get_coords_from_location(loc):
    if not isinstance(loc, dict):
        return None, None
    lat = loc.get("lat")
    lng = loc.get("lng")
    if lat is None or lng is None:
        return None, None
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except Exception:
        return None, None
    if abs(lat_f) < 0.000001 and abs(lng_f) < 0.000001:
        return None, None
    return lat_f, lng_f

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
    my_lat, my_lng = _get_coords_from_location(me.get("location"))
    if my_lat is None or my_lng is None:
        raise HTTPException(status_code=400, detail="Your profile is missing location coordinates")

    results = []

    for doc in posts_ref.stream():
        post = doc.to_dict() or {}
        post_id = post.get("postId") or post.get("post_id") or doc.id
        post["postId"] = post_id

        author_id = post.get("userId") or post.get("user_id")
        if not author_id:
            continue

        author_doc = profiles_ref.document(author_id).get()
        if not author_doc.exists:
            continue

        author = author_doc.to_dict() or {}
        target_lat, target_lng = _get_coords_from_location(author.get("location"))
        if target_lat is None or target_lng is None:
            continue

        dist = miles_between(my_lat, my_lng, target_lat, target_lng)
        if dist <= radius_miles:
            post["distanceMiles"] = round(dist, 2)
            results.append(post)

        if len(results) >= limit:
            break

    results.sort(key=lambda x: x.get("distanceMiles", 999999))
    return results
