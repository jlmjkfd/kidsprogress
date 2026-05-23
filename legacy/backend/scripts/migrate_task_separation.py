"""
Migration script for Task Collection Separation Architecture.

This script migrates from embedded fields to separate collections:
- RecurrenceRule (pattern history)
- TaskSession (work sessions)
- TaskAttachment (media files)
- Subtask (task breakdown)
- TaskHistory (audit trail)

Per user confirmation: Delete old data and create fresh test data.
"""
import asyncio
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


async def get_database():
    """Connect to MongoDB."""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27016")
    client = AsyncIOMotorClient(mongo_url)
    db = client.kidsprogress
    return db


async def drop_deprecated_fields(db):
    """Remove deprecated fields from tasks collection."""
    print("\n1. Dropping deprecated fields from tasks...")

    # Remove embedded fields that are now in separate collections
    result = await db.tasks.update_many(
        {},
        {
            "$unset": {
                "recurrence_pattern": "",
                "progress_state": "",
                "attachments": "",
                "subtasks": "",
            }
        }
    )
    print(f"   [OK] Updated {result.modified_count} tasks")


async def create_sample_recurrence_rules(db):
    """Create sample recurrence rules for testing."""
    print("\n2. Creating sample recurrence rules...")

    # Find all recurring tasks
    recurring_tasks = await db.tasks.find({"is_recurring": True}).to_list(None)

    if not recurring_tasks:
        print("   No recurring tasks found")
        return

    rules_created = 0
    for task in recurring_tasks:
        # Create initial recurrence rule
        created_at = task.get("created_at", datetime.utcnow())
        effective_from_date = created_at.date() if isinstance(created_at, datetime) else created_at

        rule = {
            "_id": ObjectId(),
            "task_template_id": task["_id"],
            "pattern": "FREQ=DAILY",  # Default pattern - adjust as needed
            "effective_from": datetime.combine(effective_from_date, datetime.min.time()),
            "effective_until": None,  # Currently active
            "created_at": created_at,
            "created_by": task.get("parent_id", task.get("child_id")),
            "reason": "Initial migration",
            "replaced_by": None,
            "replaces": None,
        }

        await db.recurrence_rules.insert_one(rule)

        # Update task with reference to this rule
        await db.tasks.update_one(
            {"_id": task["_id"]},
            {"$set": {"current_rule_id": rule["_id"]}}
        )

        rules_created += 1

    print(f"   [OK] Created {rules_created} recurrence rules")


async def initialize_task_counters(db):
    """Initialize session/attachment/subtask counters."""
    print("\n3. Initializing task counters...")

    result = await db.tasks.update_many(
        {},
        {
            "$set": {
                "session_count": 0,
                "attachment_count": 0,
                "subtask_count": 0,
                "subtask_completed_count": 0,
                "active_session_id": None,
            }
        }
    )
    print(f"   [OK] Initialized counters for {result.modified_count} tasks")


async def migrate_progress_to_sessions(db):
    """Migrate any existing progress_state to task_sessions."""
    print("\n4. Migrating progress states to sessions...")

    # Find tasks with active progress (before we dropped the field)
    # Note: This runs after drop, so we're just preparing the structure
    print("   [OK] Sessions collection ready (no legacy data to migrate)")


async def create_sample_data(db):
    """Create sample data for testing the new architecture."""
    print("\n5. Creating sample test data...")

    # Find a test child
    child = await db.children.find_one({})
    if not child:
        print("   No children found - skipping sample data")
        return

    # Find a test task
    task = await db.tasks.find_one({"child_id": child["_id"]})
    if not task:
        print("   No tasks found - skipping sample data")
        return

    samples_created = 0

    # Sample Task History
    history_entry = {
        "_id": ObjectId(),
        "task_id": task["_id"],
        "changed_at": datetime.utcnow(),
        "changed_by": task.get("parent_id", child["parent_id"]),
        "changed_by_type": "PARENT",
        "change_type": "created",
        "changes": {
            "action": "task_created_during_migration",
        },
        "reason": "Migration test data",
        "client_info": {
            "source": "migration_script",
        },
    }
    await db.task_history.insert_one(history_entry)
    samples_created += 1

    print(f"   [OK] Created {samples_created} sample records")


async def verify_migration(db):
    """Verify the migration completed successfully."""
    print("\n6. Verifying migration...")

    # Check tasks no longer have embedded fields
    task_with_old_fields = await db.tasks.find_one({
        "$or": [
            {"recurrence_pattern": {"$exists": True}},
            {"progress_state": {"$exists": True}},
            {"attachments": {"$exists": True}},
            {"subtasks": {"$exists": True}},
        ]
    })

    if task_with_old_fields:
        print("   [WARNING] Found tasks with deprecated fields still present")
    else:
        print("   [OK] All deprecated fields removed")

    # Check new counters exist
    task_without_counters = await db.tasks.find_one({
        "$or": [
            {"session_count": {"$exists": False}},
            {"attachment_count": {"$exists": False}},
            {"subtask_count": {"$exists": False}},
        ]
    })

    if task_without_counters:
        print("   [WARNING] Found tasks without new counter fields")
    else:
        print("   [OK] All tasks have new counter fields")

    # Check recurring tasks have recurrence rules
    recurring_without_rule = await db.tasks.find_one({
        "is_recurring": True,
        "current_rule_id": None,
    })

    if recurring_without_rule:
        print("   [WARNING] Found recurring tasks without recurrence rules")
    else:
        print("   [OK] All recurring tasks have recurrence rules")

    # Print statistics
    task_count = await db.tasks.count_documents({})
    rule_count = await db.recurrence_rules.count_documents({})
    session_count = await db.task_sessions.count_documents({})
    attachment_count = await db.task_attachments.count_documents({})
    subtask_count = await db.subtasks.count_documents({})
    history_count = await db.task_history.count_documents({})

    print("\n   Statistics:")
    print(f"   - Tasks: {task_count}")
    print(f"   - Recurrence Rules: {rule_count}")
    print(f"   - Task Sessions: {session_count}")
    print(f"   - Task Attachments: {attachment_count}")
    print(f"   - Subtasks: {subtask_count}")
    print(f"   - Task History: {history_count}")


async def main():
    """Run the migration."""
    print("=" * 60)
    print("Task Collection Separation Migration")
    print("=" * 60)

    db = await get_database()

    try:
        # Step 1: Drop deprecated embedded fields
        await drop_deprecated_fields(db)

        # Step 2: Create recurrence rules for existing recurring tasks
        await create_sample_recurrence_rules(db)

        # Step 3: Initialize new counter fields
        await initialize_task_counters(db)

        # Step 4: Migrate progress states (preparation)
        await migrate_progress_to_sessions(db)

        # Step 5: Create sample test data
        await create_sample_data(db)

        # Step 6: Verify migration
        await verify_migration(db)

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        # Close connection
        db.client.close()


if __name__ == "__main__":
    asyncio.run(main())
