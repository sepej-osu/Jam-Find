"""
generate_indexes.py

Calls list_posts() directly for every parameter combination that can require a
composite Firestore index, then prints the Firebase console links for creating them.

Usage:
    cd /backend
    venv/bin/python -m scripts.generate_indexes
"""
import asyncio
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from models import PostListParams
from services.post_service import list_posts

# ── probe config ─────────────────────────────────────────────────────────────
USER_LAT    = 44.0995566
USER_LNG    = -123.1314712
RADIUS      = 50.0
SAMPLE_TYPE = "looking_to_jam"
SAMPLE_GENRE = "rock"
FAKE_USER   = "index_probe_user"

# ── all combinations worth probing ───────────────────────────────────────────
COMBOS = []
for sort_by in ("createdAt", "likes", "distance"):
    for sort_order in ("asc", "desc"):
        for post_type in (None, SAMPLE_TYPE):
            for genres in ([], [SAMPLE_GENRE]):
                COMBOS.append(dict(
                    sort_by=sort_by,
                    sort_order=sort_order,
                    post_type=post_type,
                    genres=genres,
                ))

URL_RE = re.compile(r'https://console\.firebase\.google\.com\S+')

def make_params(**kwargs) -> PostListParams:
    return PostListParams(
        limit=1,
        radius_miles=RADIUS,
        user_lat=USER_LAT,
        user_lng=USER_LNG,
        page=0,
        **kwargs,
    )

def label(combo: dict) -> str:
    parts = [f"sort_by={combo['sort_by']}", f"sort_order={combo['sort_order']}"]
    if combo.get("post_type"):
        parts.append(f"post_type={combo['post_type']}")
    if combo.get("genres"):
        parts.append(f"genres={combo['genres']}")
    return "  ".join(parts)

async def probe():
    found: list[tuple[str, str]] = []   # (label, url)
    seen_urls: set[str] = set()

    print(f"Probing {len(COMBOS)} combinations...\n")

    for i, combo in enumerate(COMBOS, 1):
        lbl = label(combo)
        params = make_params(**combo)
        try:
            await list_posts(params, FAKE_USER)
            print(f"  [{i:02d}] ok           {lbl}")
        except HTTPException as e:
            match = URL_RE.search(str(e.detail))
            if match:
                url = match.group(0).rstrip(" .")
                if url in seen_urls:
                    print(f"  [{i:02d}] duplicate    {lbl}")
                else:
                    seen_urls.add(url)
                    found.append((lbl, url))
                    print(f"  [{i:02d}] INDEX NEEDED {lbl}")
            else:
                print(f"  [{i:02d}] error        {lbl}  —  {e.detail[:120]}")
        except Exception as e:
            print(f"  [{i:02d}] unexpected   {lbl}  —  {e}")

    print()
    if not found:
        print("No index creation links found — all queries succeeded or returned non-index errors.")
        return

    print(f"{'='*60}")
    print(f"  {len(found)} composite index(es) to create")
    print(f"{'='*60}\n")
    for n, (lbl, url) in enumerate(found, 1):
        print(f"{n}. {lbl}")
        print(f"   {url}\n")

if __name__ == "__main__":
    asyncio.run(probe())
