"""Download the verse recitations (github.com/gita/gita) into backend/media/audio/.

    python -m seed.fetch_audio

About 112 MB, so it lives outside git. Already-downloaded files are skipped, so it is safe
to re-run after an interruption. In production, upload the folder to object storage and
set AUDIO_BASE_URL instead.
"""

import sys
from concurrent.futures import ThreadPoolExecutor

import httpx

from app.config import MEDIA_DIR
from seed.seed import load

SOURCE = "https://raw.githubusercontent.com/gita/gita/main/data/verse_recitation"
AUDIO_DIR = MEDIA_DIR / "audio"


def fetch(client: httpx.Client, chapter: int, verse: int) -> str | None:
    """Download one recitation; returns an error message on failure."""
    target = AUDIO_DIR / str(chapter) / f"{verse}.mp3"
    if target.exists() and target.stat().st_size > 0:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".part")
    try:
        res = client.get(f"{SOURCE}/{chapter}/{verse}.mp3")
        res.raise_for_status()
        partial.write_bytes(res.content)
        partial.rename(target)  # only complete files get the .mp3 name
    except (httpx.HTTPError, OSError) as e:
        partial.unlink(missing_ok=True)
        return f"{chapter}.{verse}: {e}"
    return None


def main() -> None:
    verses = [(v["chapter_number"], v["verse_number"]) for v in load("verse.json")]
    with httpx.Client(timeout=60) as client, ThreadPoolExecutor(max_workers=12) as pool:
        errors = [e for e in pool.map(lambda cv: fetch(client, *cv), verses) if e]

    if errors:
        print(f"{len(errors)} downloads failed (re-run to retry):")
        for error in errors[:10]:
            print(f"  - {error}")
        sys.exit(1)
    print(f"All {len(verses)} recitations are in {AUDIO_DIR}")


if __name__ == "__main__":
    main()
