import re

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import cast, func, select
from sqlalchemy.dialects.postgresql import REGCONFIG
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Author, Chapter, Translation, Verse
from app.queries import find_verse, make_ref
from app.routers import CONTENT_CACHE
from app.schemas import SearchResponse, SearchResult, SnippetPart

router = APIRouter(prefix="/api", tags=["search"])

# "2.47", "2:47", "2 . 47"
REFERENCE = re.compile(r"^\s*(\d{1,2})\s*[.:]\s*(\d{1,3})\s*$")
DEVANAGARI = re.compile(r"[ऀ-ॿ]")

# Control characters can't appear in the text, so they safely mark matched words in
# ts_headline output. They are turned into SnippetPart objects before leaving the API,
# so the frontend never has to render raw HTML.
MATCH_START, MATCH_END = "\x01", "\x02"
HEADLINE_OPTIONS = (
    f"StartSel={MATCH_START}, StopSel={MATCH_END}, MaxWords=35, MinWords=15, MaxFragments=2"
)
MATCHED = re.compile(f"{MATCH_START}(.*?){MATCH_END}", re.DOTALL)


def to_snippet(headline: str) -> list[SnippetPart]:
    parts = []
    last = 0
    for m in MATCHED.finditer(headline):
        if m.start() > last:
            parts.append(SnippetPart(text=headline[last : m.start()], match=False))
        parts.append(SnippetPart(text=m.group(1), match=True))
        last = m.end()
    if last < len(headline):
        parts.append(SnippetPart(text=headline[last:], match=False))
    return parts


@router.get("/search", response_model=SearchResponse)
def search(
    response: Response,
    q: str = Query(min_length=1, max_length=100, description='Keywords, or a reference like "2.47"'),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = CONTENT_CACHE

    if m := REFERENCE.match(q):
        found = find_verse(db, int(m.group(1)), int(m.group(2)))
        return SearchResponse(
            query=q,
            kind="reference",
            reference=make_ref(found.chapter.number, found.verse_number) if found else None,
            total=0,
            results=[],
        )

    # Hindi queries search Hindi translations word-for-word; anything else searches
    # English translations with stemming, matching how search_vector was built.
    lang, config = ("hi", "simple") if DEVANAGARI.search(q) else ("en", "english")
    regconfig = cast(config, REGCONFIG)
    tsquery = func.websearch_to_tsquery(regconfig, q)
    rank = func.ts_rank(Translation.search_vector, tsquery)

    # Several translators may match the same verse; keep only its best-ranked translation.
    ranked = (
        select(
            Translation.id.label("translation_id"),
            rank.label("rank"),
            func.row_number()
            .over(partition_by=Translation.verse_id, order_by=(rank.desc(), Translation.author_id))
            .label("position"),
        )
        .where(Translation.language == lang, Translation.search_vector.op("@@")(tsquery))
        .subquery()
    )
    best = select(ranked).where(ranked.c.position == 1).subquery()

    total = db.scalar(select(func.count()).select_from(best))
    rows = db.execute(
        select(
            Chapter.number,
            Verse.verse_number,
            Author.name,
            func.ts_headline(regconfig, Translation.text, tsquery, HEADLINE_OPTIONS),
        )
        .select_from(best)
        .join(Translation, Translation.id == best.c.translation_id)
        .join(Verse, Verse.id == Translation.verse_id)
        .join(Chapter, Chapter.id == Verse.chapter_id)
        .join(Author, Author.id == Translation.author_id)
        .order_by(best.c.rank.desc(), Verse.verse_order)
        .limit(limit)
        .offset(offset)
    )

    results = [
        SearchResult(
            **make_ref(chapter, verse).model_dump(),
            author=author,
            language=lang,
            snippet=to_snippet(headline),
        )
        for chapter, verse, author, headline in rows
    ]
    return SearchResponse(query=q, kind="keyword", total=total, results=results)
