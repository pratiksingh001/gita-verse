from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import MEDIA_DIR, settings
from app.database import get_db
from app.models import Verse
from app.routers import chapters, search, situations, verses

app = FastAPI(title="Gita Verse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(chapters.router)
app.include_router(verses.router)
app.include_router(search.router)
app.include_router(situations.router)

# Local recitations for development; production serves them from AUDIO_BASE_URL instead.
app.mount("/media", StaticFiles(directory=MEDIA_DIR, check_dir=False), name="media")


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict:
    verse_count = db.scalar(select(func.count()).select_from(Verse))
    return {"status": "ok", "verses": verse_count}
