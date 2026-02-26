import os
from pathlib import Path
import pytest

# Set working directory to backend folder
backend_dir = Path(__file__).parent.parent
os.chdir(backend_dir)

# Clear the settings cache BEFORE importing main
from config import get_settings
get_settings.cache_clear()

# This will load the test settings from .env
settings = get_settings()

from fastapi.testclient import TestClient
from main import app
from auth import get_current_user

# Override the collection name for tests
import routers.profiles as profiles_module
profiles_module.COLLECTION_NAME = "test_profiles"

# Mock the authentication to return test user ID
def override_get_current_user():
    return settings.DEV_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_create_profile():
    """Create a real profile in Firebase"""
    response = client.post(
        "/api/v1/profiles",
        json={
            "user_id": settings.DEV_USER_ID,
            "firstName": "Test",
            "lastName": "User",
            "birthDate": "1990-01-01T00:00:00Z",
            "email": "test@example.com",
            "bio": "Guitarist",
            "gender": "male"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 201

def test_get_profile():
    """Get the profile we just created"""
    response = client.get(
        f"/api/v1/profiles/{settings.DEV_USER_ID}"
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200

def test_update_profile():
    """Update the profile"""
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={
            "bio": "Updated Bio",
            "gender": "female"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200

def test_delete_profile():
    """Clean up - delete the test profile"""
    response = client.delete(
        f"/api/v1/profiles/{settings.DEV_USER_ID}"
    )
    print(f"Status: {response.status_code}")
    assert response.status_code == 204