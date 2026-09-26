"""Database tables for the Gita content.

Primary keys reuse the IDs from the gita/gita dataset so the seed is
repeatable and translations keep pointing at the right verses.
"""

from sqlalchemy import Computed, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    number: Mapped[int] = mapped_column(Integer, unique=True)
    name_sanskrit: Mapped[str] = mapped_column(String(200))  # अर्जुनविषादयोग
    name_transliterated: Mapped[str] = mapped_column(String(200))  # Arjun Viṣhād Yog
    name_translation: Mapped[str] = mapped_column(String(200))  # Arjuna Visada Yoga
    name_meaning: Mapped[str] = mapped_column(String(200))  # Arjuna's Dilemma
    summary_en: Mapped[str] = mapped_column(Text)
    summary_hi: Mapped[str] = mapped_column(Text)
    verse_count: Mapped[int] = mapped_column(Integer)

    verses: Mapped[list["Verse"]] = relationship(
        back_populates="chapter", order_by="Verse.verse_number"
    )


class Verse(Base):
    __tablename__ = "verses"
    __table_args__ = (UniqueConstraint("chapter_id", "verse_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), index=True)
    verse_number: Mapped[int] = mapped_column(Integer)
    # Position across the whole Gita (1..701); makes prev/next across chapters trivial.
    verse_order: Mapped[int] = mapped_column(Integer, unique=True)
    sanskrit_text: Mapped[str] = mapped_column(Text)
    transliteration: Mapped[str] = mapped_column(Text)
    word_meanings: Mapped[str] = mapped_column(Text)

    chapter: Mapped[Chapter] = relationship(back_populates="verses")
    translations: Mapped[list["Translation"]] = relationship(back_populates="verse")


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(200), unique=True)


class Translation(Base):
    __tablename__ = "translations"
    __table_args__ = (
        UniqueConstraint("verse_id", "author_id"),
        Index("ix_translations_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), index=True)
    language: Mapped[str] = mapped_column(String(8), index=True)  # "en" | "hi"
    text: Mapped[str] = mapped_column(Text)
    # Maintained by Postgres. English gets stemming ("acting" matches "action");
    # Postgres has no Hindi dictionary, so Hindi is matched word-for-word.
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector(CASE language WHEN 'en' THEN 'english'::regconfig "
            "ELSE 'simple'::regconfig END, text)",
            persisted=True,
        ),
    )

    verse: Mapped[Verse] = relationship(back_populates="translations")
    author: Mapped[Author] = relationship()
