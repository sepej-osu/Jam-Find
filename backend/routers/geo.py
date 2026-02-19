from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import requests

from auth import get_current_user
from config import settings

router = APIRouter()

class ZipGeoResponse(BaseModel):
    zip_code: str = Field(..., alias="zipCode")
    lat: float
    lng: float
    formatted_address: str = Field(..., alias="formattedAddress")

def _is_valid_zip(zip_code: str) -> bool:
    z = (zip_code or "").strip()
    return len(z) == 5 and z.isdigit()

def geocode_zip(zip_code: str) -> ZipGeoResponse:
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=500, detail="Geocoding service is not configured")

    z = zip_code.strip()
    if not _is_valid_zip(z):
        raise HTTPException(status_code=422, detail="Invalid ZIP code. Expected 5 digits.")

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": z,
        "key": settings.GOOGLE_MAPS_API_KEY
    }

    try:
        r = requests.get(url, params=params, timeout=5)
        r.raise_for_status()
        data = r.json()
    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Geocoding request timed out. Please try again."
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Geocoding service is currently unavailable")

    geo_status = data.get("status")
    if geo_status != "OK" or not data.get("results"):
        raise HTTPException(status_code=400, detail=f"Geocoding failed: {geo_status}")

    result = data["results"][0]
    loc = result["geometry"]["location"]
    formatted = result.get("formatted_address", z)

    return ZipGeoResponse(
        zipCode=z,
        lat=float(loc["lat"]),
        lng=float(loc["lng"]),
        formattedAddress=formatted
    )

@router.get("/geo/zip/{zip_code}", response_model=ZipGeoResponse)
async def get_zip_geo(zip_code: str, current_user_id: str = Depends(get_current_user)):
    # user must be logged in (same pattern as your other routes)
    return geocode_zip(zip_code)