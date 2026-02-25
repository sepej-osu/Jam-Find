from fastapi import APIRouter, HTTPException, status, Depends
from models import Location
from auth import get_current_user
from utils.location import resolve_location_from_zip
from google.cloud import exceptions as gcp_exceptions

router = APIRouter()

@router.get("/location/resolve/{zip_code}", response_model=Location)
async def get_location_from_zip(
    zip_code: str,
    current_user_id: str = Depends(get_current_user)
):
    """
    Resolve a zip code to a full Location object (city, state, lat/lng, geohash).
    This hits the cache first, then Google Maps API if necessary.
    """
    try:
        resolved_location = resolve_location_from_zip(zip_code)
        
        if not resolved_location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not resolve location for zip code: {zip_code}"
            )
            
        return resolved_location

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except gcp_exceptions.GoogleCloudError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error while accessing location cache"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )