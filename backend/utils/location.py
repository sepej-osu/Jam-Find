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
    """Resolve location details from a zip code using pygeohash"""
    db = get_db()

    cache_ref = db.collection(LOCATION_CACHE_COLLECTION).document(zip_code)
    cached = cache_ref.get()

    if cached.exists:
        return Location(**cached.to_dict())

    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": zip_code, "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=settings.GOOGLE_MAPS_API_TIMEOUT
        )
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Geocoding API error: {e}")
        return None

    results = response.json().get("results")
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

    # Cache the result in Firestore for future lookups
    cache_ref.set(location_obj.model_dump(by_alias=True))

    return location_obj