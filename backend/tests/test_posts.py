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
                {"name": "drums", "skillLevel": 3}
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
    assert isinstance(data, dict)
    assert "posts" in data
    assert len(data["posts"]) >= 2  # Should have at least our 2 test posts

@pytest.mark.skip(
    reason=(
        "Requires a Firestore composite index on userId and createdAt for the test to pass."
    )
)
def test_list_posts_by_user():
    """List posts filtered by userId"""
    response = client.get(
        f"/api/v1/posts?user_id={settings.DEV_USER_ID}"
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, dict)
    assert "posts" in data
    
    posts = data["posts"]
    assert isinstance(posts, list)
    
    for post in posts:
        assert post["userId"] == settings.DEV_USER_ID

# @pytest.mark.skip(
#     reason=(
#         "Requires a Firestore composite index on (location.geohash ASC, createdAt DESC). "
#         "Create it at https://console.firebase.google.com or via the link "
#         "in the Firestore error response before running this test. "
#         "Alternatively, run against a Firestore emulator with indexes pre-configured."
#     )
# )
def test_list_posts_by_geohash():
    """Test that nearby_geohash only returns posts within the 4-char geohash prefix radius"""
    # Create a nearby post (Los Angeles, geohash prefix "9q5c")
    nearby_resp = client.post(
        "/api/v1/posts",
        json={
            "title": "Geohash test: nearby (LA)",
            "body": "This post should appear in a search centred on Los Angeles",
            "postType": "looking_to_jam",
            "location": {
                "formattedAddress": "Los Angeles, CA",
                "lat": 34.0522,
                "lng": -118.2437,
                "geohash": "9q5cs"
            }
        }
    )
    #print(f"Status: {nearby_resp.status_code}")
    #print(f"Response: {nearby_resp.text}")
    assert nearby_resp.status_code == 201
    nearby_post_id = nearby_resp.json()["postId"]

    # Create a far post (New York, geohash prefix "dr5r" — no overlap with "9q5c")
    far_resp = client.post(
        "/api/v1/posts",
        json={
            "title": "Geohash test: far (NYC)",
            "body": "This post should NOT appear in a search centred on Los Angeles",
            "postType": "looking_to_jam",
            "location": {
                "formattedAddress": "New York, NY",
                "lat": 40.7128,
                "lng": -74.0060,
                "geohash": "dr5ru"
            }
        }
    )
    #print(f"Status: {far_resp.status_code}")
    #print(f"Response: {far_resp.text}")
    assert far_resp.status_code == 201
    far_post_id = far_resp.json()["postId"]

    try:
        # Search with an LA geohash — prefix used by the query is "9q5c"
        response = client.get("/api/v1/posts?nearby_geohash=9q5cs")
        #print(f"Status: {response.status_code}")
        #print(f"Response: {response.text}")
        assert response.status_code == 200
        returned_ids = [p["postId"] for p in response.json()["posts"]]

        assert nearby_post_id in returned_ids, "Nearby (LA) post should be in results"
        assert far_post_id not in returned_ids, "Far (NYC) post should not be in results"
    finally:
        # Always clean up, even if assertions fail
        client.delete(f"/api/v1/posts/{nearby_post_id}")
        client.delete(f"/api/v1/posts/{far_post_id}")


def test_list_posts_with_pagination():
    """Test pagination: Fetch page 1, get token, fetch page 2"""
    
    response = client.get("/api/v1/posts?limit=1")
    assert response.status_code == 200
    
    data = response.json()
    
    assert "posts" in data
    assert len(data["posts"]) == 1
    assert "nextPageToken" in data
    
    first_post_id = data["posts"][0]["postId"]
    token = data["nextPageToken"]

    assert token is not None, "Test requires at least 2 posts in the DB to verify tokens."
    response_page_2 = client.get(f"/api/v1/posts?limit=1&last_doc_id={token}")
    assert response_page_2.status_code == 200
    
    data_2 = response_page_2.json()
    
    assert len(data_2["posts"]) == 1
    second_post_id = data_2["posts"][0]["postId"]
    assert first_post_id != second_post_id

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
