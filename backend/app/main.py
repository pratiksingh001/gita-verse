from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import FRONTEND_DIR, MEDIA_DIR, settings
from app.database import get_db
from app.models import Verse
from app.routers import auth, chapters, me, search, situations, verses

app = FastAPI(title="Gita Verse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,  # the session cookie
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(chapters.router)
app.include_router(verses.router)
app.include_router(search.router)
app.include_router(situations.router)
app.include_router(auth.router)
app.include_router(me.router)

# Local recitations for development; production serves them from AUDIO_BASE_URL instead.
app.mount("/media", StaticFiles(directory=MEDIA_DIR, check_dir=False), name="media")


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict:
    verse_count = db.scalar(select(func.count()).select_from(Verse))
    return {"status": "ok", "verses": verse_count}


# The built frontend, in production (see Dockerfile). Development uses the Vite server instead.
if FRONTEND_DIR.is_dir():
    # Vite's bundled JS, CSS and fonts.
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path.startswith(("api/", "media/")):
            raise HTTPException(status_code=404)
        file = (FRONTEND_DIR / path).resolve()
        # Files from frontend/public (favicon, music); everything else is a client-side route.
        if path and file.is_file() and file.is_relative_to(FRONTEND_DIR):
            return FileResponse(file)
        return FileResponse(FRONTEND_DIR / "index.html", headers={"Cache-Control": "no-cache"})
