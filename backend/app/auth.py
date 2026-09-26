"""Passwords, sessions and the signed-in user.

A session is a random token in an HttpOnly cookie. The database keeps only its SHA-256
hash, so a leaked database can't be used to hijack sessions, and signing out (deleting
the row) revokes it immediately.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, UserSession

SESSION_COOKIE = "gita_session"

passwords = PasswordHash.recommended()  # Argon2id
# Checked against when an email isn't registered, so a failed login takes the same time
# whether or not the account exists (no account enumeration by timing).
_DUMMY_HASH = passwords.hash("dummy password for constant-time login failures")


def hash_password(password: str) -> str:
    return passwords.hash(password)


def check_password(user: User | None, password: str) -> bool:
    """True when the password matches. Upgrades the stored hash if the algorithm changed."""
    if user is None or user.password_hash is None:
        passwords.verify(password, _DUMMY_HASH)
        return False
    valid, updated_hash = passwords.verify_and_update(password, user.password_hash)
    if valid and updated_hash:
        user.password_hash = updated_hash
    return valid


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def start_session(db: Session, user: User, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    lifetime = timedelta(days=settings.session_days)
    db.add(UserSession(token_hash=_hash_token(token), user_id=user.id, expires_at=datetime.now(UTC) + lifetime))
    db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(lifetime.total_seconds()),
        httponly=True,  # not readable from JavaScript
        secure=settings.cookie_secure,
        samesite="lax",  # not sent on cross-site POSTs, which blocks CSRF
        path="/",
    )


def end_session(db: Session, request: Request, response: Response) -> None:
    if token := request.cookies.get(SESSION_COOKIE):
        db.execute(delete(UserSession).where(UserSession.token_hash == _hash_token(token)))
        db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax")


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    session = db.get(UserSession, _hash_token(token))
    if session is None:
        return None
    if session.expires_at <= datetime.now(UTC):
        db.delete(session)
        db.commit()
        return None
    return session.user


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to continue")
    return user


def no_store(response: Response) -> None:
    """Personal data must never be cached by browsers or CDNs."""
    response.headers["Cache-Control"] = "no-store"
