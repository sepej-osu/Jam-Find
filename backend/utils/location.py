import pygeohash as pgh
import requests
from firebase_config import get_db

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
        return cached.to_dict()

    response = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={"address": zip_code, "key": settings.GOOGLE_MAPS_API_KEY},
        timeout=settings.GOOGLE_MAPS_API_TIMEOUT
    )
    repsponse.raise_for_status()
    results = response.json().get("results")
    if not results:
        raise ValueError(f"No location found for zip code: {zip_code}")

    result = results[0]
    lat = result["geometry"]["location"]["lat"]
    lng = result["geometry"]["location"]["lng"]
    formatted_address = result["formatted_address"]
    place_id = result["place_id"]
    geohash = calculate_geohash(lat, lng)

    location_data = {
        "zipCode": zip_code,
        "formattedAddress": formatted_address,
        "lat": lat,
        "lng": lng,
        "placeId": place_id,
        "geohash": geohash
    }
    
    # Cache the result in Firestore for future lookups
    cache_ref.set(location_data)

    return location_data