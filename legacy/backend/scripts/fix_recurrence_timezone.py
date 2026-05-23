"""Fix recurrence rule effective_from dates that were set incorrectly due to timezone issues.

This script updates recurrence rules that start from Jan 10 but should start from Jan 11
(or any other date that was off by one day due to UTC vs local timezone issues).
"""

import asyncio
from datetime import date, datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = "mongodb://localhost:27016"
DB_NAME = "kidsprogress"

async def fix_recurrence_rules():
    """Fix recurrence rules with incorrect effective_from dates."""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    # Find all recurrence rules starting from 2026-01-10
    rules_collection = db.recurrence_rules
    tasks_collection = db.tasks

    # Find rules that might be affected (starting from Jan 10, 2026)
    wrong_date = date(2026, 1, 10)
    correct_date = date(2026, 1, 11)

    cursor = rules_collection.find({
        "effective_from": {"$gte": datetime.combine(wrong_date, datetime.min.time()),
                          "$lt": datetime.combine(date(2026, 1, 11), datetime.min.time())}
    })

    rules_to_fix = await cursor.to_list(length=100)

    print(f"Found {len(rules_to_fix)} recurrence rules starting from Jan 10, 2026")

    for rule in rules_to_fix:
        print(f"\nRule ID: {rule['_id']}")
        print(f"  Task template ID: {rule['task_template_id']}")
        print(f"  Current effective_from: {rule['effective_from']}")

        # Get the task to check its scheduled_date
        task = await tasks_collection.find_one({"_id": rule['task_template_id']})
        if task:
            print(f"  Task scheduled_date: {task.get('scheduled_date')}")
            print(f"  Task title: {task.get('title')}")

            # Ask user if they want to fix this rule
            response = input(f"  Update effective_from to {correct_date}? (y/n): ")
            if response.lower() == 'y':
                # Update the rule
                result = await rules_collection.update_one(
                    {"_id": rule['_id']},
                    {"$set": {"effective_from": datetime.combine(correct_date, datetime.min.time())}}
                )
                print(f"  ✓ Updated! Modified {result.modified_count} rule(s)")
            else:
                print(f"  Skipped")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(fix_recurrence_rules())
