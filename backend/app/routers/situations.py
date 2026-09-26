from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Author, Chapter, Situation, SituationVerse, Translation, Verse
from app.queries import DEFAULT_TRANSLATOR, make_ref
from app.routers import CONTENT_CACHE
from app.schemas import Language, SituationDetail, SituationSummary, SituationVerseOut

router = APIRouter(prefix="/api/situations", tags=["situations"])


@router.get("", response_model=list[SituationSummary])
def list_situations(response: Response, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Situation, func.count(SituationVerse.verse_id))
        .outerjoin(SituationVerse)
        .group_by(Situation.id)
        .order_by(Situation.position)
    )
    response.headers["Cache-Control"] = CONTENT_CACHE
    return [
        SituationSummary(slug=s.slug, title=s.title, description=s.description, verse_count=count)
        for s, count in rows
    ]


@router.get("/{slug}", response_model=SituationDetail)
def get_situation(slug: str, response: Response, lang: Language = "en", db: Session = Depends(get_db)):
    situation = db.scalar(select(Situation).where(Situation.slug == slug))
    if situation is None:
        raise HTTPException(status_code=404, detail=f"Situation '{slug}' not found")

    rows = db.execute(
        select(Chapter.number, Verse.verse_number, Verse.sanskrit_text, Translation.text, Author.name, SituationVerse.note)
        .select_from(SituationVerse)
        .join(Verse, Verse.id == SituationVerse.verse_id)
        .join(Chapter, Chapter.id == Verse.chapter_id)
        .join(Translation, Translation.verse_id == Verse.id)
        .join(Author, Author.id == Translation.author_id)
        .where(SituationVerse.situation_id == situation.id, Author.name == DEFAULT_TRANSLATOR[lang])
        .order_by(SituationVerse.position)
    )
    verses = [
        SituationVerseOut(
            **make_ref(chapter, verse).model_dump(),
            sanskrit_text=sanskrit,
            translation=translation,
            author=author,
            note=note,
        )
        for chapter, verse, sanskrit, translation, author, note in rows
    ]

    response.headers["Cache-Control"] = CONTENT_CACHE
    return SituationDetail(slug=situation.slug, title=situation.title, description=situation.description, verses=verses)
