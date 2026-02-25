import pygeohash as pgh
import httpx
from typing import Optional
from starlette.concurrency import run_in_threadpool
from firebase_config import get_db
from models import Location
from config import settings

LOCATION_CACHE_COLLECTION = "location_cache"

def calculate_geohash(lat: float, lng: float, precision: int = 5) -> str:
    """Calculate geohash from latitude and longitude"""
    return pgh.encode(lat, lng, precision=precision)

async def resolve_location_from_zip(zip_code: str) -> Optional[Location]:
    """
    Check Firestore cache for zip code data.
    If missing, fetch from Google Geocoding and update cache.

    Returns None only when the zip code yields no geocoding results.
    All other failures (network errors, Firestore errors, bad API key) propagate
    as exceptions so callers can return accurate 4xx/5xx responses.
    """
    db = get_db()
    cache_ref = db.collection(LOCATION_CACHE_COLLECTION).document(zip_code)

    # Firestore client is synchronous — run in threadpool to avoid blocking the event loop
    cached = await run_in_threadpool(cache_ref.get)
    if cached.exists:
        # We use the cached data exists
        return Location(**cached.to_dict())

    # Cache miss: Call Google Maps
    if not getattr(settings, "GOOGLE_MAPS_API_KEY", None):
        raise RuntimeError("Google Maps API key not configured")

    async with httpx.AsyncClient(timeout=settings.GOOGLE_MAPS_API_TIMEOUT) as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": zip_code, "key": settings.GOOGLE_MAPS_API_KEY},
        )
    response.raise_for_status()

    data = response.json()
    api_status = data.get("status")
    if api_status != "OK":
        error_message = data.get("error_message", "Unknown error from Google Geocoding API")
        raise RuntimeError(
            f"Google Geocoding API error for {zip_code}: {api_status}: {error_message}"
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
    await run_in_threadpool(cache_ref.set, location_obj.model_dump(by_alias=True))

    return location_obj