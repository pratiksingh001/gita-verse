"""The signed-in reader's own data: bookmarks, reading progress, notes and highlights."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth import current_user, no_store
from app.database import get_db
from app.models import Annotation, Bookmark, Chapter, User, Verse
from app.queries import find_verse, make_ref

router = APIRouter(prefix="/api/me", tags=["me"], dependencies=[Depends(no_store)])

Highlight = Literal["saffron", "sage", "sky", "rose"]


class VerseLocation(BaseModel):
    chapter: int
    verse: int
    ref: str
    chapter_name: str


class BookmarkOut(VerseLocation):
    excerpt: str
    saved_at: datetime


class BookmarkIn(BaseModel):
    excerpt: str = Field(default="", max_length=1000)


class BookmarkImport(BookmarkIn):
    chapter: int
    verse: int
    saved_at: datetime | None = None


class ProgressOut(VerseLocation):
    read_at: datetime


class ProgressIn(BaseModel):
    chapter: int
    verse: int


class AnnotationOut(VerseLocation):
    note: str
    highlight: Highlight | None
    updated_at: datetime


class AnnotationIn(BaseModel):
    note: str = Field(default="", max_length=5000)
    highlight: Highlight | None = None


def location(verse: Verse) -> dict:
    return {**make_ref(verse.chapter.number, verse.verse_number).model_dump(), "chapter_name": verse.chapter.name_transliterated}


def require_verse(db: Session, chapter: int, verse: int) -> Verse:
    found = find_verse(db, chapter, verse)
    if found is None:
        raise HTTPException(status_code=404, detail=f"Verse {chapter}.{verse} not found")
    return found


# --- bookmarks --------------------------------------------------------------


def list_bookmarks(db: Session, user: User) -> list[BookmarkOut]:
    rows = db.scalars(
        select(Bookmark)
        .join(Bookmark.verse)
        .join(Verse.chapter)
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc(), Verse.verse_order)
    )
    return [BookmarkOut(**location(b.verse), excerpt=b.excerpt, saved_at=b.created_at) for b in rows]


@router.get("/bookmarks", response_model=list[BookmarkOut])
def get_bookmarks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list_bookmarks(db, user)


@router.put("/bookmarks/{chapter}/{verse}", response_model=BookmarkOut)
def save_bookmark(
    chapter: int, verse: int, body: BookmarkIn, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    found = require_verse(db, chapter, verse)
    stmt = insert(Bookmark).values(user_id=user.id, verse_id=found.id, excerpt=body.excerpt)
    db.execute(stmt.on_conflict_do_update(index_elements=["user_id", "verse_id"], set_={"excerpt": body.excerpt}))
    db.commit()
    saved = db.get(Bookmark, (user.id, found.id))
    return BookmarkOut(**location(found), excerpt=saved.excerpt, saved_at=saved.created_at)


@router.delete("/bookmarks/{chapter}/{verse}", status_code=204)
def delete_bookmark(chapter: int, verse: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    found = require_verse(db, chapter, verse)
    if bookmark := db.get(Bookmark, (user.id, found.id)):
        db.delete(bookmark)
        db.commit()


@router.post("/bookmarks/import", response_model=list[BookmarkOut])
def import_bookmarks(
    body: list[BookmarkImport] = Body(max_length=1000),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Merge bookmarks saved in the browser before signing in. Existing ones are kept as they are."""
    for item in body:
        found = find_verse(db, item.chapter, item.verse)
        if found is None:
            continue
        values = {"user_id": user.id, "verse_id": found.id, "excerpt": item.excerpt}
        if item.saved_at:
            values["created_at"] = item.saved_at
        db.execute(insert(Bookmark).values(**values).on_conflict_do_nothing())
    db.commit()
    return list_bookmarks(db, user)


# --- reading progress -------------------------------------------------------


@router.get("/progress", response_model=ProgressOut | None)
def get_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.last_read_verse_id is None:
        return None
    verse = db.get(Verse, user.last_read_verse_id)
    return ProgressOut(**location(verse), read_at=user.last_read_at)


@router.put("/progress", response_model=ProgressOut)
def save_progress(body: ProgressIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    found = require_verse(db, body.chapter, body.verse)
    user.last_read_verse_id = found.id
    user.last_read_at = datetime.now(UTC)
    db.commit()
    return ProgressOut(**location(found), read_at=user.last_read_at)


# --- notes and highlights ---------------------------------------------------


def annotation_out(annotation: Annotation) -> AnnotationOut:
    return AnnotationOut(
        **location(annotation.verse),
        note=annotation.note,
        highlight=annotation.highlight,
        updated_at=annotation.updated_at,
    )


@router.get("/annotations", response_model=list[AnnotationOut])
def get_annotations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Annotation)
        .join(Annotation.verse)
        .join(Verse.chapter)
        .where(Annotation.user_id == user.id)
        .order_by(Annotation.updated_at.desc())
    )
    return [annotation_out(a) for a in rows]


@router.put("/annotations/{chapter}/{verse}", response_model=AnnotationOut | None)
def save_annotation(
    chapter: int, verse: int, body: AnnotationIn, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    """Saves a note and/or highlight. Clearing both removes the annotation (returns null)."""
    found = require_verse(db, chapter, verse)
    annotation = db.get(Annotation, (user.id, found.id))
    note = body.note.strip()

    if not note and body.highlight is None:
        if annotation:
            db.delete(annotation)
            db.commit()
        return None

    if annotation is None:
        annotation = Annotation(user_id=user.id, verse_id=found.id)
        db.add(annotation)
    annotation.note = note
    annotation.highlight = body.highlight
    db.commit()
    db.refresh(annotation)
    return annotation_out(annotation)
