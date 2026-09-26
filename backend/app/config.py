from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, found regardless of which folder the app is started from.
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Required: comes from the DATABASE_URL environment variable or backend/.env.
    database_url: str
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
