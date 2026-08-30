# ===== Stage 1: Frontend build (Vite + React + TypeScript) =====
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Install dependencies (layer cache) — npm (lockfile present in repo)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build frontend
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Python runtime (FastAPI API + SPA server) =====
FROM python:3.12-slim

WORKDIR /app

# Runtime libs: curl for healthcheck. psycopg (v3) ships a binary wheel with
# bundled libpq, so gcc/libpq-dev are not required for the build.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies from pyproject (editable so `app` import works)
COPY backend/pyproject.toml .
COPY backend/README.md .
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/entrypoint.sh .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .

# Copy built frontend from Stage 1 → /app/frontend/dist
COPY --from=frontend-builder /build/dist /app/frontend/dist

# Ensure uploads directory exists and entrypoint is executable
RUN mkdir -p /app/uploads && chmod +x /app/entrypoint.sh

# Healthcheck (Cloud Run uses /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

EXPOSE 8080

# Cloud Run injects PORT (default 8080)
ENTRYPOINT ["/app/entrypoint.sh"]
