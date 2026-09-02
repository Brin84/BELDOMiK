"""BELDOMiK - Telegram Mini App Real Estate Marketplace for Belarus."""

import logging
import os
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging as setup_logging

logger = logging.getLogger(__name__)


def _find_frontend_dist() -> str | None:
    """Locate the built SPA directory across local/dev and container layouts.

    In the container the build is copied to /app/frontend/dist (see Dockerfile).
    Locally it may live next to this file or in the repo root.
    """
    base_dir = Path(__file__).parent
    candidates = [
        os.environ.get("FRONTEND_DIST", ""),
        "/app/frontend/dist",
        str(base_dir / "frontend" / "dist"),
        str(Path.cwd() / "frontend" / "dist"),
    ]
    for path in candidates:
        if path and Path(path).is_dir():
            return path
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    dist = _find_frontend_dist()
    if dist:
        logger.info("Frontend SPA directory found: %s", dist)
    else:
        logger.warning("Frontend SPA directory NOT found — API-only mode")
    yield
    # Shutdown
    pass


app = FastAPI(
    title="BELDOMiK API",
    description="Telegram Mini App Real Estate Marketplace for Belarus",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "BELDOMiK API",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health_check_api():
    """Health check endpoint (CI/CD verify target)."""
    return {"status": "healthy"}


# ─── Uploaded images (local dev fallback; cloud backends serve via their URL) ─
if settings.ENVIRONMENT != "production":
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─── Production: serve frontend static files ────────────────────────────────
# In the Docker container the built frontend lives at /app/frontend/dist
FRONTEND_DIST = _find_frontend_dist()

if FRONTEND_DIST:
    # Vite build assets (JS, CSS, images with hashed filenames)
    from pathlib import Path

    dist_path = Path(FRONTEND_DIST)
    assets_dir = dist_path / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA fallback: serve index.html for any non-API 404
    @app.middleware("http")
    async def spa_fallback(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if (
            response.status_code == 404
            and not request.url.path.startswith("/api/")
            # Do not serve index.html for missing static files (old hashed bundles
            # after deploy) — browser would execute HTML as JS.
            and not Path(request.url.path).suffix
        ):
            index_path = dist_path / "index.html"
            if index_path.is_file():
                return FileResponse(str(index_path), media_type="text/html")
        return response

    # Cache strategy: no-cache forces index.html revalidation,
    # hashed assets are cached forever.
    @app.middleware("http")
    async def cache_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if response.status_code == 200:
            if request.url.path.startswith("/assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif response.headers.get("content-type", "").startswith("text/html"):
                response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/")
    async def serve_index():
        index_path = dist_path / "index.html"
        if index_path.is_file():
            return FileResponse(str(index_path), media_type="text/html")
        return JSONResponse({"detail": "Frontend not built"}, status_code=404)

    # Root-level static files from the SPA build (favicon, manifest, etc.).
    # Mounted LAST so "/" (explicit route above), /api/* and /assets/* keep
    # their dedicated handlers; the SPA fallback still serves index.html for
    # client-side routes (extension-less 404s from this mount).
    app.mount("/", StaticFiles(directory=str(dist_path), html=False), name="spa_static")
else:

    @app.get("/")
    def root_api_only():
        return {
            "name": "BELDOMiK",
            "slogan": "Найди свой дом",
            "version": "1.0.0",
        }
