"""Task rollover job - runs at 23:00 to rollover incomplete must-do tasks."""
import logging
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.services.task_service import TaskService
from backend.models.task import ObligationLevel, TaskStatus
from backend.utils.query_builders import date_range_query

logger = logging.getLogger(__name__)


async def rollover_incomplete_tasks(db: AsyncIOMotorDatabase):
    """Rollover incomplete must-do tasks to the next day.

    This job runs at 23:00 (11 PM) daily.
    - Finds all SCHEDULED or IN_PROGRESS tasks with obligation_level=MUST_DO
    - If scheduled for today and not completed, rollover to tomorrow
    - After 3 rollovers, move to backlog and notify parent
    """
    today = date.today()
    tomorrow = today + timedelta(days=1)
    tomorrow_datetime = datetime.combine(tomorrow, datetime.min.time())

    logger.info(f"Starting task rollover process for {today}")

    try:
        task_service = TaskService(db)

        # Find incomplete must-do tasks scheduled for today
        query = {
            "obligation_level": ObligationLevel.MUST_DO.value,
            "status": {"$in": [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value]},
        }
        query.update(date_range_query("scheduled_date", today, today))

        tasks_cursor = db.tasks.find(query)
        rollover_count = 0
        backlog_count = 0

        async for task_doc in tasks_cursor:
            task_id = str(task_doc["_id"])
            current_rollover_count = task_doc.get("rollover_count", 0)

            if current_rollover_count >= 3:
                # Move to backlog after 3 rollovers
                await task_service.move_to_backlog(task_id)
                backlog_count += 1
                logger.info(f"Moved task {task_id} to backlog after 3 rollovers")

                # TODO: Send notification to parent in Phase 2
                # await notify_parent_backlog(task_doc["parent_id"], task_id)

            else:
                # Rollover to tomorrow
                await task_service.rollover_task(task_id, tomorrow_datetime)
                rollover_count += 1
                logger.info(f"Rolled over task {task_id} to {tomorrow}")

        logger.info(
            f"Rollover complete: {rollover_count} tasks rolled over, "
            f"{backlog_count} tasks moved to backlog"
        )

    except Exception as e:
        logger.error(f"Error during task rollover: {e}", exc_info=True)
        raise
