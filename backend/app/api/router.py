"""Main API router."""
from fastapi import APIRouter

from app.api.routes import (
    admin,
    analytics,
    auth,
    collections,
    favorites,
    geography,
    internal,
    moderation,
    monetization,
    mortgage,
    properties,
    property_notes,
    property_types,
    saved_searches,
    search,
    viewings,
    webhook,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(geography.router)
api_router.include_router(property_types.router)
api_router.include_router(properties.router)
api_router.include_router(favorites.router)
api_router.include_router(collections.router)
api_router.include_router(property_notes.router)
api_router.include_router(viewings.router)
api_router.include_router(saved_searches.router)
api_router.include_router(search.router)
api_router.include_router(moderation.router)
api_router.include_router(admin.router)
api_router.include_router(monetization.router)
api_router.include_router(analytics.router)
api_router.include_router(mortgage.router)
api_router.include_router(webhook.router)
api_router.include_router(internal.router)