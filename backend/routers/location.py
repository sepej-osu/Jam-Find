import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user
from config import settings


# All location-related endpoints live under /location
router = APIRouter(prefix="/location", tags=["Location"])

# Google Maps config
GOOGLE_MAPS_API_KEY = settings.GOOGLE_MAPS_API_KEY
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def ensure_api_key():
    """Make sure the Google Maps API key exists"""
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Maps API key is not configured",
        )


def extract_city_state(components: list):
    """Pull city and state from Google address components"""
    city = None
    state = None

    for c in components:
        types = c.get("types", [])

        if "locality" in types and not city:
            city = c.get("long_name")

        # Some locations use postal_town instead of locality
        if "postal_town" in types and not city:
            city = c.get("long_name")

        if "administrative_area_level_1" in types and not state:
            state = c.get("short_name")

    return city, state


@router.get("/geocode")
async def geocode_address(
    address: str,
    _: str = Depends(get_current_user),
):
    """
    Convert an address or city name into:
    city, state, latitude, longitude
    """
    ensure_api_key()

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            GEOCODE_URL,
            params={
                "address": address,
                "key": GOOGLE_MAPS_API_KEY,
            },
        )

    data = response.json()
    results = data.get("results", [])

    if not results:
        raise HTTPException(status_code=404, detail="Location not found")

    result = results[0]
    location = result["geometry"]["location"]
    city, state = extract_city_state(result["address_components"])

    return {
        "city": city,
        "state": state,
        "lat": location["lat"],
        "lng": location["lng"],
        "formatted_address": result.get("formatted_address"),
    }


@router.get("/reverse")
async def reverse_geocode(
    lat: float,
    lng: float,
    _: str = Depends(get_current_user),
):
    """
    Convert latitude and longitude into:
    city and state
    """
    ensure_api_key()

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            GEOCODE_URL,
            params={
                "latlng": f"{lat},{lng}",
                "key": GOOGLE_MAPS_API_KEY,
            },
        )

    data = response.json()
    results = data.get("results", [])

    if not results:
        raise HTTPException(status_code=404, detail="Location not found")

    result = results[0]
    city, state = extract_city_state(result["address_components"])

    return {
        "city": city,
        "state": state,
        "lat": lat,
        "lng": lng,
        "formatted_address": result.get("formatted_address"),
    }
