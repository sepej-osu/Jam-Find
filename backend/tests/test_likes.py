import os
from pathlib import Path

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
import routers.likes as likes_module
import routers.posts as posts_module
likes_module.COLLECTION_NAME = "test_posts"
posts_module.COLLECTION_NAME = "test_posts"

# Mock the authentication to return test user ID
def override_get_current_user():
    return settings.DEV_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

# Store post_id for use across tests
test_post_id = None

def test_create_test_post():
    """Create a post to test likes on"""
    global test_post_id
    response = client.post(
        "/api/v1/posts",
        json={
            "title": "Test post for likes",
            "body": "This post is for testing the like functionality",
            "postType": "sharing_music",
            "genres": ["rock"]
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 201
    data = response.json()
    test_post_id = data["postId"]
    assert data["likes"] == 0
    print(f"Created test post with ID: {test_post_id}")

def test_like_post():
    """Like a post for the first time"""
    assert test_post_id is not None, "Must run test_create_test_post first"
    response = client.post(f"/api/v1/posts/{test_post_id}/like")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["postId"] == test_post_id
    assert data["likes"] == 1
    assert data["liked"] == True
    assert data["message"] == "Post liked successfully"

def test_verify_like_persisted():
    """Verify the like was saved by fetching the post"""
    assert test_post_id is not None
    response = client.get(f"/api/v1/posts/{test_post_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["likes"] == 1
    assert data["likedByCurrentUser"] == True

def test_unlike_post():
    """Unlike the post (toggle off)"""
    assert test_post_id is not None
    response = client.post(f"/api/v1/posts/{test_post_id}/like")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["postId"] == test_post_id
    assert data["likes"] == 0
    assert data["liked"] == False
    assert data["message"] == "Post unliked successfully"

def test_verify_unlike_persisted():
    """Verify the unlike was saved"""
    assert test_post_id is not None
    response = client.get(f"/api/v1/posts/{test_post_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["likes"] == 0
    assert data["likedByCurrentUser"] == False

def test_like_post_again():
    """Like the post again to prepare for multiple likes test"""
    assert test_post_id is not None
    response = client.post(f"/api/v1/posts/{test_post_id}/like")
    assert response.status_code == 200
    data = response.json()
    assert data["likes"] == 1
    assert data["liked"] == True

def test_edit_post_with_likes():
    """Verify likes persist through edits and edited flag is independent"""
    assert test_post_id is not None
    response = client.put(
        f"/api/v1/posts/{test_post_id}",
        json={"title": "Updated title for like test"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated title for like test"
    assert data["likes"] == 1  # Likes should be preserved

def test_verify_user_in_liked_by():
    """Verify user's like persists after editing and likedByCurrentUser flag is correct"""
    assert test_post_id is not None
    response = client.get(f"/api/v1/posts/{test_post_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["likes"] == 1
    assert data["likedByCurrentUser"] == True
    # Verify likedBy is not exposed in response for privacy
    assert "likedBy" not in data

def test_like_nonexistent_post():
    """Try to like a post that doesn't exist"""
    response = client.post("/api/v1/posts/nonexistent_post_id/like")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 404

def test_privacy_liked_by_not_exposed():
    """Verify that likedBy array is not exposed in API responses for privacy"""
    assert test_post_id is not None
    response = client.get(f"/api/v1/posts/{test_post_id}")
    assert response.status_code == 200
    data = response.json()
    # likedBy should not be in the response
    assert "likedBy" not in data
    # But we should have the privacy-friendly fields
    assert "likes" in data
    assert "likedByCurrentUser" in data

def test_liked_by_current_user_false_for_new_post():
    """Verify likedByCurrentUser is false for a post the user hasn't liked"""
    # Create a new post
    response = client.post(
        "/api/v1/posts",
        json={
            "title": "Another test post",
            "body": "Testing likedByCurrentUser flag",
            "postType": "looking_to_jam",
            "genres": ["jazz"]
        }
    )
    assert response.status_code == 201
    new_post_id = response.json()["postId"]
    
    # Fetch the post
    response = client.get(f"/api/v1/posts/{new_post_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["likedByCurrentUser"] == False
    assert data["likes"] == 0
    
    # Clean up
    client.delete(f"/api/v1/posts/{new_post_id}")

def test_cleanup_test_post():
    """Delete the test post"""
    assert test_post_id is not None
    response = client.delete(f"/api/v1/posts/{test_post_id}")
    print(f"Status: {response.status_code}")
    assert response.status_code == 204
