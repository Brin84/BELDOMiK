"""BELDOMiK - Telegram Mini App Real Estate Marketplace for Belarus."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging as setup_logging

logger = logging.getLogger(__name__)


def _find_frontend_dist() -> str | None:
    """Locate the built SPA directory across local/dev and container layouts.

    In the container the build is copied to /app/frontend/dist (see Dockerfile).
    Locally it may live next to this file or in the repo root.
    """
    candidates = [
        os.environ.get("FRONTEND_DIST", ""),
        "/app/frontend/dist",
        os.path.join(os.path.dirname(__file__), "frontend", "dist"),
        os.path.join(os.getcwd(), "frontend", "dist"),
    ]
    for path in candidates:
        if path and os.path.isdir(path):
            return path
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    dist = _find_frontend_dist()
    if dist:
        logger.info("Frontend SPA directory found", path=dist)
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


# ─── Production: serve frontend static files ────────────────────────────────
# In the Docker container the built frontend lives at /app/frontend/dist
FRONTEND_DIST = _find_frontend_dist()

if FRONTEND_DIST:
    # Vite build assets (JS, CSS, images with hashed filenames)
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # SPA fallback: serve index.html for any non-API 404
    @app.middleware("http")
    async def spa_fallback(request: Request, call_next):
        response = await call_next(request)
        if (
            response.status_code == 404
            and not request.url.path.startswith("/api/")
            # Не подменяем отсутствующий статический файл (старый хэш-бандл
            # после деплоя) index.html — браузер исполнил бы HTML как JS.
            and not os.path.splitext(request.url.path)[1]
        ):
            index_path = os.path.join(FRONTEND_DIST, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path, media_type="text/html")
        return response

    # Кэш-стратегия SPA: no-cache форсирует перевалидацию index.html,
    # хэшированные ассеты кэшируются навсегда.
    @app.middleware("http")
    async def cache_headers(request: Request, call_next):
        response = await call_next(request)
        if response.status_code == 200:
            if request.url.path.startswith("/assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif response.headers.get("content-type", "").startswith("text/html"):
                response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/")
    async def serve_index():
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path, media_type="text/html")
        return JSONResponse({"detail": "Frontend not built"}, status_code=404)
else:
    @app.get("/")
    def root_api_only():
        return {
            "name": "BELDOMiK",
            "slogan": "Найди свой дом",
            "version": "1.0.0",
        }
