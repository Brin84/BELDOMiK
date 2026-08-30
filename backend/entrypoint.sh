#!/usr/bin/env bash
# Container entrypoint: apply pending migrations, then start the server.
set -euo pipefail

PORT="${PORT:-8080}"
cd /app

# Apply database migrations (best-effort: a failed migration should still let
# the service start so health checks can surface the problem, but we log it).
echo "Running database migrations (alembic upgrade head)..."
if alembic -c alembic.ini upgrade head; then
    echo "Migrations applied successfully."
else
    echo "WARNING: alembic upgrade head failed — continuing startup." >&2
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --log-level info
