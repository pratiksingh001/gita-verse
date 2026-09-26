from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
# backend/.env, found regardless of which folder the app is started from.
ENV_FILE = BACKEND_DIR / ".env"
# Downloaded recitations live here in development (see seed/fetch_audio.py).
MEDIA_DIR = BACKEND_DIR / "media"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Required: comes from the DATABASE_URL environment variable or backend/.env.
    database_url: str
    cors_origins: list[str] = ["http://localhost:5173"]
    # Where {chapter}/{verse}.mp3 recitations are served from. The default is the local
    # media folder; in production point it at object storage or a CDN.
    audio_base_url: str = "/media/audio"


settings = Settings()
