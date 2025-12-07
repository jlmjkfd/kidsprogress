"""Cron job scheduler initialization."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from backend.jobs.daily_task_generator import generate_daily_tasks

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def init_scheduler(db: AsyncIOMotorDatabase):
    """Initialize and start the job scheduler."""

    # Daily task generation - runs at 00:00 (midnight)
    scheduler.add_job(
        generate_daily_tasks,
        trigger=CronTrigger(hour=0, minute=0),
        args=[db],
        id="daily_task_generator",
        name="Generate daily tasks from routines",
        replace_existing=True,
        misfire_grace_time=300  # 5 minutes grace period
    )
    logger.info("Scheduled daily task generator job at 00:00")

    scheduler.start()
    logger.info("Job scheduler started successfully")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Job scheduler stopped")
