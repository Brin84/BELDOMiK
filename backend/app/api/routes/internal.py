"""Internal API routes (Cloud Scheduler, etc.)."""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import settings
from app.services.scheduler import SchedulerService

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.post("/scheduler/run")
async def run_scheduler(
    x_scheduler_secret: str = Header(..., alias="X-Scheduler-Secret"),
    db: Session = Depends(get_db),
):
    """
    Run scheduled tasks (cleanup, keep-alive, etc.).

    Called by Cloud Scheduler every 8 minutes to prevent cold starts
    and run periodic maintenance tasks.
    """
    # Verify the scheduler secret
    if not settings.SCHEDULER_SECRET or x_scheduler_secret != settings.SCHEDULER_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler secret",
        )

    # Run scheduled tasks
    await SchedulerService.run_scheduled_tasks(db)

    return {"ok": True, "message": "Scheduled tasks executed"}