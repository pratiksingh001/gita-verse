from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Author, Chapter, Translation, Verse
from app.routers import CONTENT_CACHE
from app.schemas import ChapterDetail, ChapterSummary, ChapterVerse, Language

router = APIRouter(prefix="/api/chapters", tags=["chapters"])

# Translator shown in the chapter's verse list for each language.
DEFAULT_TRANSLATOR: dict[str, str] = {"en": "Swami Sivananda", "hi": "Swami Ramsukhdas"}


@router.get("", response_model=list[ChapterSummary])
def list_chapters(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = CONTENT_CACHE
    chapters = db.scalars(select(Chapter).order_by(Chapter.number))
    return [ChapterSummary.model_validate(c, from_attributes=True) for c in chapters]


@router.get("/{chapter}", response_model=ChapterDetail)
def get_chapter(
    chapter: int,
    response: Response,
    lang: Language = "en",
    db: Session = Depends(get_db),
):
    """Chapter details plus every verse with one translation, for the chapter page."""
    found = db.scalar(select(Chapter).where(Chapter.number == chapter))
    if found is None:
        raise HTTPException(status_code=404, detail=f"Chapter {chapter} not found")

    rows = db.execute(
        select(Verse.verse_number, Translation.text)
        .join(Translation, Translation.verse_id == Verse.id)
        .join(Author, Author.id == Translation.author_id)
        .where(Verse.chapter_id == found.id, Author.name == DEFAULT_TRANSLATOR[lang])
        .order_by(Verse.verse_number)
    )
    verses = [
        ChapterVerse(verse=number, ref=f"{chapter}.{number}", translation=text)
        for number, text in rows
    ]

    response.headers["Cache-Control"] = CONTENT_CACHE
    return ChapterDetail(
        **ChapterSummary.model_validate(found, from_attributes=True).model_dump(),
        summary_en=found.summary_en,
        summary_hi=found.summary_hi,
        verses=verses,
        prev=chapter - 1 if chapter > 1 else None,
        next=chapter + 1 if chapter < 18 else None,
    )
