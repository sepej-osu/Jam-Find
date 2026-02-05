import os
import sys

# Set working directory to backend folder
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(backend_dir)

os.environ["DEV_MODE"] = "True"
os.environ["DEV_USER_ID"] = "4s0oN9f77ThHVUhzJspTwrjFnFy1"

# Clear the settings cache BEFORE importing main
from config import get_settings
get_settings.cache_clear()

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_profile():
    """Create a real profile in Firebase"""
    response = client.post(
        "/api/v1/profiles",
        json={
            "user_id": "4s0oN9f77ThHVUhzJspTwrjFnFy1",
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
        "/api/v1/profiles/4s0oN9f77ThHVUhzJspTwrjFnFy1"
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200

def test_update_profile():
    """Update the profile"""
    response = client.put(
        "/api/v1/profiles/4s0oN9f77ThHVUhzJspTwrjFnFy1",
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
        "/api/v1/profiles/4s0oN9f77ThHVUhzJspTwrjFnFy1"
    )
    print(f"Status: {response.status_code}")
    assert response.status_code == 204