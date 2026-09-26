"""Response shapes for the API. These are the contract with the frontend."""

import datetime
from typing import Literal

from pydantic import BaseModel

Language = Literal["en", "hi"]


class VerseRef(BaseModel):
    chapter: int
    verse: int
    ref: str  # "2.47"


class ChapterSummary(BaseModel):
    number: int
    name_sanskrit: str
    name_transliterated: str
    name_translation: str
    name_meaning: str
    verse_count: int


class ChapterVerse(BaseModel):
    verse: int
    ref: str
    translation: str  # from the default translator for the requested language


class ChapterDetail(ChapterSummary):
    summary_en: str
    summary_hi: str
    verses: list[ChapterVerse]
    prev: int | None  # previous chapter number
    next: int | None


class TranslationOut(BaseModel):
    author: str
    language: Language
    text: str


class VerseDetail(BaseModel):
    chapter: int
    verse: int
    ref: str
    chapter_name: str  # transliterated, e.g. "Sankhya Yog"
    sanskrit_text: str
    transliteration: str
    word_meanings: str
    translations: list[TranslationOut]
    prev: VerseRef | None
    next: VerseRef | None


class VerseOfTheDay(VerseDetail):
    date: datetime.date


class SnippetPart(BaseModel):
    text: str
    match: bool  # true for words that matched the search; render these highlighted


class SearchResult(BaseModel):
    chapter: int
    verse: int
    ref: str
    author: str
    language: Language
    snippet: list[SnippetPart]


class SearchResponse(BaseModel):
    query: str
    # "reference" when the query looks like "2.47": the frontend should open that verse.
    kind: Literal["reference", "keyword"]
    reference: VerseRef | None = None  # set for kind="reference" when the verse exists
    total: int
    results: list[SearchResult]
