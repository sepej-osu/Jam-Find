import os
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch
from utils.location import normalize_zip_code, calculate_geohash, haversine_miles, bounding_box_from_miles

# Set working directory to backend folder, matching the pattern in other backend tests
backend_dir = Path(__file__).parent.parent.parent
os.chdir(backend_dir)

# Clear the settings cache BEFORE importing main so .env is loaded consistently
from config import get_settings
get_settings.cache_clear()

settings = get_settings()

from fastapi.testclient import TestClient
from main import app
from auth import get_current_user
from models import Location

@pytest.fixture
def client():
    # Use a lambda for a quick override
    app.dependency_overrides[get_current_user] = lambda: settings.DEV_USER_ID
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_resolve_location_success(client):
    test_zip = "97209"
    mock_location = Location(
        placeId="mock_id",
        formattedAddress="Portland, OR",
        zipCode=test_zip,
        lat=45.5,
        lng=-122.7,
        geohash="c20dz"
    )

    with patch("routers.location.resolve_location_from_zip", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.return_value = mock_location
        response = client.get(f"/api/v1/location/resolve/{test_zip}")
        assert response.status_code == 200

def test_resolve_location_not_found(client):
    with patch("routers.location.resolve_location_from_zip", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.return_value = None
        response = client.get("/api/v1/location/resolve/00000")
        assert response.status_code == 404

def test_resolve_location_unauthorized(client):
    # To test 401, we mock the auth dependency to raise the error
    def mock_auth_fail():
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Unauthorized")

    app.dependency_overrides[get_current_user] = mock_auth_fail
    response = client.get("/api/v1/location/resolve/90210")
    assert response.status_code == 401


def test_resolve_location_invalid_zip(client):
    with patch("routers.location.resolve_location_from_zip", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.side_effect = ValueError("Invalid ZIP code format")
        response = client.get("/api/v1/location/resolve/not-a-zip")
        assert response.status_code == 400


def test_resolve_location_gcp_error(client):
    from google.cloud import exceptions as gcp_exceptions
    with patch("routers.location.resolve_location_from_zip", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.side_effect = gcp_exceptions.GoogleCloudError("Firestore unavailable")
        response = client.get("/api/v1/location/resolve/97209")
        assert response.status_code == 503


def test_resolve_location_unexpected_error(client):
    with patch("routers.location.resolve_location_from_zip", new_callable=AsyncMock) as mock_resolve:
        mock_resolve.side_effect = RuntimeError("Unexpected failure")
        response = client.get("/api/v1/location/resolve/97209")
        assert response.status_code == 500


@pytest.mark.parametrize("zip_input,expected", [
    ("97209", "97209"),
    (" 97209 ", "97209"),
    ("97209-1234", "97209-1234"),
])
def test_normalize_zip_code_valid(zip_input, expected):
    assert normalize_zip_code(zip_input) == expected


@pytest.mark.parametrize("bad_zip", [
    "",
    "9720",       # too short
    "972090",     # too long
    "abcde",      # non-numeric
    "97209-123",  # ZIP+4 too short
    "97209-12345",# ZIP+4 too long
    "9720 9",     # internal space
])
def test_normalize_zip_code_invalid(bad_zip):
    with pytest.raises(ValueError):
        normalize_zip_code(bad_zip)


# --- calculate_geohash ---

def test_calculate_geohash_default_precision():
    result = calculate_geohash(45.5, -122.7)
    assert isinstance(result, str)
    assert len(result) == 5


def test_calculate_geohash_known_value():
    # Portland-area coordinates used throughout the test suite
    assert calculate_geohash(45.5, -122.7, precision=5) == "c20dz"


def test_calculate_geohash_custom_precision():
    result = calculate_geohash(45.5, -122.7, precision=8)
    assert len(result) == 8


# --- haversine_miles ---

def test_haversine_miles_same_point():
    assert haversine_miles(45.5, -122.7, 45.5, -122.7) == pytest.approx(0.0, abs=0.01)


def test_haversine_miles_known_distance():
    # Portland, OR to Seattle, WA — approximately 145 miles
    result = haversine_miles(45.5231, -122.6765, 47.6062, -122.3321)
    assert result == pytest.approx(145, abs=5)


# --- bounding_box_from_miles ---

def test_bounding_box_from_miles_structure():
    min_lat, max_lat, min_lng, max_lng = bounding_box_from_miles(45.5, -122.7, 10)
    assert min_lat < 45.5 < max_lat
    assert min_lng < -122.7 < max_lng


def test_bounding_box_from_miles_pole_longitude_unconstrained():
    # At the north pole cos(lat) ≈ 0, so longitude should be unconstrained
    min_lat, max_lat, min_lng, max_lng = bounding_box_from_miles(90.0, 0.0, 10)
    assert min_lng == -180.0
    assert max_lng == 180.0


def test_bounding_box_from_miles_large_radius_clamps_lat():
    # A large radius near a pole must not push lat outside ±90
    min_lat, max_lat, min_lng, max_lng = bounding_box_from_miles(80.0, 0.0, 1000)
    assert min_lat >= -90.0
    assert max_lat <= 90.0