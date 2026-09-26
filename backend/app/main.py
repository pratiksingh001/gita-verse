from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Verse
from app.routers import chapters, search, verses

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


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict:
    verse_count = db.scalar(select(func.count()).select_from(Verse))
    return {"status": "ok", "verses": verse_count}
