from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from firebase_config import get_db
from auth import get_current_user
import math

router = APIRouter()

PROFILES_COLLECTION = "profiles"

def miles_between(lat1, lng1, lat2, lng2) -> float:
    R = 3958.7613
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def _get_coords_from_location(loc: Any):
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

@router.get("/search/musicians")
async def search_musicians(
    radius_miles: float = 25,
    instrument: Optional[str] = None,
    genre: Optional[str] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user)
):
    """
    Search profiles within radius_miles of the current user, using stored profile.location coords.

    Optional filters:
      - instrument: match any instrument name in profile.instruments[]
      - genre: match any genre in profile.genres[]
    """
    if radius_miles <= 0 or radius_miles > 500:
        raise HTTPException(status_code=400, detail="radius_miles must be between 1 and 500")
    limit = min(max(limit, 1), 200)

    db = get_db()
    profiles_ref = db.collection(PROFILES_COLLECTION)

    me_doc = profiles_ref.document(current_user_id).get()
    if not me_doc.exists:
        raise HTTPException(status_code=404, detail="Current user profile not found")
    me = me_doc.to_dict() or {}

    my_lat, my_lng = _get_coords_from_location(me.get("location"))
    if my_lat is None or my_lng is None:
        raise HTTPException(status_code=400, detail="Your profile is missing location coordinates")

    docs = profiles_ref.stream()

    results: List[Dict[str, Any]] = []
    for doc in docs:
        if doc.id == current_user_id:
            continue

        p = doc.to_dict() or {}

        if genre:
            genres = p.get("genres") or []
            if genre not in genres:
                continue

        if instrument:
            instruments = p.get("instruments") or []
            if not any((i.get("name") == instrument) for i in instruments if isinstance(i, dict)):
                continue

        lat, lng = _get_coords_from_location(p.get("location"))
        if lat is None or lng is None:
            continue

        dist = miles_between(my_lat, my_lng, lat, lng)
        if dist <= radius_miles:
            z = p.get("zipCode") or p.get("zip_code") or ""
            p_out = {
                "userId": p.get("userId") or p.get("user_id") or doc.id,
                "firstName": p.get("firstName") or p.get("first_name"),
                "lastName": p.get("lastName") or p.get("last_name"),
                "genres": p.get("genres") or [],
                "instruments": p.get("instruments") or [],
                "profilePicUrl": p.get("profilePicUrl") or p.get("profile_pic_url"),
                "zipCode": z,
                "distanceMiles": round(dist, 2),
            }
            results.append(p_out)

        if len(results) >= limit:
            break

    results.sort(key=lambda x: x["distanceMiles"])
    return results