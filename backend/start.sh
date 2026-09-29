#!/bin/sh
# Production entrypoint (see Dockerfile). Migrations and the seed are both safe to re-run,
# so every deploy brings the database up to date before the API starts.
set -e
alembic upgrade head
python -m seed.seed
# Hosting platforms pass the port to listen on in $PORT; trust their proxy's X-Forwarded-* headers.
exec fastapi run app/main.py --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips "*"
