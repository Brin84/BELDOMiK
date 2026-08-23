"""BELDOMiK - Telegram Mini App Real Estate Marketplace for Belarus."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging as setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
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


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "BELDOMiK",
        "slogan": "Найди свой дом",
        "version": "1.0.0",
    }