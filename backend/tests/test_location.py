import os
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch

# Set working directory to backend folder, matching the pattern in other backend tests
backend_dir = Path(__file__).parent.parent
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