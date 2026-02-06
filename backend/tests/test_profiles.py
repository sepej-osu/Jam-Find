import os
from pathlib import Path

# Set working directory to backend folder
backend_dir = Path(__file__).parent.parent
os.chdir(backend_dir)

# Clear the settings cache BEFORE importing main
from config import get_settings
get_settings.cache_clear()

settings = get_settings()

from fastapi.testclient import TestClient
from main import app

# Override the collection name for tests
import routers.profiles as profiles_module
profiles_module.COLLECTION_NAME = "test_profiles"

client = TestClient(app)

def test_create_profile():
    """Create a real profile in Firebase"""
    response = client.post(
        "/api/v1/profiles",
        json={
            "user_id": settings.DEV_USER_ID,
            "email": "test@example.com",
            "bio": "Guitarist",
            "gender": "Male"
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
    response = client.put(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={
            "bio": "Updated Bio",
            "gender": "Female"
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