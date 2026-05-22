# Seed Data Scripts

Scripts for populating Firebase with Simpsons test data and discovering required Firestore composite indexes.

---

## Prerequisites

Before running any script, ensure the following are in place:

1. **Python virtual environment** — activated from the `backend/` directory:
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. **`.env` file** — must exist at `backend/.env` with at minimum:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. **`serviceAccountKey.json`** — Firebase service account credentials file located at `backend/serviceAccountKey.json`.

4. **Seed asset folders** — binary assets are not committed to git and must be placed manually:
   ```
   backend/scripts/seed_images/
       profile_images/    ← 13 character profile images (.png)
       post_images/       ← 7 post images (1.png – 7.png)
   backend/scripts/seed_music/
       ← 11 .mp3 files referenced in seed_data.json
   ```

---

## `seed.py` — Populate Firebase with Test Data

Seeds Firebase **Auth**, **Firestore**, and **Storage** with 13 Simpsons characters, each with a full profile and 3 posts.

### Usage

Run from the `backend/` directory with the virtual environment activated:

```bash
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app python -m scripts.seed
```

Replace `your-project.firebasestorage.app` with your actual Firebase Storage bucket name (found in the Firebase Console under Storage).

For this project:

```bash
FIREBASE_STORAGE_BUCKET=jam-find.firebasestorage.app python -m scripts.seed
```

### Options

| Flag | Description |
|------|-------------|
| *(none)* | Seeds all 13 users. Skips users that already exist in Auth; updates existing Firestore profiles. |
| `--wipe` | **Deletes** all existing seed users (Auth, Firestore profiles, and their posts) before re-seeding. Only affects emails listed in `seed_data.json`. |

### Wipe and Re-seed

Use `--wipe` to start fresh — useful after changing `seed_data.json` or `seed.py`:

```bash
FIREBASE_STORAGE_BUCKET=jam-find.firebasestorage.app python -m scripts.seed --wipe
```

### What It Does

- Creates a Firebase Auth user for each character
- Uploads profile images and music samples to `seed/profiles/{uid}/` in Storage
- Writes a `profiles/{uid}` document to Firestore with instruments, genres, location (resolved from zip code via Google Maps API), and music sample URLs
- Creates 3 posts per character, uploading any attached images/songs to `seed/posts/{uid}/{id}/` in Storage
- Writes each post to the `posts` collection in Firestore with a randomized `createdAt` timestamp within the **last 7 days**
- Caches zip code → location resolution to avoid redundant Google Maps API calls

### Seed Characters

| Character | Email | Instruments | Zip |
|-----------|-------|-------------|-----|
| Lisa Simpson | lisa.simpson@springfield.com | Saxophone (5), Piano (4), Vocals (3) | 97333 |
| Bart Simpson | bart.simpson@springfield.com | Drums (4), Electric Guitar (3) | 97330 |
| Marge Simpson | marge.simpson@springfield.com | Vocals (4), Piano (3) | 97339 |
| Maggie Simpson | maggie.simpson@springfield.com | Trumpet (5), Vocals (2) | 97333 |
| Moe Szyslak | moe.szyslak@springfield.com | Electric Bass (4), Acoustic Guitar (3), Vocals (2) | 97330 |
| Ned Flanders | ned.flanders@springfield.com | Acoustic Guitar (5), Vocals (4) | 97339 |
| Krusty TheClown | krusty.theclown@springfield.com | Keyboard (4), Vocals (3) | 97333 |
| Groundskeeper Willie | groundskeeper.willie@springfield.com | Other (4), Acoustic Guitar (3) | 97330 |
| Professor Frink | professor.frink@springfield.com | Other (5), Keyboard (4) | 97339 |
| Waylon Smithers | waylon.smithers@springfield.com | Piano (5), Vocals (4) | 97333 |
| Comic Book Guy | comic.bookguy@springfield.com | Electric Guitar (5), Keyboard (4) | 97330 |
| Ralph Wiggum | ralph.wiggum@springfield.com | Drums (2), Vocals (1) | 97339 |
| Itchy Mouse | itchy.mouse@springfield.com | Drums (5) | 97333 |

> Skill levels: 1 = Beginner, 2 = Novice, 3 = Intermediate, 4 = Advanced, 5 = Expert

All characters use the password: `JamFind2026!`

---

## `generate_indexes.py` — Discover Required Firestore Indexes

Probes Firestore query combinations used by the app and prints links to create any missing composite indexes in the Firebase Console.

### Usage

```bash
python -m scripts.generate_indexes
```

No environment variables required beyond the `.env` file and `serviceAccountKey.json`.

### What It Does

- Initializes Firebase using the service account credentials
- Runs test queries against Firestore that mirror the app's actual query patterns
- Catches `FailedPrecondition` errors that indicate a missing composite index
- Prints a Firebase Console URL for each missing index so you can create it with one click

Run this after adding new Firestore queries to the app to discover any indexes that need to be created.
