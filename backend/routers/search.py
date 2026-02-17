from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from firebase_config import get_db
from auth import get_current_user
from .geo import geocode_zip  
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

@router.get("/search/musicians")
async def search_musicians(
    radius_miles: float = 25,
    instrument: Optional[str] = None,
    genre: Optional[str] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user)
):
    """
    Search profiles within radius_miles of the current user, using ZIP-only storage.

    Optional filters:
      - instrument: match any instrument name in profile.instruments[]
      - genre: match any genre in profile.genres[]
    """
    if radius_miles <= 0 or radius_miles > 500:
        raise HTTPException(status_code=400, detail="radius_miles must be between 1 and 500")
    limit = min(max(limit, 1), 200)

    db = get_db()
    profiles_ref = db.collection(PROFILES_COLLECTION)

    # Load current user's profile to get their zipCode
    me_doc = profiles_ref.document(current_user_id).get()
    if not me_doc.exists:
        raise HTTPException(status_code=404, detail="Current user profile not found")
    me = me_doc.to_dict()

    my_zip = me.get("zipCode") or me.get("zip_code")
    if not my_zip:
        raise HTTPException(status_code=400, detail="Your profile is missing zipCode")

    try:
        my_geo = geocode_zip(my_zip)
        my_lat, my_lng = my_geo.lat, my_geo.lng
    except HTTPException as e:
        # Re-raise the HTTP exception from geocode_zip
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Fetch profiles (simple approach: stream and filter in Python)
    # Later you can optimize with a geohash strategy.
    docs = profiles_ref.stream()

    results: List[Dict[str, Any]] = []
    for doc in docs:
        if doc.id == current_user_id:
            continue

        p = doc.to_dict()

        # optional filters
        if genre:
            genres = p.get("genres") or []
            if genre not in genres:
                continue

        if instrument:
            instruments = p.get("instruments") or []
            # instruments is list of dicts like {name, experienceLevel}
            if not any((i.get("name") == instrument) for i in instruments if isinstance(i, dict)):
                continue

        z = p.get("zipCode") or p.get("zip_code")
        if not z:
            continue

        try:
            # Fixed: Handle object return and HTTPException
            target_geo = geocode_zip(z)
            lat, lng = target_geo.lat, target_geo.lng
        except HTTPException:
            # If geocoding fails for a user, skip them
            continue
        except Exception:
            continue

        dist = miles_between(my_lat, my_lng, lat, lng)
        if dist <= radius_miles:
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