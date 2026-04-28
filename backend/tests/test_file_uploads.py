"""
Tests for profile file upload URL handling.

The backend does not perform storage uploads — Firebase Storage uploads are done
from the frontend. These tests verify that the backend correctly stores, returns,
validates, and updates the resulting download URLs for profile pictures and music
samples.
"""
import os
from pathlib import Path
import pytest

backend_dir = Path(__file__).parent.parent
os.chdir(backend_dir)

from config import get_settings
get_settings.cache_clear()
settings = get_settings()

from fastapi.testclient import TestClient
from main import app
from auth import get_current_user

import routers.profiles as profiles_module
profiles_module.COLLECTION_NAME = "test_profiles"

def override_get_current_user():
    return settings.DEV_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

# Fake Firebase Storage download URLs (realistic format, not real buckets)
FAKE_PIC_URL = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fprofile-picture%2Ftest.jpg?alt=media&token=abc123"
)
FAKE_PIC_URL_2 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fprofile-picture%2Ftest2.jpg?alt=media&token=def456"
)
FAKE_SAMPLE_URL_1 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fmusic%2Fsample1.mp3?alt=media&token=aaa111"
)
FAKE_SAMPLE_URL_2 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fmusic%2Fsample2.mp3?alt=media&token=bbb222"
)
FAKE_SAMPLE_URL_3 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fmusic%2Fsample3.mp3?alt=media&token=ccc333"
)
FAKE_SAMPLE_URL_4 = (
    "https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com"
    "/o/users%2Ftest_user%2Fmusic%2Fsample4.mp3?alt=media&token=ddd444"
)

BASE_PROFILE = {
    "userId": settings.DEV_USER_ID,
    "firstName": "Upload",
    "lastName": "Tester",
    "email": "uploadtest@example.com",
    "gender": "prefer_not_to_say",
}


@pytest.fixture(autouse=True)
def cleanup():
    """Delete the test profile before and after each test so tests are independent."""
    client.delete(f"/api/v1/profiles/{settings.DEV_USER_ID}")
    yield
    client.delete(f"/api/v1/profiles/{settings.DEV_USER_ID}")


# ─── Profile picture ──────────────────────────────────────────────────────────

def test_create_profile_with_profile_pic():
    """Profile can be created with a profilePicUrl; URL is returned in response."""
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "profilePicUrl": FAKE_PIC_URL})
    assert response.status_code == 201
    data = response.json()
    assert data["profilePicUrl"] == FAKE_PIC_URL


def test_create_profile_without_profile_pic():
    """profilePicUrl is optional; omitting it results in null in the response."""
    response = client.post("/api/v1/profiles", json=BASE_PROFILE)
    assert response.status_code == 201
    assert response.json()["profilePicUrl"] is None


def test_update_profile_pic():
    """Updating profilePicUrl replaces the old URL."""
    client.post("/api/v1/profiles", json={**BASE_PROFILE, "profilePicUrl": FAKE_PIC_URL})
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"profilePicUrl": FAKE_PIC_URL_2},
    )
    assert response.status_code == 200
    assert response.json()["profilePicUrl"] == FAKE_PIC_URL_2


def test_clear_profile_pic():
    """Setting profilePicUrl to null removes the picture URL."""
    client.post("/api/v1/profiles", json={**BASE_PROFILE, "profilePicUrl": FAKE_PIC_URL})
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"profilePicUrl": None},
    )
    assert response.status_code == 200
    assert response.json()["profilePicUrl"] is None


# ─── Music samples ────────────────────────────────────────────────────────────

def test_create_profile_with_music_samples():
    """Profile can be created with up to 3 music samples; all are returned."""
    samples = [
        {"url": FAKE_SAMPLE_URL_1, "title": "Track One"},
        {"url": FAKE_SAMPLE_URL_2, "title": "Track Two"},
    ]
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "musicSamples": samples})
    assert response.status_code == 201
    returned = response.json()["musicSamples"]
    assert len(returned) == 2
    assert returned[0]["url"] == FAKE_SAMPLE_URL_1
    assert returned[0]["title"] == "Track One"
    assert returned[1]["url"] == FAKE_SAMPLE_URL_2


def test_create_profile_with_max_music_samples():
    """Exactly 3 music samples is accepted."""
    samples = [
        {"url": FAKE_SAMPLE_URL_1, "title": "Track 1"},
        {"url": FAKE_SAMPLE_URL_2, "title": "Track 2"},
        {"url": FAKE_SAMPLE_URL_3, "title": "Track 3"},
    ]
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "musicSamples": samples})
    assert response.status_code == 201
    assert len(response.json()["musicSamples"]) == 3


def test_create_profile_exceeds_max_music_samples():
    """More than 3 music samples is rejected with 422."""
    samples = [
        {"url": FAKE_SAMPLE_URL_1, "title": "Track 1"},
        {"url": FAKE_SAMPLE_URL_2, "title": "Track 2"},
        {"url": FAKE_SAMPLE_URL_3, "title": "Track 3"},
        {"url": FAKE_SAMPLE_URL_4, "title": "Track 4"},
    ]
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "musicSamples": samples})
    assert response.status_code == 422


def test_music_sample_title_too_long():
    """A music sample title exceeding 100 characters is rejected with 422."""
    samples = [{"url": FAKE_SAMPLE_URL_1, "title": "A" * 101}]
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "musicSamples": samples})
    assert response.status_code == 422


def test_music_sample_title_optional():
    """A music sample without a title is accepted (title is optional)."""
    samples = [{"url": FAKE_SAMPLE_URL_1}]
    response = client.post("/api/v1/profiles", json={**BASE_PROFILE, "musicSamples": samples})
    assert response.status_code == 201
    assert response.json()["musicSamples"][0]["title"] is None


def test_update_adds_music_samples():
    """Updating a profile to add music samples stores and returns them."""
    client.post("/api/v1/profiles", json=BASE_PROFILE)
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"musicSamples": [{"url": FAKE_SAMPLE_URL_1, "title": "My Track"}]},
    )
    assert response.status_code == 200
    samples = response.json()["musicSamples"]
    assert len(samples) == 1
    assert samples[0]["url"] == FAKE_SAMPLE_URL_1
    assert samples[0]["title"] == "My Track"


def test_update_replaces_music_samples():
    """Updating musicSamples replaces the entire list, not appends."""
    client.post(
        "/api/v1/profiles",
        json={**BASE_PROFILE, "musicSamples": [{"url": FAKE_SAMPLE_URL_1, "title": "Old"}]},
    )
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"musicSamples": [{"url": FAKE_SAMPLE_URL_2, "title": "New"}]},
    )
    assert response.status_code == 200
    samples = response.json()["musicSamples"]
    assert len(samples) == 1
    assert samples[0]["url"] == FAKE_SAMPLE_URL_2


def test_update_clears_music_samples():
    """Setting musicSamples to an empty list removes all samples."""
    client.post(
        "/api/v1/profiles",
        json={**BASE_PROFILE, "musicSamples": [{"url": FAKE_SAMPLE_URL_1, "title": "Track"}]},
    )
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"musicSamples": []},
    )
    assert response.status_code == 200
    assert response.json()["musicSamples"] == []


def test_update_exceeds_max_music_samples():
    """Updating with more than 3 music samples is rejected with 422."""
    client.post("/api/v1/profiles", json=BASE_PROFILE)
    samples = [
        {"url": FAKE_SAMPLE_URL_1, "title": "1"},
        {"url": FAKE_SAMPLE_URL_2, "title": "2"},
        {"url": FAKE_SAMPLE_URL_3, "title": "3"},
        {"url": FAKE_SAMPLE_URL_4, "title": "4"},
    ]
    response = client.patch(
        f"/api/v1/profiles/{settings.DEV_USER_ID}",
        json={"musicSamples": samples},
    )
    assert response.status_code == 422


# ─── Combined ────────────────────────────────────────────────────────────────

def test_create_profile_with_pic_and_samples():
    """Profile can be created with both a profilePicUrl and musicSamples."""
    response = client.post(
        "/api/v1/profiles",
        json={
            **BASE_PROFILE,
            "profilePicUrl": FAKE_PIC_URL,
            "musicSamples": [
                {"url": FAKE_SAMPLE_URL_1, "title": "Intro"},
                {"url": FAKE_SAMPLE_URL_2, "title": "Solo"},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["profilePicUrl"] == FAKE_PIC_URL
    assert len(data["musicSamples"]) == 2
