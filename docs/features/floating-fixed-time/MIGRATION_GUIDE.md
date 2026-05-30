# Database Migration Guide: Floating/Fixed Time

## What Changed

### Before (Old Model)
```python
scheduled_date: datetime  # "2026-01-11T00:00:00Z"
```

### After (New Model)
```python
# Floating time (default - 95% of tasks)
is_floating_time: bool = True
scheduled_date: str = "2026-01-11"  # Date only
scheduled_time: str = "15:00"        # Optional time
created_timezone: str = "Pacific/Auckland"

# Fixed time (special cases)
is_floating_time: bool = False
scheduled_datetime: datetime = "2026-01-11T15:00:00Z"
scheduled_timezone: str = "America/New_York"
created_timezone: str = "Pacific/Auckland"
```

## Migration Steps

### Option 1: Fresh Start (Recommended for Development)

**Step 1: Backup (Optional)**
```bash
mongodump --db kidsprogress --out backup_$(date +%Y%m%d)
```

**Step 2: Empty Collections**
```javascript
// In MongoDB shell or Compass
use kidsprogress

// Empty these collections (will be regenerated)
db.tasks.deleteMany({})
db.recurrence_rules.deleteMany({})
db.completions.deleteMany({})  // Optional: depends on tasks

// Keep these collections (user data)
// - users
// - children
// - task_collections
// - school_calendars
// - parents
```

**Step 3: Restart Backend**
```bash
cd backend
# Backend will auto-reload with new models
```

**Step 4: Create Test Tasks**
- Create a floating time task (default)
- Create a fixed time task (with timezone)
- Create a recurring task
- Verify all work correctly

###Option 2: Data Migration (If Preserving Existing Tasks)

**Step 1: Create Migration Script**

Create `backend/scripts/migrate_floating_fixed_time.py`:

```python
"""Migrate existing tasks to floating/fixed time model."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from zoneinfo import ZoneInfo

MONGO_URI = "mongodb://localhost:27016"
DB_NAME = "kidsprogress"

async def migrate_tasks():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    tasks_collection = db.tasks

    # Get all tasks with old scheduled_date format (datetime)
    cursor = tasks_collection.find({
        "scheduled_date": {"$exists": True, "$type": "date"}
    })

    count = 0
    async for task in cursor:
        old_scheduled_date = task.get("scheduled_date")
        if not old_scheduled_date or not isinstance(old_scheduled_date, datetime):
            continue

        # Convert to floating time (default)
        # Assume timezone is Pacific/Auckland (or get from user settings)
        tz = ZoneInfo("Pacific/Auckland")

        # If naive, assume UTC
        if old_scheduled_date.tzinfo is None:
            old_scheduled_date = old_scheduled_date.replace(tzinfo=ZoneInfo("UTC"))

        # Convert to local timezone
        local_dt = old_scheduled_date.astimezone(tz)

        # Extract date and time
        new_scheduled_date = local_dt.strftime("%Y-%m-%d")
        new_scheduled_time = None

        # If task has fixed_time_slot, extract time
        if task.get("fixed_time_slot"):
            new_scheduled_time = task["fixed_time_slot"]["start"]

        # Update task
        update_fields = {
            "is_floating_time": True,
            "scheduled_date": new_scheduled_date,
            "created_timezone": "Pacific/Auckland"
        }

        if new_scheduled_time:
            update_fields["scheduled_time"] = new_scheduled_time

        await tasks_collection.update_one(
            {"_id": task["_id"]},
            {"$set": update_fields}
        )

        count += 1
        print(f"Migrated task {task['_id']}: {task.get('title')}")

    print(f"\nMigrated {count} tasks")
    client.close()

async def migrate_recurrence_rules():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    rules_collection = db.recurrence_rules

    # Add timezone field to all recurrence rules
    result = await rules_collection.update_many(
        {"timezone": {"$exists": False}},
        {"$set": {"timezone": "Pacific/Auckland"}}
    )

    print(f"Updated {result.modified_count} recurrence rules")
    client.close()

if __name__ == "__main__":
    print("Starting migration...")
    asyncio.run(migrate_tasks())
    asyncio.run(migrate_recurrence_rules())
    print("Migration complete!")
```

**Step 2: Run Migration**
```bash
cd backend
python scripts/migrate_floating_fixed_time.py
```

**Step 3: Verify**
```javascript
// Check a few tasks in MongoDB
db.tasks.find({}).limit(5).pretty()

// Should see:
// - is_floating_time: true
// - scheduled_date: "2026-01-11" (string)
// - scheduled_time: "15:00" (if has time)
// - created_timezone: "Pacific/Auckland"
```

## Collections Affected

### Collections to Empty (Option 1):
- ✅ `tasks` - Will be recreated
- ✅ `recurrence_rules` - Will be recreated
- ✅ `completions` - Depends on tasks (optional to keep)

### Collections to Keep:
- ✅ `users` - User accounts
- ✅ `children` - Child profiles
- ✅ `parents` - Parent profiles
- ✅ `task_collections` - Task categories
- ✅ `school_calendars` - School schedules
- ✅ `task_templates` - Template definitions
- ✅ `devices` - Device registrations

## Verification Checklist

After migration:

- [ ] Create floating time task - verify it stores `scheduled_date` as string
- [ ] Create fixed time task - verify it stores `scheduled_datetime` and `scheduled_timezone`
- [ ] Create recurring task - verify virtual instances generate correctly
- [ ] View task in frontend - verify date displays correctly
- [ ] Complete a task - verify completion saves correctly
- [ ] Check overdue tasks - verify they calculate correctly

## Rollback Plan

If migration fails:

**Option 1: Restore from backup**
```bash
mongorestore --db kidsprogress backup_YYYYMMDD/kidsprogress
```

**Option 2: Revert code**
```bash
git revert HEAD
# Restart backend
```

## Troubleshooting

### Issue: Tasks not showing in calendar

**Cause:** Frontend still using old date format
**Solution:** Clear browser cache, hard refresh (Ctrl+Shift+R)

### Issue: Validation errors when creating tasks

**Cause:** Missing required fields for floating/fixed time
**Solution:** Check that either:
- `scheduled_date` is provided (floating), OR
- `scheduled_datetime` + `scheduled_timezone` are provided (fixed)

### Issue: Recurring tasks start on wrong date

**Cause:** Recurrence rule not migrated
**Solution:** Empty recurrence_rules collection and recreate tasks

## Notes

- Default timezone: `Pacific/Auckland` (NZ)
- All new tasks default to floating time
- Fixed time requires explicit selection in UI
- Old datetime format still supported for reading (backwards compatible)
- Writing always uses new format

## Questions?

See:
- Implementation plan: `docs/features/floating-fixed-time/plan.md`
- Timezone strategy: `docs/architecture/timezone-strategy.md`
- Architecture patterns: `.claude/skills/architecture-patterns.md`
