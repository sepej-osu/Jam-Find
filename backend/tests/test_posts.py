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
import services.post_service as post_service_module
posts_module.COLLECTION_NAME = "test_posts"
post_service_module.COLLECTION_NAME = "test_posts"

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

def test_list_posts_by_geohash():
    """Test that radius filtering (user_lat/user_lng/radius_miles) returns only nearby posts"""
    # Create a nearby post (Los Angeles)
    nearby_resp = client.post(
        "/api/v1/posts",
        json={
            "title": "Geo test: nearby (LA)",
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
    assert nearby_resp.status_code == 201
    nearby_post_id = nearby_resp.json()["postId"]

    # Create a far post (New York, ~2445 mi away)
    far_resp = client.post(
        "/api/v1/posts",
        json={
            "title": "Geo test: far (NYC)",
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
    assert far_resp.status_code == 201
    far_post_id = far_resp.json()["postId"]

    try:
        # Search centred on LA within 50 miles — NYC post should be excluded
        response = client.get(
            "/api/v1/posts?user_lat=34.0522&user_lng=-118.2437&radius_miles=50"
        )
        assert response.status_code == 200
        returned_ids = [p["postId"] for p in response.json()["posts"]]

        assert nearby_post_id in returned_ids, "Nearby (LA) post should be in results"
        assert far_post_id not in returned_ids, "Far (NYC) post should not be in results"
    finally:
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


# ---------------------------------------------------------------------------
# Distance sort, radius filtering, and page-based pagination
# ---------------------------------------------------------------------------

class TestDistanceSort:
    """
    Integration tests for sort_by=distance.

    Each test method creates its own posts (postType='sharing_music' to avoid
    collisions with other test data) and cleans them up in teardown.

    Reference point: downtown Los Angeles (34.0522, -118.2437).
    Each 0.1° latitude ≈ 6.9 miles, so the three "near" coordinates land at
    roughly 0 mi, 7 mi, and 14 mi from the reference.
    """

    USER_LAT = 34.0522
    USER_LNG = -118.2437

    NEAR_1 = (34.0522, -118.2437)   # ~0 mi
    NEAR_2 = (34.1522, -118.2437)   # ~6.9 mi
    NEAR_3 = (34.2522, -118.2437)   # ~13.8 mi
    FAR    = (40.7128, -74.0060)    # ~2445 mi (New York)

    def setup_method(self):
        self._post_ids: list[str] = []

    def teardown_method(self):
        for pid in self._post_ids:
            client.delete(f"/api/v1/posts/{pid}")
        self._post_ids = []

    def _create(self, title: str, lat: float, lng: float) -> str:
        resp = client.post("/api/v1/posts", json={
            "title": title,
            "body": "Distance sort test",
            "postType": "sharing_music",
            "location": {"formattedAddress": "Test", "lat": lat, "lng": lng},
        })
        assert resp.status_code == 201
        pid = resp.json()["postId"]
        self._post_ids.append(pid)
        return pid

    def _query(self, **extra):
        return client.get("/api/v1/posts", params={
            "sort_by": "distance",
            "post_type": "sharing_music",
            "user_lat": self.USER_LAT,
            "user_lng": self.USER_LNG,
            "radius_miles": 25,
            **extra,
        })

    def test_distance_sort_asc(self):
        """Results are ordered nearest-first when sort_order=asc."""
        id_0  = self._create("dist_asc_0mi",  *self.NEAR_1)
        id_7  = self._create("dist_asc_7mi",  *self.NEAR_2)
        id_14 = self._create("dist_asc_14mi", *self.NEAR_3)

        resp = self._query(sort_order="asc")
        assert resp.status_code == 200
        ids = [p["postId"] for p in resp.json()["posts"]]

        assert id_0  in ids
        assert id_7  in ids
        assert id_14 in ids
        assert ids.index(id_0) < ids.index(id_7) < ids.index(id_14)

    def test_distance_sort_desc(self):
        """Results are ordered furthest-first when sort_order=desc."""
        id_0  = self._create("dist_desc_0mi",  *self.NEAR_1)
        id_7  = self._create("dist_desc_7mi",  *self.NEAR_2)
        id_14 = self._create("dist_desc_14mi", *self.NEAR_3)

        resp = self._query(sort_order="desc")
        assert resp.status_code == 200
        ids = [p["postId"] for p in resp.json()["posts"]]

        assert id_0  in ids
        assert id_7  in ids
        assert id_14 in ids
        assert ids.index(id_14) < ids.index(id_7) < ids.index(id_0)

    def test_radius_filtering_excludes_far_posts(self):
        """Posts outside the radius are excluded; posts inside are included."""
        id_near = self._create("dist_radius_near", *self.NEAR_2)  # ~7 mi — inside 25 mi
        id_far  = self._create("dist_radius_far",  *self.FAR)     # ~2445 mi — outside

        resp = self._query(sort_order="asc")
        assert resp.status_code == 200
        ids = [p["postId"] for p in resp.json()["posts"]]

        assert id_near in ids
        assert id_far  not in ids

    def test_distance_pagination(self):
        """
        page=0 and page=1 return non-overlapping slices.
        nextPageToken is present after page 0 and absent after the last page.
        """
        id_0  = self._create("dist_page_0mi",  *self.NEAR_1)
        id_7  = self._create("dist_page_7mi",  *self.NEAR_2)
        id_14 = self._create("dist_page_14mi", *self.NEAR_3)

        # Page 0: limit=2 → 2 posts, nextPageToken present
        resp0 = self._query(sort_order="asc", limit=2, page=0)
        assert resp0.status_code == 200
        data0 = resp0.json()
        assert len(data0["posts"]) == 2
        assert data0["nextPageToken"] is not None

        # Page 1: limit=2 → 1 remaining post, no nextPageToken
        resp1 = self._query(sort_order="asc", limit=2, page=int(data0["nextPageToken"]))
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert len(data1["posts"]) == 1
        assert data1["nextPageToken"] is None

        # Pages must be disjoint and together cover all three posts
        ids0 = {p["postId"] for p in data0["posts"]}
        ids1 = {p["postId"] for p in data1["posts"]}
        assert ids0.isdisjoint(ids1)
        assert ids0 | ids1 == {id_0, id_7, id_14}
