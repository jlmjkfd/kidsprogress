"""Daily task generation job - runs at 00:00 to generate tasks from active routines."""
import logging
from datetime import date
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.services.routine_service import RoutineService

logger = logging.getLogger(__name__)


async def generate_daily_tasks(db: AsyncIOMotorDatabase):
    """Generate tasks from all active routines for today.

    This job runs at 00:00 (midnight) daily.
    """
    today = date.today()
    logger.info(f"Starting daily task generation for {today}")

    try:
        service = RoutineService(db)
        count = await service.generate_tasks_for_all_routines(today)

        logger.info(f"Successfully generated {count} tasks from routines for {today}")

    except Exception as e:
        logger.error(f"Error generating daily tasks: {e}", exc_info=True)
        raise
