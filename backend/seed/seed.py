"""Load the Bhagavad Gita dataset (github.com/gita/gita) into Postgres.

Run from the backend/ folder after migrations:

    python -m seed.seed

Safe to re-run: every row is upserted by its dataset ID.
"""

import gzip
import json
import re
import sys
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Author, Chapter, Commentary, Translation, Verse

DATA_DIR = Path(__file__).parent / "data"

EXPECTED_CHAPTERS = 18
# 701, not 700: this edition includes the extra opening verse of chapter 13.
EXPECTED_VERSES = 701

LANGUAGE_CODES = {"english": "en", "hindi": "hi", "sanskrit": "sa"}

# "।।1.1।।" verse markers that prefix the Hindi translations. Range markers like
# "।।1.4 -- 1.6।।" are kept: they tell the reader one translation spans several verses.
VERSE_MARKER = re.compile(r"^\s*।।\s*[\d.]+\s*।।\s*")
# "(टिप्पणी प0 1.2)" footnote references in Swami Ramsukhdas' translation.
FOOTNOTE_REF = re.compile(r"\s*\(टिप्पणी प0\s*[\d.]+\)")

# Commentaries open with "2.1", "।।2.1।।" or "2.1।।"; ones covering several verses open
# with a range like "।।1.2  1.9।।" or "।।1.4 --1.6।।", rewritten as a readable first line.
COMMENTARY_RANGE = re.compile(r"^\s*(?:।।)?\s*(\d+\.\d+)\s*(?:--|–|-)?\s*(\d+\.\d+)\s*(?:।।)?\s*")
COMMENTARY_MARKER = re.compile(r"^\s*(?:।।)?\s*\d+\.\d+\s*(?:।।)?\s*")
NO_COMMENTARY = re.compile(r"\s*No commentary\.?\s*$", re.IGNORECASE)
PLACEHOLDER = re.compile(r"did not comment", re.IGNORECASE)
# Swami Sivananda's word lists lost their commas to "?": "तम् to him? तथा thus?".
LOST_COMMA = re.compile(r"\?(?=\s*[ऀ-ॿ])")


def load(name: str) -> list[dict]:
    path = DATA_DIR / name
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def clean(text: str) -> str:
    """Normalise whitespace: drop non-breaking spaces and blank lines, trim each line."""
    text = text.replace("\xa0", " ")
    lines = (line.strip() for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def clean_translation(text: str) -> str:
    text = VERSE_MARKER.sub("", clean(text))
    return FOOTNOTE_REF.sub("", text).strip()


def clean_commentary(text: str, language: str) -> str | None:
    """Cleaned commentary text, or None when the entry only says there is no commentary."""
    text = clean(text)
    text = COMMENTARY_RANGE.sub(r"Verses \1–\2\n", text, count=1)
    text = COMMENTARY_MARKER.sub("", text, count=1)
    text = NO_COMMENTARY.sub("", text)
    if language == "en":
        text = LOST_COMMA.sub(",", text)
    text = text.strip()
    if not text or PLACEHOLDER.search(text):
        return None
    return text


def upsert(db: Session, model, rows: list[dict]) -> None:
    """Insert rows, updating every non-key column when the ID already exists."""
    stmt = insert(model).values(rows)
    update_cols = {
        c.name: stmt.excluded[c.name]
        for c in model.__table__.columns
        if c.name != "id" and c.computed is None  # Postgres maintains computed columns
    }
    db.execute(stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols))


def seed_chapters(db: Session) -> None:
    rows = [
        {
            "id": int(c["id"]),
            "number": int(c["chapter_number"]),
            "name_sanskrit": clean(c["name"]),
            "name_transliterated": clean(c["name_transliterated"]),
            "name_translation": clean(c["name_translation"]),
            "name_meaning": clean(c["name_meaning"]),
            "summary_en": clean(c["chapter_summary"]),
            "summary_hi": clean(c["chapter_summary_hindi"]),
            "verse_count": int(c["verses_count"]),
        }
        for c in load("chapters.json")
    ]
    upsert(db, Chapter, rows)


def seed_authors(db: Session) -> None:
    rows = [{"id": a["id"], "name": clean(a["name"])} for a in load("authors.json")]
    upsert(db, Author, rows)


def seed_verses(db: Session) -> None:
    rows = [
        {
            "id": v["id"],
            "chapter_id": v["chapter_id"],
            "verse_number": v["verse_number"],
            "verse_order": v["verse_order"],
            "sanskrit_text": clean(v["text"]),
            "transliteration": clean(v["transliteration"]),
            "word_meanings": clean(v["word_meanings"]),
        }
        for v in load("verse.json")
    ]
    upsert(db, Verse, rows)


def seed_translations(db: Session) -> None:
    rows = [
        {
            "id": t["id"],
            "verse_id": t["verse_id"],
            "author_id": t["author_id"],
            "language": LANGUAGE_CODES[t["lang"]],
            "text": clean_translation(t["description"]),
        }
        for t in load("translation.json")
    ]
    upsert_batched(db, Translation, rows)


def seed_commentaries(db: Session) -> None:
    rows = []
    for c in load("commentary.json.gz"):
        language = LANGUAGE_CODES[c["lang"]]
        text = clean_commentary(c["description"], language)
        if text is not None:
            rows.append(
                {
                    "id": c["id"],
                    "verse_id": c["verse_id"],
                    "author_id": c["author_id"],
                    "language": language,
                    "text": text,
                }
            )
    upsert_batched(db, Commentary, rows)
    # Drop rows that earlier runs kept but the current cleaning rules skip.
    db.execute(delete(Commentary).where(Commentary.id.not_in([r["id"] for r in rows])))


def upsert_batched(db: Session, model, rows: list[dict], size: int = 1000) -> None:
    # Postgres caps bind parameters per statement, so insert in batches.
    for start in range(0, len(rows), size):
        upsert(db, model, rows[start : start + size])


def validate(db: Session) -> list[str]:
    errors = []

    chapters = db.scalar(select(func.count()).select_from(Chapter))
    if chapters != EXPECTED_CHAPTERS:
        errors.append(f"expected {EXPECTED_CHAPTERS} chapters, found {chapters}")

    verses = db.scalar(select(func.count()).select_from(Verse))
    if verses != EXPECTED_VERSES:
        errors.append(f"expected {EXPECTED_VERSES} verses, found {verses}")

    # Each chapter's declared verse_count must match the verses actually loaded.
    mismatched = db.execute(
        select(Chapter.number, Chapter.verse_count, func.count(Verse.id))
        .join(Verse, Verse.chapter_id == Chapter.id)
        .group_by(Chapter.id)
        .having(func.count(Verse.id) != Chapter.verse_count)
    ).all()
    for number, declared, actual in mismatched:
        errors.append(f"chapter {number}: declares {declared} verses, has {actual}")

    # Every translator must cover every verse.
    per_author = db.execute(
        select(Author.name, func.count(Translation.id))
        .join(Translation, Translation.author_id == Author.id)
        .group_by(Author.name)
    ).all()
    for name, count in per_author:
        if count != EXPECTED_VERSES:
            errors.append(f"{name}: {count} translations, expected {EXPECTED_VERSES}")

    empty = db.scalar(
        select(func.count())
        .select_from(Verse)
        .where((Verse.sanskrit_text == "") | (Verse.transliteration == "") | (Verse.word_meanings == ""))
    )
    if empty:
        errors.append(f"{empty} verses have empty text fields")

    empty_translations = db.scalar(
        select(func.count()).select_from(Translation).where(Translation.text == "")
    )
    if empty_translations:
        errors.append(f"{empty_translations} translations are empty")

    commentaries = db.scalar(select(func.count()).select_from(Commentary))
    if not commentaries:
        errors.append("no commentaries loaded")

    return errors


def main() -> None:
    with SessionLocal() as db:
        # Parents before children so foreign keys resolve.
        seed_chapters(db)
        seed_authors(db)
        seed_verses(db)
        seed_translations(db)
        seed_commentaries(db)

        errors = validate(db)
        if errors:
            db.rollback()
            print("Seed failed validation, nothing was saved:")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)

        db.commit()

        translations = db.scalar(select(func.count()).select_from(Translation))
        commentaries = db.scalar(select(func.count()).select_from(Commentary))
        print(
            f"Seeded {EXPECTED_CHAPTERS} chapters, {EXPECTED_VERSES} verses, "
            f"{translations} translations, {commentaries} commentaries."
        )


if __name__ == "__main__":
    main()
