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
import routers.posts as posts_module
posts_module.COLLECTION_NAME = "test_posts"

# Mock the authentication to return test user ID
def override_get_current_user():
    return settings.DEV_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

# Store post_id for use across tests
created_post_id = None
second_post_id = None

def test_create_post():
    """Create a real post in Firebase"""
    global created_post_id
    response = client.post(
        "/api/v1/posts",
        json={
            "title": "Looking for a drummer",
            "body": "We're a rock band looking for a drummer with 3+ years experience",
            "postType": "looking_for_musicians",
            "genres": ["rock", "alternative"],
            "instruments": [
                {"name": "drums", "experienceLevel": 3}
            ],
            "location": {
                "formattedAddress": "Los Angeles, CA",
                "lat": 34.0522,
                "lng": -118.2437,
                "geohash": "9q5cs"
            }
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 201
    data = response.json()
    assert "postId" in data
    assert data["likes"] == 0  # New posts should have 0 likes
    assert data["edited"] == False  # New posts should not be edited
    created_post_id = data["postId"]
    print(f"Created post with ID: {created_post_id}")

def test_create_second_post():
    """Create another post to test multiple posts"""
    global second_post_id
    response = client.post(
        "/api/v1/posts",
        json={
            "title": "Jam session this weekend",
            "body": "Looking for musicians to jam with on Saturday",
            "postType": "looking_to_jam",
            "genres": ["jazz", "blues"]
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 201
    data = response.json()
    second_post_id = data["postId"]
    print(f"Created second post with ID: {second_post_id}")

def test_get_post():
    """Get the post we just created"""
    assert created_post_id is not None, "Must run test_create_post first"
    response = client.get(
        f"/api/v1/posts/{created_post_id}"
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Looking for a drummer"
    assert data["postType"] == "looking_for_musicians"
    assert data["likes"] == 0  # Should still have 0 likes
    assert data["edited"] == False  # Should not be edited yet

def test_list_all_posts():
    """List all posts"""
    response = client.get("/api/v1/posts")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # Should have at least our 2 test posts

@pytest.mark.skip(reason="Requires Firebase composite index (userId + created_at). Create it by clicking the link in the error or remove this skip.")
def test_list_posts_by_user():
    """List posts filtered by user_id"""
    response = client.get(
        f"/api/v1/posts?user_id={settings.DEV_USER_ID}"
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # All posts should belong to the test user
    for post in data:
        assert post["userId"] == settings.DEV_USER_ID

def test_list_posts_with_pagination():
    """Test pagination with limit"""
    response = client.get("/api/v1/posts?limit=1")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_update_post():
    """Update the post"""
    assert created_post_id is not None, "Must run test_create_post first"
    response = client.patch(
        f"/api/v1/posts/{created_post_id}",
        json={
            "title": "Updated: Looking for a drummer",
            "body": "Updated description with more details",
            "genres": ["rock", "metal", "alternative"]
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated: Looking for a drummer"
    assert "metal" in data["genres"]
    assert data["edited"] == True  # Should be marked as edited

def test_delete_first_post():
    """Clean up - delete the first test post"""
    assert created_post_id is not None, "Must run test_create_post first"
    response = client.delete(
        f"/api/v1/posts/{created_post_id}"
    )
    print(f"Status: {response.status_code}")
    assert response.status_code == 204

def test_delete_second_post():
    """Clean up - delete the second test post"""
    assert second_post_id is not None, "Must run test_create_second_post first"
    response = client.delete(
        f"/api/v1/posts/{second_post_id}"
    )
    print(f"Status: {response.status_code}")
    assert response.status_code == 204

def test_get_deleted_post():
    """Verify post is deleted"""
    assert created_post_id is not None
    response = client.get(
        f"/api/v1/posts/{created_post_id}"
    )
    print(f"Status: {response.status_code}")
    assert response.status_code == 404
