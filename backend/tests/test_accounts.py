"""Accounts and personal data. Test users use reader-…@example.com addresses and are removed afterwards."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.config import settings
from app.database import SessionLocal
from app.main import app
from app.models import User, UserSession
from app.routers import auth as auth_router

PASSWORD = "correct horse battery"


@pytest.fixture(autouse=True, scope="module")
def remove_test_users():
    yield
    with SessionLocal() as db:
        db.execute(delete(User).where(User.email.like("reader-%@example.com")))
        db.commit()


def new_email() -> str:
    return f"reader-{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def signed_in(client):
    email = new_email()
    res = client.post("/api/auth/register", json={"name": "Arjuna", "email": email, "password": PASSWORD})
    assert res.status_code == 201
    return client


# --- registration and sign-in ------------------------------------------------


def test_register_signs_in(client):
    email = new_email()
    res = client.post("/api/auth/register", json={"name": "Arjuna", "email": email.upper(), "password": PASSWORD})
    assert res.status_code == 201
    assert res.json()["email"] == email  # stored lowercase
    cookie = res.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert client.get("/api/auth/me").json()["name"] == "Arjuna"


def test_passwords_and_tokens_are_not_stored_in_plain_text(client):
    email = new_email()
    client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD})
    token = client.cookies["gita_session"]
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user.password_hash.startswith("$argon2id$")
        assert PASSWORD not in user.password_hash
        session = db.scalar(select(UserSession).where(UserSession.user_id == user.id))
        assert session.token_hash != token


def test_duplicate_email_is_rejected(client):
    email = new_email()
    client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD})
    res = client.post("/api/auth/register", json={"name": "B", "email": email, "password": PASSWORD})
    assert res.status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"name": "A", "email": "not-an-email", "password": PASSWORD},
        {"name": "A", "email": "reader-invalid@example.com", "password": "short"},
        {"name": "", "email": "reader-invalid@example.com", "password": PASSWORD},
    ],
)
def test_invalid_registration(client, body):
    assert client.post("/api/auth/register", json=body).status_code == 422


def test_login_and_logout(client):
    email = new_email()
    client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD})
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    assert client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_logout_revokes_the_session(client):
    email = new_email()
    client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD})
    token = client.cookies["gita_session"]
    client.post("/api/auth/logout")
    # Replaying the old cookie must not work.
    client.cookies.set("gita_session", token)
    assert client.get("/api/auth/me").status_code == 401


def test_wrong_password_and_unknown_email_look_the_same(client):
    email = new_email()
    client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD})
    client.post("/api/auth/logout")
    wrong = client.post("/api/auth/login", json={"email": email, "password": "wrong password"})
    unknown = client.post("/api/auth/login", json={"email": new_email(), "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_personal_data_requires_sign_in(client):
    assert client.get("/api/me/bookmarks").status_code == 401
    assert client.put("/api/me/annotations/2/47", json={"note": "x"}).status_code == 401


def test_personal_data_is_never_cached(signed_in):
    assert signed_in.get("/api/me/bookmarks").headers["cache-control"] == "no-store"


# --- Google -------------------------------------------------------------------


def fake_google(monkeypatch, claims):
    monkeypatch.setattr(settings, "google_client_id", "test-client.apps.googleusercontent.com")

    def verify(token, request, audience):
        if token != "valid-token":
            raise ValueError("bad token")
        assert audience == "test-client.apps.googleusercontent.com"
        return claims

    monkeypatch.setattr(auth_router.id_token, "verify_oauth2_token", verify)


def test_google_sign_in_creates_an_account(client, monkeypatch):
    email = new_email()
    fake_google(monkeypatch, {"sub": uuid.uuid4().hex, "email": email, "email_verified": True, "name": "Krishna"})
    res = client.post("/api/auth/google", json={"credential": "valid-token"})
    assert res.status_code == 200
    assert res.json() == {**res.json(), "email": email, "name": "Krishna", "google_linked": True, "has_password": False}


def test_google_sign_in_links_an_existing_account(client, monkeypatch):
    email = new_email()
    user_id = client.post("/api/auth/register", json={"name": "A", "email": email, "password": PASSWORD}).json()["id"]
    client.post("/api/auth/logout")
    fake_google(monkeypatch, {"sub": uuid.uuid4().hex, "email": email, "email_verified": True})
    user = client.post("/api/auth/google", json={"credential": "valid-token"}).json()
    assert user["id"] == user_id
    assert user["google_linked"] and user["has_password"]


def test_google_rejects_invalid_or_unverified(client, monkeypatch):
    fake_google(monkeypatch, {"sub": "1", "email": new_email(), "email_verified": False})
    assert client.post("/api/auth/google", json={"credential": "forged"}).status_code == 401
    assert client.post("/api/auth/google", json={"credential": "valid-token"}).status_code == 401


def test_google_disabled_without_client_id(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", None)
    assert client.get("/api/auth/config").json() == {"google_client_id": None}
    assert client.post("/api/auth/google", json={"credential": "x"}).status_code == 404


# --- bookmarks, progress, annotations -----------------------------------------


def test_bookmarks(signed_in):
    assert signed_in.put("/api/me/bookmarks/2/47", json={"excerpt": "Your right is only to work"}).status_code == 200
    signed_in.put("/api/me/bookmarks/18/66", json={"excerpt": "Abandon all duties"})
    refs = [b["ref"] for b in signed_in.get("/api/me/bookmarks").json()]
    assert set(refs) == {"2.47", "18.66"}

    assert signed_in.delete("/api/me/bookmarks/2/47").status_code == 204
    assert [b["ref"] for b in signed_in.get("/api/me/bookmarks").json()] == ["18.66"]
    assert signed_in.put("/api/me/bookmarks/2/99", json={}).status_code == 404


def test_import_merges_browser_bookmarks(signed_in):
    signed_in.put("/api/me/bookmarks/2/47", json={"excerpt": "kept"})
    merged = signed_in.post(
        "/api/me/bookmarks/import",
        json=[
            {"chapter": 2, "verse": 47, "excerpt": "ignored duplicate"},
            {"chapter": 6, "verse": 5, "excerpt": "lift yourself", "saved_at": "2026-01-01T00:00:00Z"},
            {"chapter": 40, "verse": 1, "excerpt": "no such verse"},
        ],
    ).json()
    by_ref = {b["ref"]: b for b in merged}
    assert set(by_ref) == {"2.47", "6.5"}
    assert by_ref["2.47"]["excerpt"] == "kept"
    assert by_ref["6.5"]["saved_at"].startswith("2026-01-01")


def test_users_cannot_see_each_others_data(client):
    client.post("/api/auth/register", json={"name": "A", "email": new_email(), "password": PASSWORD})
    client.put("/api/me/bookmarks/2/47", json={"excerpt": "mine"})
    client.put("/api/me/annotations/2/47", json={"note": "private"})
    client.post("/api/auth/logout")

    client.post("/api/auth/register", json={"name": "B", "email": new_email(), "password": PASSWORD})
    assert client.get("/api/me/bookmarks").json() == []
    assert client.get("/api/me/annotations").json() == []


def test_progress(signed_in):
    assert signed_in.get("/api/me/progress").json() is None
    signed_in.put("/api/me/progress", json={"chapter": 3, "verse": 8})
    progress = signed_in.get("/api/me/progress").json()
    assert progress["ref"] == "3.8"
    assert progress["chapter_name"]


def test_annotations(signed_in):
    saved = signed_in.put("/api/me/annotations/2/47", json={"note": "  Remember this at work.  ", "highlight": "saffron"})
    assert saved.json()["note"] == "Remember this at work."
    assert saved.json()["highlight"] == "saffron"

    signed_in.put("/api/me/annotations/2/47", json={"note": "Updated", "highlight": None})
    [annotation] = signed_in.get("/api/me/annotations").json()
    assert (annotation["note"], annotation["highlight"]) == ("Updated", None)

    # Clearing both the note and the highlight removes the annotation.
    assert signed_in.put("/api/me/annotations/2/47", json={"note": "", "highlight": None}).json() is None
    assert signed_in.get("/api/me/annotations").json() == []


def test_invalid_highlight_colour(signed_in):
    assert signed_in.put("/api/me/annotations/2/47", json={"highlight": "neon"}).status_code == 422
