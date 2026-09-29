from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
# backend/.env, found regardless of which folder the app is started from.
ENV_FILE = BACKEND_DIR / ".env"
# Downloaded recitations live here in development (see seed/fetch_audio.py).
MEDIA_DIR = BACKEND_DIR / "media"
# The built frontend (npm run build). When present, the API serves it too, so the whole app
# runs on one origin in production.
FRONTEND_DIR = BACKEND_DIR.parent / "frontend" / "dist"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Required: comes from the DATABASE_URL environment variable or backend/.env.
    database_url: str
    cors_origins: list[str] = ["http://localhost:5173"]
    # Where {chapter}/{verse}.mp3 recitations are served from. The default is the local
    # media folder; in production point it at object storage or a CDN.
    audio_base_url: str = "/media/audio"

    # OAuth client ID from Google Cloud Console; Google sign-in is hidden when unset.
    google_client_id: str | None = None
    # Send the session cookie over HTTPS only. Must be true in production.
    cookie_secure: bool = False
    session_days: int = 30

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        # Hosting providers hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver named.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url


settings = Settings()
