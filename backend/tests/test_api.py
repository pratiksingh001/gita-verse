"""API tests. They run against the local database, which must be migrated and seeded."""

import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.verses import daily_verse_order


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# --- chapters ---------------------------------------------------------------


def test_list_chapters(client):
    res = client.get("/api/chapters")
    assert res.status_code == 200
    chapters = res.json()
    assert [c["number"] for c in chapters] == list(range(1, 19))
    assert sum(c["verse_count"] for c in chapters) == 701
    assert "public" in res.headers["cache-control"]


def test_get_chapter_lists_every_verse_with_a_translation(client):
    chapter = client.get("/api/chapters/2").json()
    assert chapter["name_meaning"] == "Transcendental Knowledge"
    assert len(chapter["verses"]) == chapter["verse_count"] == 72
    assert chapter["verses"][46]["ref"] == "2.47"
    assert chapter["verses"][46]["translation"].startswith("Your right is only to work")
    assert (chapter["prev"], chapter["next"]) == (1, 3)


def test_get_chapter_in_hindi(client):
    chapter = client.get("/api/chapters/2", params={"lang": "hi"}).json()
    assert "अधिकार" in chapter["verses"][46]["translation"]


def test_first_and_last_chapter_have_no_outer_neighbours(client):
    assert client.get("/api/chapters/1").json()["prev"] is None
    assert client.get("/api/chapters/18").json()["next"] is None


def test_unknown_chapter_is_404(client):
    assert client.get("/api/chapters/19").status_code == 404


# --- verses -----------------------------------------------------------------


def test_get_verse(client):
    verse = client.get("/api/verses/2/47").json()
    assert verse["ref"] == "2.47"
    assert verse["chapter_name"] == "Sānkhya Yog"
    assert "कर्मण्येवाधिकारस्ते" in verse["sanskrit_text"]
    assert verse["transliteration"].startswith("karmaṇy-evādhikāras te")
    assert verse["word_meanings"]
    assert len(verse["translations"]) == 7
    assert verse["prev"]["ref"] == "2.46"
    assert verse["next"]["ref"] == "2.48"


def test_verse_translations_filtered_by_language(client):
    translations = client.get("/api/verses/2/47", params={"lang": "hi"}).json()["translations"]
    assert len(translations) == 2
    assert {t["language"] for t in translations} == {"hi"}


def test_translations_are_cleaned(client):
    for t in client.get("/api/verses/1/1").json()["translations"]:
        assert not t["text"].startswith("।।")
        assert "टिप्पणी" not in t["text"]
        assert "\xa0" not in t["text"]


def test_verse_navigation_crosses_chapters(client):
    last_of_ch2 = client.get("/api/verses/2/72").json()
    assert last_of_ch2["next"]["ref"] == "3.1"
    assert client.get("/api/verses/3/1").json()["prev"]["ref"] == "2.72"


def test_first_and_last_verse_have_no_outer_neighbours(client):
    assert client.get("/api/verses/1/1").json()["prev"] is None
    assert client.get("/api/verses/18/78").json()["next"] is None


def test_unknown_verse_is_404(client):
    assert client.get("/api/verses/2/73").status_code == 404
    assert client.get("/api/verses/19/1").status_code == 404


def test_unsupported_language_is_rejected(client):
    assert client.get("/api/verses/2/47", params={"lang": "fr"}).status_code == 422


# --- audio and commentaries -------------------------------------------------


def test_verse_links_its_recitation(client):
    verse = client.get("/api/verses/2/47").json()
    assert verse["audio_url"] == "/media/audio/2/47.mp3"
    audio = client.get(verse["audio_url"])
    assert audio.status_code == 200
    assert audio.headers["content-type"] == "audio/mpeg"


def test_commentaries(client):
    commentaries = client.get("/api/verses/2/47/commentaries").json()
    authors = {c["author"] for c in commentaries}
    assert {"Sri Shankaracharya", "Sri Ramanujacharya", "Swami Sivananda", "Swami Ramsukhdas"} <= authors
    # English and Hindi come before the Sanskrit commentaries.
    languages = [c["language"] for c in commentaries]
    assert languages.index("sa") > max(i for i, lang in enumerate(languages) if lang != "sa")


def test_commentaries_filtered_by_language(client):
    commentaries = client.get("/api/verses/2/47/commentaries", params={"lang": "hi"}).json()
    assert commentaries and {c["language"] for c in commentaries} == {"hi"}


def test_commentaries_are_cleaned(client):
    for c in client.get("/api/verses/2/1/commentaries").json():
        assert "did not comment" not in c["text"].lower()
        assert not c["text"].rstrip().lower().endswith("no commentary.")
        assert not c["text"].startswith("।।")


def test_commentaries_for_unknown_verse_is_404(client):
    assert client.get("/api/verses/2/73/commentaries").status_code == 404


# --- life situations --------------------------------------------------------


def test_list_situations(client):
    situations = client.get("/api/situations").json()
    assert len(situations) == 12
    assert situations[0]["slug"] == "anxiety"
    assert all(s["verse_count"] >= 4 for s in situations)


def test_get_situation(client):
    situation = client.get("/api/situations/anxiety").json()
    assert situation["title"] == "Anxious about the future"
    first = situation["verses"][0]
    assert first["ref"] == "2.47"
    assert first["translation"].startswith("Your right is only to work")
    assert first["author"] == "Swami Sivananda"
    assert first["note"]
    assert "कर्मण्येवाधिकारस्ते" in first["sanskrit_text"]


def test_get_situation_in_hindi(client):
    verses = client.get("/api/situations/grief", params={"lang": "hi"}).json()["verses"]
    assert verses and all(v["author"] == "Swami Ramsukhdas" for v in verses)


def test_unknown_situation_is_404(client):
    assert client.get("/api/situations/boredom").status_code == 404


# --- search -----------------------------------------------------------------


@pytest.mark.parametrize("query", ["2.47", "2:47", " 2 . 47 "])
def test_search_reference(client, query):
    body = client.get("/api/search", params={"q": query}).json()
    assert body["kind"] == "reference"
    assert body["reference"]["ref"] == "2.47"


def test_search_unknown_reference(client):
    body = client.get("/api/search", params={"q": "19.1"}).json()
    assert body["kind"] == "reference"
    assert body["reference"] is None


def test_search_keyword_highlights_matches(client):
    body = client.get("/api/search", params={"q": "karma"}).json()
    assert body["kind"] == "keyword"
    assert body["total"] > 0
    for result in body["results"]:
        matches = [p["text"].lower() for p in result["snippet"] if p["match"]]
        assert any(m.startswith("karma") for m in matches)  # stemming also matches "karmas"
        assert result["language"] == "en"


def test_search_returns_each_verse_once(client):
    refs = [r["ref"] for r in client.get("/api/search", params={"q": "action", "limit": 50}).json()["results"]]
    assert len(refs) == len(set(refs))


def test_search_uses_english_stemming(client):
    # Searching "desires" should also match the singular "desire".
    body = client.get("/api/search", params={"q": "desires", "limit": 50}).json()
    matched = {p["text"].lower() for r in body["results"] for p in r["snippet"] if p["match"]}
    assert "desire" in matched


def test_search_hindi(client):
    body = client.get("/api/search", params={"q": "कर्म"}).json()
    assert body["total"] > 0
    assert {r["language"] for r in body["results"]} == {"hi"}


def test_search_pagination(client):
    first = client.get("/api/search", params={"q": "action", "limit": 5}).json()
    second = client.get("/api/search", params={"q": "action", "limit": 5, "offset": 5}).json()
    assert first["total"] == second["total"] > 10
    assert not {r["ref"] for r in first["results"]} & {r["ref"] for r in second["results"]}


def test_search_with_no_matches(client):
    body = client.get("/api/search", params={"q": "smartphone"}).json()
    assert body == {"query": "smartphone", "kind": "keyword", "reference": None, "total": 0, "results": []}


def test_search_requires_a_query(client):
    assert client.get("/api/search", params={"q": ""}).status_code == 422


# --- verse of the day -------------------------------------------------------


def test_verse_of_the_day_is_stable_for_a_date(client):
    first = client.get("/api/verse-of-the-day", params={"date": "2026-09-26"}).json()
    again = client.get("/api/verse-of-the-day", params={"date": "2026-09-26"}).json()
    next_day = client.get("/api/verse-of-the-day", params={"date": "2026-09-27"}).json()
    assert first["date"] == "2026-09-26"
    assert first["ref"] == again["ref"]
    assert first["ref"] != next_day["ref"]
    assert first["translations"]


def test_verse_of_the_day_defaults_to_today(client):
    res = client.get("/api/verse-of-the-day")
    assert res.status_code == 200
    assert res.headers["cache-control"] == "public, max-age=300"


def test_daily_verse_cycles_through_every_verse():
    start = datetime.date(2026, 1, 1)
    orders = {daily_verse_order(start + datetime.timedelta(days=i), 701) for i in range(701)}
    assert orders == set(range(1, 702))
