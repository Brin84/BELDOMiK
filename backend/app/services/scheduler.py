"""Scheduled tasks service (Cloud Scheduler keep-alive + maintenance)."""
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


class SchedulerService:
    """Run periodic maintenance tasks."""

    @staticmethod
    async def run_scheduled_tasks(db: Session | None = None) -> dict[str, Any]:
        """
        Run all scheduled tasks.

        Called by Cloud Scheduler via POST /api/internal/scheduler/run
        with X-Scheduler-Secret header.
        """
        # If no DB session provided, create one (for standalone execution)
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        results: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "tasks": [],
        }

        try:
            # Task 1: Cleanup expired property listings (archive)
            archived = await SchedulerService._archive_expired_listings()
            results["tasks"].append({"name": "archive_expired_listings", "count": archived})

            # Task 2: Cleanup old archived listings (permanent delete)
            deleted = await SchedulerService._purge_old_archived()
            results["tasks"].append({"name": "purge_old_archived", "count": deleted})

            # Task 3: Cleanup expired saved searches
            saved_cleaned = await SchedulerService._cleanup_saved_searches()
            results["tasks"].append({"name": "cleanup_saved_searches", "count": saved_cleaned})

            db.commit()
            logger.info("Scheduled tasks completed", extra=results)
        except Exception:
            db.rollback()
            logger.exception("Scheduled tasks failed")
            raise
        else:
            return results
        finally:
            if close_db:
                db.close()

    @staticmethod
    async def _archive_expired_listings() -> int:
        """Move expired active listings to archive (TTL based on LISTING_TTL_DAYS)."""
        # BELDOMiK doesn't have listing TTL like baraholka - properties are long-term
        # But we could add cleanup for inactive properties if needed
        return 0

    @staticmethod
    async def _purge_old_archived() -> int:
        """Permanently delete very old archived listings."""
        # Not applicable for BELDOMiK real estate - keep all listings
        return 0

    @staticmethod
    async def _cleanup_saved_searches() -> int:
        """Clean up very old saved searches with no activity."""
        # Keep all saved searches for now
        return 0


async def run_scheduler_standalone():
    """Standalone entry point for Cloud Run Job (if needed)."""
    db = SessionLocal()
    try:
        await SchedulerService.run_scheduled_tasks(db)
    finally:
        db.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_scheduler_standalone())