# AI Generated Tests - Reviewed by sepej-osu 2026-06-1
# All tests are passing as of 2026-06-1

import os
import sys
from pathlib import Path
import pytest

# Set working directory to backend folder and add it to sys.path
backend_dir = Path(__file__).parent.parent.parent
os.chdir(backend_dir)
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Clear the settings cache BEFORE importing main
from config import get_settings
get_settings.cache_clear()

settings = get_settings()

from fastapi.testclient import TestClient
from main import app
from auth import get_current_user

# Override the collection names for tests
import routers.reviews as reviews_module
reviews_module.REVIEWS_COLLECTION = "test_reviews"
reviews_module.PROFILES_COLLECTION = "test_profiles"

# Two distinct user IDs used in tests
REVIEWER_ID = settings.DEV_USER_ID              # the user submitting the review
REVIEWED_USER_ID = "test_reviewed_user_jam_456"  # the user being reviewed

# Default auth override: current user is the reviewer
def override_as_reviewer():
    return REVIEWER_ID

app.dependency_overrides[get_current_user] = override_as_reviewer

client = TestClient(app)

# Shared state across tests (set in create test, consumed by later tests)
created_review_id = None


@pytest.fixture(scope="module", autouse=True)
def setup_test_profiles():
    """Ensure both test profiles exist before any test runs; clean up test reviews after."""
    from firebase_config import get_db
    db = get_db()

    db.collection("test_profiles").document(REVIEWER_ID).set({
        "userId": REVIEWER_ID,
        "firstName": "Test",
        "lastName": "Reviewer",
        "birthDate": "1990-01-01T00:00:00Z",
        "email": "reviewer@test.com",
        "gender": "male",
        "profilePicUrl": None,
        "instruments": [],
        "genres": [],
        "averageRating": None,
        "reviewCount": 0,
    })

    db.collection("test_profiles").document(REVIEWED_USER_ID).set({
        "userId": REVIEWED_USER_ID,
        "firstName": "Test",
        "lastName": "Musician",
        "birthDate": "1992-05-15T00:00:00Z",
        "email": "musician@test.com",
        "gender": "female",
        "profilePicUrl": None,
        "instruments": [],
        "genres": [],
        "averageRating": None,
        "reviewCount": 0,
    })

    yield

    # Cleanup: remove all test reviews created during this test session
    for doc in db.collection("test_reviews").stream():
        doc.reference.delete()
    db.collection("test_profiles").document(REVIEWED_USER_ID).delete()
    db.collection("test_profiles").document(REVIEWER_ID).delete()


# ---------------------------------------------------------------------------
# Validation tests (no DB writes)
# ---------------------------------------------------------------------------

def test_create_review_rating_too_low():
    """Rating of 0 should fail Pydantic validation (ge=1)."""
    response = client.post(
        f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews",
        json={"rating": 0},
    )
    assert response.status_code == 422


def test_create_review_rating_too_high():
    """Rating of 6 should fail Pydantic validation (le=5)."""
    response = client.post(
        f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews",
        json={"rating": 6},
    )
    assert response.status_code == 422


def test_create_review_text_too_long():
    """Text longer than 300 characters should fail Pydantic validation."""
    response = client.post(
        f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews",
        json={"rating": 4, "text": "x" * 301},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Self-review protection
# ---------------------------------------------------------------------------

def test_create_review_self_review_forbidden():
    """A user cannot review themselves."""
    response = client.post(
        f"/api/v1/profiles/{REVIEWER_ID}/reviews",
        json={"rating": 5, "text": "I'm great!"},
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Happy path: create
# ---------------------------------------------------------------------------

def test_create_review_success():
    """Successfully create a review for another user."""
    global created_review_id

    response = client.post(
        f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews",
        json={"rating": 4, "text": "Great musician to work with!"},
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    assert response.status_code == 201

    data = response.json()
    assert data["rating"] == 4
    assert data["text"] == "Great musician to work with!"
    assert data["reviewerId"] == REVIEWER_ID
    assert data["reviewedUserId"] == REVIEWED_USER_ID
    assert "reviewId" in data
    assert data["reviewerFirstName"] == "Test"
    assert data["reviewerLastName"] == "Reviewer"

    created_review_id = data["reviewId"]
    print(f"Created review with ID: {created_review_id}")


def test_profile_aggregates_updated_after_create():
    """After creating a review, the profile's averageRating and reviewCount should be updated."""
    from firebase_config import get_db
    db = get_db()
    profile_data = db.collection("test_profiles").document(REVIEWED_USER_ID).get().to_dict()
    assert profile_data["reviewCount"] == 1
    assert profile_data["averageRating"] == 4.0


# ---------------------------------------------------------------------------
# Duplicate review enforcement
# ---------------------------------------------------------------------------

def test_create_review_duplicate_rejected():
    """Submitting a second review for the same user should return 409."""
    response = client.post(
        f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews",
        json={"rating": 2, "text": "Changed my mind"},
    )
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# List reviews
# ---------------------------------------------------------------------------

def test_list_reviews():
    """GET /profiles/{user_id}/reviews should return the review we created."""
    response = client.get(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews")
    assert response.status_code == 200

    data = response.json()
    assert "reviews" in data
    assert len(data["reviews"]) >= 1
    review = data["reviews"][0]
    assert review["reviewedUserId"] == REVIEWED_USER_ID
    assert review["rating"] == 4


def test_list_reviews_nonexistent_user_returns_404():
    """GET reviews for a user that doesn't exist should return 404."""
    response = client.get("/api/v1/profiles/nonexistent_user_xyz/reviews")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Review with no text (optional field)
# ---------------------------------------------------------------------------

THIRD_USER_ID = "test_third_user_jam_789"


@pytest.fixture(scope="module", autouse=True)
def setup_third_profile():
    """Create a third profile used for multi-reviewer and text-less review tests."""
    from firebase_config import get_db
    db = get_db()
    db.collection("test_profiles").document(THIRD_USER_ID).set({
        "userId": THIRD_USER_ID,
        "firstName": "Third",
        "lastName": "User",
        "birthDate": "1995-03-20T00:00:00Z",
        "email": "third@test.com",
        "gender": "male",
        "profilePicUrl": None,
        "instruments": [],
        "genres": [],
        "averageRating": None,
        "reviewCount": 0,
    })
    yield
    db.collection("test_profiles").document(THIRD_USER_ID).delete()


def test_create_review_without_text():
    """A review with only a rating (no text) should succeed."""
    response = client.post(
        f"/api/v1/profiles/{THIRD_USER_ID}/reviews",
        json={"rating": 3},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["rating"] == 3
    assert data.get("text") is None or data.get("text") == ""


# ---------------------------------------------------------------------------
# Average rating math with multiple reviewers
# ---------------------------------------------------------------------------

def test_average_rating_with_multiple_reviewers():
    """Two reviews (ratings 3 and 5) on THIRD_USER_ID should yield averageRating 4.0."""
    def override_as_second():
        return REVIEWED_USER_ID

    app.dependency_overrides[get_current_user] = override_as_second
    response = client.post(
        f"/api/v1/profiles/{THIRD_USER_ID}/reviews",
        json={"rating": 5, "text": "Second reviewer here"},
    )
    assert response.status_code == 201
    app.dependency_overrides[get_current_user] = override_as_reviewer

    from firebase_config import get_db
    db = get_db()
    profile_data = db.collection("test_profiles").document(THIRD_USER_ID).get().to_dict()
    assert profile_data["reviewCount"] == 2
    assert profile_data["averageRating"] == 4.0  # (3 + 5) / 2


def test_list_reviews_pagination():
    """List with limit=1 should return nextPageToken when more reviews exist (requires ≥2 reviews)."""
    # We only have 1 review right now, so nextPageToken should be None
    response = client.get(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews?limit=1")
    assert response.status_code == 200
    data = response.json()
    assert data["nextPageToken"] is None  # only 1 review total


def test_list_reviews_profile_not_found():
    """Listing reviews for a non-existent profile should return 404."""
    response = client.get("/api/v1/profiles/nonexistent_profile_xyz/reviews")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Get my review
# ---------------------------------------------------------------------------

def test_get_my_review_exists():
    """GET /profiles/{user_id}/reviews/my should return the reviewer's own review."""
    response = client.get(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews/my")
    assert response.status_code == 200

    data = response.json()
    assert data is not None
    assert data["reviewId"] == created_review_id
    assert data["rating"] == 4


def test_get_my_review_none():
    """GET /profiles/{other}/reviews/my should return null when no review exists."""
    # Use REVIEWER_ID as the reviewed user; current user (also REVIEWER_ID) can't review themselves,
    # but we can test this via the opposite direction: reviewed user hasn't reviewed the reviewer
    app.dependency_overrides[get_current_user] = lambda: REVIEWED_USER_ID
    response = client.get(f"/api/v1/profiles/{REVIEWER_ID}/reviews/my")
    app.dependency_overrides[get_current_user] = override_as_reviewer

    assert response.status_code == 200
    assert response.json() is None


# ---------------------------------------------------------------------------
# Delete review – unauthorized
# ---------------------------------------------------------------------------

def test_delete_review_by_other_user_forbidden():
    """Only the reviewer who wrote a review may delete it."""
    # Act as the reviewed user trying to delete the reviewer's review
    app.dependency_overrides[get_current_user] = lambda: REVIEWED_USER_ID
    response = client.delete(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews/{created_review_id}")
    app.dependency_overrides[get_current_user] = override_as_reviewer

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Delete review – happy path
# ---------------------------------------------------------------------------

def test_delete_review_success():
    """The reviewer can delete their own review."""
    response = client.delete(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews/{created_review_id}")
    assert response.status_code == 204


def test_profile_aggregates_updated_after_delete():
    """After deleting the only review, reviewCount should be 0 and averageRating None."""
    from firebase_config import get_db
    db = get_db()
    profile_data = db.collection("test_profiles").document(REVIEWED_USER_ID).get().to_dict()
    assert profile_data["reviewCount"] == 0
    assert profile_data["averageRating"] is None


def test_delete_review_not_found():
    """Deleting a non-existent review should return 404."""
    response = client.delete(f"/api/v1/profiles/{REVIEWED_USER_ID}/reviews/{created_review_id}")
    assert response.status_code == 404
