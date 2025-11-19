"""Check tasks in database for invalid task_source values."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def check_tasks():
    """Check all tasks in database."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["kidsprogress"]
    tasks_collection = db["tasks"]

    # Count all tasks
    total = await tasks_collection.count_documents({})
    print(f"Total tasks: {total}")

    # Find tasks with task_source='recurring'
    recurring_source = await tasks_collection.count_documents({"task_source": "recurring"})
    print(f"Tasks with task_source='recurring': {recurring_source}")

    # Show a sample
    if recurring_source > 0:
        async for task in tasks_collection.find({"task_source": "recurring"}).limit(3):
            print(f"\nSample task:")
            print(f"  _id: {task['_id']}")
            print(f"  title: {task.get('title')}")
            print(f"  task_source: {task.get('task_source')}")
            print(f"  is_recurring: {task.get('is_recurring')}")

    # Find ALL tasks and check task_source values
    print(f"\nAll task_source values:")
    async for task in tasks_collection.find({}, {"_id": 1, "title": 1, "task_source": 1}):
        print(f"  {task['_id']}: {task.get('title')} - task_source={task.get('task_source')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_tasks())
