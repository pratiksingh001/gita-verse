import datetime

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Author, Commentary, Verse
from app.queries import find_verse, find_verse_by_order, verse_detail
from app.routers import CONTENT_CACHE
from app.schemas import CommentaryOut, Language, VerseDetail, VerseOfTheDay

CommentaryLanguage = Literal["en", "hi", "sa"]

router = APIRouter(prefix="/api", tags=["verses"])

# Stepping through the verses by a fixed stride that shares no factor with the verse
# count (701 is prime) visits every verse exactly once per 701-day cycle, in an order
# that feels random, and gives everyone the same verse on the same date.
DAILY_STRIDE = 263


def daily_verse_order(day: datetime.date, verse_count: int) -> int:
    return (day.toordinal() * DAILY_STRIDE) % verse_count + 1


@router.get("/verses/{chapter}/{verse}", response_model=VerseDetail)
def get_verse(
    chapter: int,
    verse: int,
    response: Response,
    lang: Language | None = Query(None, description="Only return translations in this language"),
    db: Session = Depends(get_db),
):
    found = find_verse(db, chapter, verse)
    if found is None:
        raise HTTPException(status_code=404, detail=f"Verse {chapter}.{verse} not found")
    response.headers["Cache-Control"] = CONTENT_CACHE
    return verse_detail(db, found, lang)


@router.get("/verses/{chapter}/{verse}/commentaries", response_model=list[CommentaryOut])
def get_commentaries(
    chapter: int,
    verse: int,
    response: Response,
    lang: CommentaryLanguage | None = Query(None, description="Only return commentaries in this language"),
    db: Session = Depends(get_db),
):
    """Scholars' commentaries on a verse. Separate from the verse itself because they are long."""
    found = find_verse(db, chapter, verse)
    if found is None:
        raise HTTPException(status_code=404, detail=f"Verse {chapter}.{verse} not found")

    query = (
        select(Commentary.language, Author.name, Commentary.text)
        .join(Author)
        .where(Commentary.verse_id == found.id)
        # English and Hindi first, then the classical Sanskrit commentaries.
        .order_by(case((Commentary.language == "sa", 1), else_=0), Commentary.language, Author.name)
    )
    if lang:
        query = query.where(Commentary.language == lang)

    response.headers["Cache-Control"] = CONTENT_CACHE
    return [CommentaryOut(language=language, author=author, text=text) for language, author, text in db.execute(query)]


@router.get("/verse-of-the-day", response_model=VerseOfTheDay)
def get_verse_of_the_day(
    response: Response,
    date: datetime.date | None = Query(
        None, description="The viewer's local date (YYYY-MM-DD). Defaults to today in UTC."
    ),
    lang: Language | None = None,
    db: Session = Depends(get_db),
):
    # The frontend should pass the viewer's local date so the verse changes at their midnight.
    day = date or datetime.datetime.now(datetime.UTC).date()
    verse_count = db.scalar(select(func.count()).select_from(Verse))
    found = find_verse_by_order(db, daily_verse_order(day, verse_count))

    # An explicit date always maps to the same verse; "today" changes daily.
    response.headers["Cache-Control"] = CONTENT_CACHE if date else "public, max-age=300"
    return VerseOfTheDay(**verse_detail(db, found, lang).model_dump(), date=day)
