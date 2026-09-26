"""Database tables: the Gita content, and readers' accounts and personal data.

Primary keys reuse the IDs from the gita/gita dataset so the seed is
repeatable and translations keep pointing at the right verses.
"""

from datetime import datetime

from sqlalchemy import Computed, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
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


class Commentary(Base):
    """A scholar's explanation of a verse: classical Sanskrit bhashyas, plus Hindi and English."""

    __tablename__ = "commentaries"
    __table_args__ = (UniqueConstraint("verse_id", "author_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))
    language: Mapped[str] = mapped_column(String(8))  # "en" | "hi" | "sa"
    text: Mapped[str] = mapped_column(Text)

    author: Mapped[Author] = relationship()


class Situation(Base):
    """A life situation (anxiety, grief, ...) with verses curated to help with it."""

    __tablename__ = "situations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)

    verses: Mapped[list["SituationVerse"]] = relationship(
        order_by="SituationVerse.position", cascade="all, delete-orphan"
    )


class SituationVerse(Base):
    __tablename__ = "situation_verses"

    situation_id: Mapped[int] = mapped_column(ForeignKey("situations.id", ondelete="CASCADE"), primary_key=True)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(Text)  # why this verse helps, in a sentence or two

    verse: Mapped[Verse] = relationship()


# --- user accounts and personal data ---------------------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)  # stored lowercase
    name: Mapped[str] = mapped_column(String(200))
    # Null for accounts that only ever signed in with Google.
    password_hash: Mapped[str | None] = mapped_column(String(200))
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True)  # Google's stable user ID
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_read_verse_id: Mapped[int | None] = mapped_column(ForeignKey("verses.id"))
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserSession(Base):
    """A signed-in browser. Only a SHA-256 hash of the cookie token is stored."""

    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()


class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id"), primary_key=True)
    excerpt: Mapped[str] = mapped_column(Text)  # translation shown when it was saved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    verse: Mapped[Verse] = relationship()


class Annotation(Base):
    """A reader's private note and/or highlight colour on a verse."""

    __tablename__ = "annotations"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    verse_id: Mapped[int] = mapped_column(ForeignKey("verses.id"), primary_key=True)
    note: Mapped[str] = mapped_column(Text, default="")
    highlight: Mapped[str | None] = mapped_column(String(16))  # "saffron" | "sage" | "sky" | "rose"
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    verse: Mapped[Verse] = relationship()
