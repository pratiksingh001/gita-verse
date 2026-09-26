"""Database lookups shared by several routes."""

from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.models import Author, Chapter, Translation, Verse
from app.schemas import Language, TranslationOut, VerseDetail, VerseRef


def make_ref(chapter: int, verse: int) -> VerseRef:
    return VerseRef(chapter=chapter, verse=verse, ref=f"{chapter}.{verse}")


def _verse_query():
    return select(Verse).join(Verse.chapter).options(contains_eager(Verse.chapter))


def find_verse(db: Session, chapter: int, verse: int) -> Verse | None:
    return db.scalar(
        _verse_query().where(Chapter.number == chapter, Verse.verse_number == verse)
    )


def find_verse_by_order(db: Session, verse_order: int) -> Verse | None:
    return db.scalar(_verse_query().where(Verse.verse_order == verse_order))


def verse_detail(db: Session, verse: Verse, lang: Language | None) -> VerseDetail:
    """Build the full verse response: text, translations and prev/next links."""
    translations_query = (
        select(Translation.language, Author.name, Translation.text)
        .join(Author)
        .where(Translation.verse_id == verse.id)
        .order_by(Translation.language, Author.name)
    )
    if lang:
        translations_query = translations_query.where(Translation.language == lang)
    translations = [
        TranslationOut(language=language, author=author, text=text)
        for language, author, text in db.execute(translations_query)
    ]

    # verse_order runs 1..701 across the whole Gita, so the neighbours of 2.72 are 2.71 and 3.1.
    neighbours = {
        order: make_ref(chapter, number)
        for order, chapter, number in db.execute(
            select(Verse.verse_order, Chapter.number, Verse.verse_number)
            .join(Verse.chapter)
            .where(Verse.verse_order.in_([verse.verse_order - 1, verse.verse_order + 1]))
        )
    }

    ref = make_ref(verse.chapter.number, verse.verse_number)
    return VerseDetail(
        chapter=ref.chapter,
        verse=ref.verse,
        ref=ref.ref,
        chapter_name=verse.chapter.name_transliterated,
        sanskrit_text=verse.sanskrit_text,
        transliteration=verse.transliteration,
        word_meanings=verse.word_meanings,
        translations=translations,
        prev=neighbours.get(verse.verse_order - 1),
        next=neighbours.get(verse.verse_order + 1),
    )
