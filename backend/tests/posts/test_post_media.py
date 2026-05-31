"""
Tests for post media URL handling (photoUrl, photoThumbUrl, songUrl).

The backend stores URLs provided by the frontend after it uploads to Firebase
Storage. These tests verify that the backend correctly accepts, stores, returns,
validates, and updates those URLs.
"""

import os
from pathlib import Path
import pytest

backend_dir = Path(__file__).parent.parent.parent
os.chdir(backend_dir)

from config import get_settings
get_settings.cache_clear()
settings = get_settings()

from fastapi.testclient import TestClient
from main import app
from auth import get_current_user

import routers.posts as posts_module
import services.post_service as post_service_module
posts_module.COLLECTION_NAME = "test_posts_media"
post_service_module.COLLECTION_NAME = "test_posts_media"

def override_get_current_user():
    return settings.DEV_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

# Fake Firebase Storage URLs (realistic format, not real buckets)
FAKE_PHOTO_URL = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/posts%2Ftest_post%2Fphoto.jpg?alt=media&token=aaa111"
)
FAKE_PHOTO_THUMB_URL = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/posts%2Ftest_post%2Fphoto_thumb.jpg?alt=media&token=aaa222"
)
FAKE_SONG_URL = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/posts%2Ftest_post%2Fsong.mp3?alt=media&token=bbb111"
)
FAKE_SONG_URL_2 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/posts%2Ftest_post%2Fsong2.mp3?alt=media&token=bbb222"
)

BASE_POST = {
    "title": "Media test post",
    "body": "Testing media URL storage",
    "postType": "sharing_music",
}


@pytest.fixture(autouse=True)
def cleanup_posts(request):
    """Track and delete any posts created during the test."""
    created_ids = []
    yield created_ids
    for post_id in created_ids:
        client.delete(f"/api/v1/posts/{post_id}")


def _create(payload: dict, created_ids: list) -> dict:
    resp = client.post("/api/v1/posts", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    created_ids.append(data["postId"])
    return data


# ---------------------------------------------------------------------------
# Create with media
# ---------------------------------------------------------------------------

def test_create_post_with_photo(cleanup_posts):
    """Post created with photoUrl stores and returns the URL."""
    data = _create({**BASE_POST, "photoUrl": FAKE_PHOTO_URL}, cleanup_posts)
    assert data["photoUrl"] == FAKE_PHOTO_URL
    assert data["photoThumbUrl"] is None
    assert data["songUrl"] is None


def test_create_post_with_photo_and_thumb(cleanup_posts):
    """Post created with both photoUrl and photoThumbUrl stores both."""
    data = _create(
        {**BASE_POST, "photoUrl": FAKE_PHOTO_URL, "photoThumbUrl": FAKE_PHOTO_THUMB_URL},
        cleanup_posts,
    )
    assert data["photoUrl"] == FAKE_PHOTO_URL
    assert data["photoThumbUrl"] == FAKE_PHOTO_THUMB_URL


def test_create_post_with_song(cleanup_posts):
    """Post created with songUrl stores and returns the URL."""
    data = _create({**BASE_POST, "songUrl": FAKE_SONG_URL}, cleanup_posts)
    assert data["songUrl"] == FAKE_SONG_URL
    assert data["photoUrl"] is None


def test_create_post_with_all_media(cleanup_posts):
    """Post can carry photoUrl, photoThumbUrl, and songUrl simultaneously."""
    data = _create(
        {
            **BASE_POST,
            "photoUrl": FAKE_PHOTO_URL,
            "photoThumbUrl": FAKE_PHOTO_THUMB_URL,
            "songUrl": FAKE_SONG_URL,
        },
        cleanup_posts,
    )
    assert data["photoUrl"] == FAKE_PHOTO_URL
    assert data["photoThumbUrl"] == FAKE_PHOTO_THUMB_URL
    assert data["songUrl"] == FAKE_SONG_URL


def test_create_post_without_media(cleanup_posts):
    """All media fields are optional; omitting them results in null in the response."""
    data = _create(BASE_POST, cleanup_posts)
    assert data["photoUrl"] is None
    assert data["photoThumbUrl"] is None
    assert data["songUrl"] is None


# ---------------------------------------------------------------------------
# Read back persisted media
# ---------------------------------------------------------------------------

def test_get_post_returns_media_urls(cleanup_posts):
    """GET /posts/{id} returns the stored media URLs."""
    created = _create(
        {**BASE_POST, "photoUrl": FAKE_PHOTO_URL, "songUrl": FAKE_SONG_URL},
        cleanup_posts,
    )
    resp = client.get(f"/api/v1/posts/{created['postId']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["photoUrl"] == FAKE_PHOTO_URL
    assert data["songUrl"] == FAKE_SONG_URL


def test_list_posts_includes_media_urls(cleanup_posts):
    """GET /posts list includes media URLs for each post."""
    created = _create({**BASE_POST, "songUrl": FAKE_SONG_URL}, cleanup_posts)
    resp = client.get("/api/v1/posts?post_type=sharing_music")
    assert resp.status_code == 200
    posts = resp.json()["posts"]
    match = next((p for p in posts if p["postId"] == created["postId"]), None)
    assert match is not None
    assert match["songUrl"] == FAKE_SONG_URL


# ---------------------------------------------------------------------------
# Update media
# ---------------------------------------------------------------------------

def test_update_post_adds_song(cleanup_posts):
    """PATCH adds songUrl to a post that had none."""
    created = _create(BASE_POST, cleanup_posts)
    resp = client.patch(
        f"/api/v1/posts/{created['postId']}",
        json={"songUrl": FAKE_SONG_URL},
    )
    assert resp.status_code == 200
    assert resp.json()["songUrl"] == FAKE_SONG_URL
    assert resp.json()["edited"] is True


def test_update_post_replaces_song(cleanup_posts):
    """PATCH replaces an existing songUrl."""
    created = _create({**BASE_POST, "songUrl": FAKE_SONG_URL}, cleanup_posts)
    resp = client.patch(
        f"/api/v1/posts/{created['postId']}",
        json={"songUrl": FAKE_SONG_URL_2},
    )
    assert resp.status_code == 200
    assert resp.json()["songUrl"] == FAKE_SONG_URL_2


def test_update_post_clears_song(cleanup_posts):
    """PATCH with songUrl=null removes the audio sample."""
    created = _create({**BASE_POST, "songUrl": FAKE_SONG_URL}, cleanup_posts)
    resp = client.patch(
        f"/api/v1/posts/{created['postId']}",
        json={"songUrl": None},
    )
    assert resp.status_code == 200
    assert resp.json()["songUrl"] is None


def test_update_post_clears_photo(cleanup_posts):
    """PATCH with photoUrl=null removes the photo."""
    created = _create(
        {**BASE_POST, "photoUrl": FAKE_PHOTO_URL, "photoThumbUrl": FAKE_PHOTO_THUMB_URL},
        cleanup_posts,
    )
    resp = client.patch(
        f"/api/v1/posts/{created['postId']}",
        json={"photoUrl": None, "photoThumbUrl": None},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["photoUrl"] is None
    assert data["photoThumbUrl"] is None


# ---------------------------------------------------------------------------
# URL validation
# ---------------------------------------------------------------------------

def test_reject_non_https_photo_url():
    """photoUrl with http:// scheme is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={**BASE_POST, "photoUrl": "http://firebasestorage.googleapis.com/v0/b/bucket/o/file.jpg"},
    )
    assert resp.status_code == 422


def test_reject_non_firebase_photo_url():
    """photoUrl pointing to a non-Firebase host is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={**BASE_POST, "photoUrl": "https://example.com/photo.jpg"},
    )
    assert resp.status_code == 422


def test_reject_non_https_song_url():
    """songUrl with http:// scheme is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={**BASE_POST, "songUrl": "http://firebasestorage.googleapis.com/v0/b/bucket/o/song.mp3"},
    )
    assert resp.status_code == 422


def test_reject_non_firebase_song_url():
    """songUrl pointing to a non-Firebase host is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={**BASE_POST, "songUrl": "https://soundcloud.com/track/song.mp3"},
    )
    assert resp.status_code == 422


def test_reject_invalid_url_format():
    """Malformed URL string is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={**BASE_POST, "photoUrl": "not-a-url-at-all"},
    )
    assert resp.status_code == 422


def test_reject_multiple_photos():
    """Posts only support one photo; passing an array for photoUrl is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={
            **BASE_POST,
            "photoUrl": [FAKE_PHOTO_URL, FAKE_PHOTO_THUMB_URL],
        },
    )
    assert resp.status_code == 422


def test_reject_multiple_songs():
    """Posts only support one song; passing an array for songUrl is rejected with 422."""
    resp = client.post(
        "/api/v1/posts",
        json={
            **BASE_POST,
            "songUrl": [FAKE_SONG_URL, FAKE_SONG_URL_2],
        },
    )
    assert resp.status_code == 422
