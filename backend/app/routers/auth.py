from fastapi import APIRouter, Depends, HTTPException, Request, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import check_password, current_user, end_session, hash_password, no_store, start_session
from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"], dependencies=[Depends(no_store)])

# Reused so Google's public signing keys are cached between sign-ins.
_google_request = google_requests.Request()


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    has_password: bool
    google_linked: bool


class AuthConfig(BaseModel):
    google_client_id: str | None


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class GoogleIn(BaseModel):
    credential: str  # the ID token from Google Identity Services


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        has_password=user.password_hash is not None,
        google_linked=user.google_sub is not None,
    )


@router.get("/config", response_model=AuthConfig)
def auth_config():
    """Tells the frontend which sign-in methods are available."""
    return AuthConfig(google_client_id=settings.google_client_id)


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    start_session(db, user, response)
    return user_out(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not check_password(user, body.password):
        # Same message either way, so it doesn't reveal which emails have accounts.
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    start_session(db, user, response)
    return user_out(user)


@router.post("/google", response_model=UserOut)
def google_sign_in(body: GoogleIn, response: Response, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=404, detail="Google sign-in is not enabled")
    try:
        # Checks the signature, expiry, issuer, and that the token was issued for this app.
        claims = id_token.verify_oauth2_token(body.credential, _google_request, settings.google_client_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    if not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Your Google email address isn't verified")

    email = claims["email"].lower()
    user = db.scalar(select(User).where(User.google_sub == claims["sub"]))
    if user is None:
        # Google has verified the address, so it's safe to link an existing account with it.
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, name=claims.get("name") or email.split("@")[0])
            db.add(user)
        user.google_sub = claims["sub"]
        db.flush()
    start_session(db, user, response)
    return user_out(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    end_session(db, request, response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user_out(user)
