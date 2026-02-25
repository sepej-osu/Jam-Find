import pygeohash as pgh
import requests
from typing import Optional
from firebase_config import get_db
from models import Location
from config import settings

LOCATION_CACHE_COLLECTION = "location_cache"

def calculate_geohash(lat: float, lng: float, precision: int = 5) -> str:
    """Calculate geohash from latitude and longitude"""
    return pgh.encode(lat, lng, precision=precision)

def resolve_location_from_zip(zip_code: str) -> Optional[Location]:
    """
    Check Firestore cache for zip code data. 
    If missing, fetch from Google Geocoding and update cache.
    """
    db = get_db()
    cache_ref = db.collection(LOCATION_CACHE_COLLECTION).document(zip_code)
    
    try:
        cached = cache_ref.get()
        if cached.exists:
            # We use the cached data to hydrate our Pydantic model
            return Location(**cached.to_dict())

        # Cache miss: Call Google Maps
        if not getattr(settings, "GOOGLE_MAPS_API_KEY", None):
            raise RuntimeError("Google Maps API key not configured")
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": zip_code, "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=settings.GOOGLE_MAPS_API_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        status = data.get("status")
        if status != "OK":
            error_message = data.get("error_message", "Unknown error from Google Geocoding API")
            raise RuntimeError(
                f"Google Geocoding API error for {zip_code}: {status}: {error_message}"
            )
        results = data.get("results")
        if not results:
            return None

        result = results[0]
        lat = result["geometry"]["location"]["lat"]
        lng = result["geometry"]["location"]["lng"]

        location_obj = Location(
            zipCode=zip_code,
            formattedAddress=result["formatted_address"],
            lat=lat,
            lng=lng,
            placeId=result["place_id"],
            geohash=calculate_geohash(lat, lng)
        )

        # Save to cache using the alias names (zipCode, placeId, etc.)
        cache_ref.set(location_obj.model_dump(by_alias=True))

        return location_obj

    except Exception as e:
        # Logging the error is important so you know if your API key expires
        print(f"Error resolving location for {zip_code}: {e}")
        return None