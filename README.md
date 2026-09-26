# Gita Verse

A web app for reading and exploring the Bhagavad Gita.

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, TanStack Query, Motion
- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Database:** PostgreSQL

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker Desktop (for Postgres)

## Setup

```bash
# 1. Start Postgres (runs on host port 5433)
docker compose up -d

# 2. Backend environment
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# 3. Create tables and load the Gita data
alembic upgrade head
python -m seed.seed

# 4. Run the API
fastapi dev app/main.py
```

Check it: <http://localhost:8000/api/health> should return `{"status":"ok","verses":701}`.
Interactive API docs: <http://localhost:8000/docs>.

`DATABASE_URL` is required. The API refuses to start without it (set it in `backend/.env`).

Then, in a second terminal, the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to the API on port 8000.
For a deployed frontend, set `VITE_API_URL` to the API's address.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/chapters` | All 18 chapters |
| `GET /api/chapters/{ch}?lang=en` | Chapter details, summaries, and every verse with one translation (`en`: Swami Sivananda, `hi`: Swami Ramsukhdas) |
| `GET /api/verses/{ch}/{v}?lang=` | Sanskrit, transliteration, word meanings, translations (all, or only `en`/`hi`), and `prev`/`next` links that cross chapter boundaries |
| `GET /api/search?q=&limit=20&offset=0` | `2.47`-style queries return `kind: "reference"` so the frontend can open the verse. Keywords search translations (Devanagari queries search Hindi) and return one best match per verse, with a highlighted snippet split into `{text, match}` parts |
| `GET /api/verse-of-the-day?date=YYYY-MM-DD` | Same verse for everyone on a date; cycles through all 701 verses before repeating. Pass the viewer's local date |

Content responses send `Cache-Control: public, max-age=86400`, since the text never changes.

## Tests

With the database running and seeded:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Data

The Gita content comes from [gita/gita](https://github.com/gita/gita) (Unlicense), stored in
`backend/seed/data/`. The seed script cleans it and upserts it into Postgres, so it is safe to
re-run. It validates 18 chapters, 701 verses (this edition includes the extra opening verse of
chapter 13), and a full set of translations per translator before committing.

Translations included:

- **English:** Swami Sivananda, Swami Gambirananda, Swami Adidevananda, Shri Purohit Swami, Dr. S. Sankaranarayan
- **Hindi:** Swami Ramsukhdas, Swami Tejomayananda

Modern translations may be copyrighted by their publishers. Credit each translator in the UI,
and confirm rights before a commercial launch.

## Schema changes

After editing `backend/app/models.py`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```
