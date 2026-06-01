"""
Seed script — populates Firebase Auth, Firestore, and Storage with Simpsons test data.

Usage (run from backend/ directory):
    python -m scripts.seed [--wipe]

    --wipe   Delete all existing seed users / profiles / posts before seeding.
             Only affects documents whose email is listed in seed_data.json.

Requires:
    FIREBASE_STORAGE_BUCKET env var (e.g. your-project.appspot.com)
    .env file in the backend/ directory (loaded automatically via config.py)
"""

import argparse
import asyncio
import json
import mimetypes
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

# Allow imports from the backend package root
sys.path.insert(0, str(Path(__file__).parent.parent))

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore, storage
from google.api_core import exceptions as gcp_exceptions

from config import settings
from utils.location import resolve_location_from_zip

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPTS_DIR = Path(__file__).parent
SEED_DATA_PATH = SCRIPTS_DIR / "seed_data.json"

# ---------------------------------------------------------------------------
# Firebase initialisation
# ---------------------------------------------------------------------------

def init_firebase() -> None:
    """Initialise firebase_admin exactly once."""
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "").strip()
    if not bucket_name:
        raise RuntimeError(
            "FIREBASE_STORAGE_BUCKET environment variable is required.\n"
            "Example: FIREBASE_STORAGE_BUCKET=jam-find.appspot.com python -m scripts.seed"
        )

    # If USE_EMULATOR is set in config, inject emulator env vars automatically
    if settings.USE_EMULATOR:
        if settings.FIRESTORE_EMULATOR_HOST:
            os.environ.setdefault("FIRESTORE_EMULATOR_HOST", settings.FIRESTORE_EMULATOR_HOST)
        if settings.FIREBASE_AUTH_EMULATOR_HOST:
            os.environ.setdefault("FIREBASE_AUTH_EMULATOR_HOST", settings.FIREBASE_AUTH_EMULATOR_HOST)
        if settings.FIREBASE_STORAGE_EMULATOR_HOST:
            host = settings.FIREBASE_STORAGE_EMULATOR_HOST
            os.environ.setdefault("FIREBASE_STORAGE_EMULATOR_HOST", host)
            os.environ.setdefault("STORAGE_EMULATOR_HOST", f"http://{host}")
        print("[seed] USE_EMULATOR=True — connecting to local Firebase emulators")
    else:
        print("[seed] USE_EMULATOR=False — connecting to production Firebase")

    if not firebase_admin._apps:
        cred_path = Path(__file__).parent.parent / settings.FIREBASE_CREDENTIALS_PATH
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
        print(f"[firebase] initialised with bucket: {bucket_name}")
    else:
        print("[firebase] already initialised")


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def _storage_download_url(bucket_name: str, blob_path: str, token: str) -> str:
    encoded = quote(blob_path, safe="")
    emulator_host = os.environ.get("STORAGE_EMULATOR_HOST", "").strip()
    if emulator_host:
        # Emulator doesn't require download tokens — just alt=media
        return f"{emulator_host}/v0/b/{bucket_name}/o/{encoded}?alt=media"
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}"
        f"/o/{encoded}?alt=media&token={token}"
    )


def upload_file(local_path: Path, storage_path: str) -> str:
    """
    Upload *local_path* to Firebase Storage at *storage_path*.
    Returns the public Firebase Storage download URL (with token).
    """
    if not local_path.exists():
        raise FileNotFoundError(f"Asset not found: {local_path}")

    content_type, _ = mimetypes.guess_type(str(local_path))
    if content_type is None:
        # Fallback based on suffix
        suffix = local_path.suffix.lower()
        content_type = "audio/mpeg" if suffix == ".mp3" else "application/octet-stream"

    bucket = storage.bucket()
    blob = bucket.blob(storage_path)
    token = str(uuid.uuid4())

    blob.upload_from_filename(str(local_path), content_type=content_type)
    try:
        blob.metadata = {"firebaseStorageDownloadTokens": token}
        blob.patch()
    except Exception:
        pass  # Storage emulator does not support PATCH for metadata — skip silently

    url = _storage_download_url(bucket.name, storage_path, token)
    print(f"  [storage] uploaded → {storage_path}")
    return url


# ---------------------------------------------------------------------------
# Location resolution cache (avoid duplicate API calls for same zip)
# ---------------------------------------------------------------------------
_location_cache: dict[str, dict] = {}


async def resolve_location(zip_code: str) -> dict:
    """Return a camelCase location dict for the given zip code."""
    if zip_code not in _location_cache:
        loc = await resolve_location_from_zip(zip_code)
        if loc is None:
            raise RuntimeError(f"Could not resolve zip code: {zip_code}")
        _location_cache[zip_code] = loc.model_dump(by_alias=True)
    return _location_cache[zip_code]


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def get_or_create_auth_user(email: str, password: str, display_name: str) -> str:
    """
    Create a Firebase Auth user or return the uid of an existing one.
    Returns the uid.
    """
    try:
        user = fb_auth.create_user(email=email, password=password, display_name=display_name)
        print(f"  [auth] created user: {email}")
        return user.uid
    except fb_auth.EmailAlreadyExistsError:
        user = fb_auth.get_user_by_email(email)
        print(f"  [auth] user already exists: {email} → uid={user.uid}")
        return user.uid


def delete_auth_user_by_email(email: str) -> None:
    """Delete a Firebase Auth user by email if they exist."""
    try:
        user = fb_auth.get_user_by_email(email)
        fb_auth.delete_user(user.uid)
        print(f"  [auth] deleted user: {email}")
    except fb_auth.UserNotFoundError:
        pass


# ---------------------------------------------------------------------------
# Firestore helpers
# ---------------------------------------------------------------------------

def delete_user_posts(db, uid: str) -> None:
    """Delete all Firestore posts belonging to *uid*."""
    posts = db.collection("posts").where("userId", "==", uid).stream()
    for doc in posts:
        doc.reference.delete()
        print(f"  [firestore] deleted post: {doc.id}")


# ---------------------------------------------------------------------------
# Seeding logic
# ---------------------------------------------------------------------------

async def seed_user(db, user_data: dict) -> None:
    """Seed a single user: auth → storage → profile → posts."""
    profile = user_data["profile"]
    email = user_data["email"]
    password = user_data["password"]
    first_name = profile["firstName"]
    last_name = profile["lastName"]
    display_name = f"{first_name} {last_name}"

    print(f"\n=== Seeding {display_name} ===")

    # 1. Firebase Auth
    uid = get_or_create_auth_user(email, password, display_name)

    # 2. Upload profile picture
    profile_pic_url: str | None = None
    if profile.get("profileImageLocalPath"):
        local_path = SCRIPTS_DIR / profile["profileImageLocalPath"]
        storage_path = f"seed/profiles/{uid}/profilePic/{local_path.name}"
        profile_pic_url = upload_file(local_path, storage_path)

    # 3. Upload music samples
    music_samples = []
    for sample in profile.get("musicSamples", []):
        local_path = SCRIPTS_DIR / sample["localPath"]
        storage_path = f"seed/profiles/{uid}/musicSamples/{local_path.name}"
        url = upload_file(local_path, storage_path)
        music_samples.append({"url": url, "title": sample["title"]})

    # 4. Resolve location
    zip_code = profile["location"]["zipCode"]
    location_dict = await resolve_location(zip_code)

    # 5. Build profile document (camelCase — matches Firestore schema)
    now = datetime.now(timezone.utc)
    instruments = [
        {"name": inst["name"], "skillLevel": inst["skillLevel"]}
        for inst in profile.get("instruments", [])
    ]

    profile_doc = {
        "userId": uid,
        "email": email,
        "firstName": first_name,
        "lastName": last_name,
        "birthDate": datetime.fromisoformat(profile["birthDate"].replace("Z", "+00:00")),
        "gender": profile["gender"],
        "bio": profile.get("bio"),
        "experienceYears": profile.get("experienceYears"),
        "location": location_dict,
        "profilePicUrl": profile_pic_url,
        "instruments": instruments,
        "genres": profile.get("genres", []),
        "musicSamples": music_samples,
        "averageRating": None,
        "reviewCount": 0,
        "createdAt": now,
        "updatedAt": now,
    }

    # Check for existing profile
    profile_ref = db.collection("profiles").document(uid)
    existing = profile_ref.get()
    if existing.exists:
        print(f"  [firestore] profile already exists for {uid}, updating …")
        profile_ref.update(profile_doc)
    else:
        profile_ref.set(profile_doc)
        print(f"  [firestore] profile created for {uid}")

    # 6. Seed posts
    for i, post_data in enumerate(user_data.get("posts", []), start=1):
        await seed_post(db, uid, profile_doc, post_data, i)


async def seed_post(db, uid: str, profile_doc: dict, post_data: dict, post_index: int) -> None:
    """Seed a single post for a user."""
    title = post_data["title"]
    print(f"  [post {post_index}] {title[:60]}…" if len(title) > 60 else f"  [post {post_index}] {title}")

    # Upload photo
    photo_url: str | None = None
    tmp_id = str(uuid.uuid4())[:8]
    if post_data.get("localImagePath"):
        local_path = SCRIPTS_DIR / post_data["localImagePath"]
        storage_path = f"seed/posts/{uid}/{tmp_id}/postPhoto/{local_path.name}"
        photo_url = upload_file(local_path, storage_path)

    # Upload song
    song_url: str | None = None
    if post_data.get("localSongPath"):
        local_path = SCRIPTS_DIR / post_data["localSongPath"]
        storage_path = f"seed/posts/{uid}/{tmp_id}/postSong/{local_path.name}"
        song_url = upload_file(local_path, storage_path)

    # Resolve location
    zip_code = post_data["location"]["zipCode"]
    location_dict = await resolve_location(zip_code)

    # Instruments for posts — use the author's skill level from their profile, defaulting to 1
    profile_skill_map = {inst["name"]: inst["skillLevel"] for inst in profile_doc.get("instruments", [])}
    instruments = [
        {"name": name, "skillLevel": profile_skill_map.get(name, 1)}
        for name in post_data.get("instruments", [])
    ]

    # Randomize post timestamp within the last 7 days
    seconds_ago = random.randint(0, 7 * 24 * 3600)
    post_time = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
    post_ref = db.collection("posts").document()
    post_doc = {
        "postId": post_ref.id,
        "userId": uid,
        "firstName": profile_doc["firstName"],
        "lastName": profile_doc["lastName"],
        "profilePicUrl": profile_doc.get("profilePicUrl"),
        "title": post_data["title"],
        "body": post_data["body"],
        "postType": post_data["postType"],
        "location": location_dict,
        "instruments": instruments,
        "genres": post_data.get("genres", []),
        "photoUrl": photo_url,
        "photoThumbUrl": None,   # No server-side thumbnail generation in seed
        "songUrl": song_url,
        "likedBy": [],
        "likes": 0,
        "edited": False,
        "createdAt": post_time,
        "updatedAt": post_time,
    }
    post_ref.set(post_doc)
    print(f"    [firestore] post created: {post_ref.id}")


# ---------------------------------------------------------------------------
# Wipe helpers
# ---------------------------------------------------------------------------

async def wipe_seed_users(db, users: list) -> None:
    """Remove seed users from Auth, Firestore profiles, and their posts."""
    print("\n=== Wiping existing seed data ===")
    for user_data in users:
        email = user_data["email"]
        print(f"  Wiping {email} …")
        try:
            auth_user = fb_auth.get_user_by_email(email)
            uid = auth_user.uid
            delete_user_posts(db, uid)
            db.collection("profiles").document(uid).delete()
            print(f"  [firestore] deleted profile: {uid}")
            fb_auth.delete_user(uid)
            print(f"  [auth] deleted user: {email}")
        except fb_auth.UserNotFoundError:
            print(f"  [auth] user not found (skipping): {email}")
    print("=== Wipe complete ===\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Jam-Find with Simpsons test data.")
    parser.add_argument(
        "--wipe",
        action="store_true",
        help="Delete all existing seed users and their data before seeding.",
    )
    args = parser.parse_args()

    init_firebase()
    db = firestore.client()

    seed_data = json.loads(SEED_DATA_PATH.read_text())
    users = seed_data["users"]

    if args.wipe:
        await wipe_seed_users(db, users)

    for user_data in users:
        try:
            await seed_user(db, user_data)
        except Exception as exc:
            print(f"\n[ERROR] Failed to seed {user_data['email']}: {exc}")
            import traceback
            traceback.print_exc()

    print("\n=== Seeding complete ===")


if __name__ == "__main__":
    asyncio.run(main())
