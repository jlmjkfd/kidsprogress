# Recurring Tasks - Dynamic Expansion Plan

## Current Implementation (Temporary Solution)

### What We Have Now
- **Instance Generation**: When creating a recurring task, the system immediately generates all task instances upfront
- **Storage**: Each recurrence is stored as a separate task document in MongoDB
- **Expansion**: Uses `_generate_recurring_instances()` in TaskService
- **Patterns Supported**:
  - Standard RRULE (DAILY, WEEKLY, MONTHLY with COUNT)
  - School day patterns (FREQ=SCHOOL_DAYS, FREQ=HOLIDAYS)

### Limitations of Current Approach
1. **Database Bloat**: Creating 365 daily tasks generates 365 documents immediately
2. **No Dynamic Updates**: If school calendar changes, existing instances don't update
3. **Storage Waste**: Generates far-future tasks that may never be completed
4. **Editing Challenges**: Editing the source task doesn't update existing instances
5. **Performance**: Large batch inserts on task creation
6. **Inflexibility**: Can't easily "regenerate" or "extend" recurring series

### Why It's Temporary
This implementation was chosen for:
- **Quick MVP**: Get recurring tasks working end-to-end quickly
- **Simplicity**: Easy to understand and debug
- **Testing**: Allows testing the full flow without complex query logic

## Proposed Implementation (Dynamic Expansion)

### Core Concept
- **One Source Task**: Store only the recurring task definition (template)
- **Virtual Instances**: Generate task instances dynamically when querying
- **Materialization**: Create actual task documents only when:
  - User starts working on the task
  - Task is completed
  - Task status changes from DRAFT
  - Specific customization is needed

### Architecture

#### 1. Storage Model
```python
# Recurring Task Template (stored in DB)
{
  "_id": "abc123",
  "is_recurring": true,
  "recurrence_pattern": "FREQ=SCHOOL_DAYS;COUNT=60",
  "recurrence_start": "2025-01-01",
  "recurrence_end": "2025-12-31",  # or null for infinite
  "last_generated_date": null,  # Track materialization progress
  "status": "DRAFT",
  # ... other task fields serve as template
}

# Materialized Instance (created when needed)
{
  "_id": "xyz789",
  "is_recurring": false,
  "source_recurring_task_id": "abc123",
  "scheduled_date": "2025-01-15",
  "materialized_at": "2025-01-14T10:00:00Z",
  "status": "SCHEDULED",  # or IN_PROGRESS, COMPLETED
  # ... inherited from template
}
```

#### 2. Query Logic
```python
async def get_tasks_for_date_range(child_id, start_date, end_date):
    """Get all tasks including virtual recurring instances."""

    # 1. Get regular tasks (non-recurring or already materialized)
    regular_tasks = await db.tasks.find({
        "child_id": child_id,
        "scheduled_date": {"$gte": start_date, "$lte": end_date},
        "$or": [
            {"is_recurring": false},
            {"source_recurring_task_id": {"$exists": true}}
        ]
    })

    # 2. Get recurring task templates
    recurring_templates = await db.tasks.find({
        "child_id": child_id,
        "is_recurring": true,
        "source_recurring_task_id": null,
        "recurrence_start": {"$lte": end_date},
        "$or": [
            {"recurrence_end": {"$gte": start_date}},
            {"recurrence_end": null}
        ]
    })

    # 3. Expand templates into virtual instances for this date range
    virtual_instances = []
    for template in recurring_templates:
        dates = await expand_recurrence(
            template.recurrence_pattern,
            start_date,
            end_date
        )

        # Filter out dates that are already materialized
        materialized_dates = await get_materialized_dates(template._id)

        for date in dates:
            if date not in materialized_dates:
                virtual_instances.append(
                    create_virtual_instance(template, date)
                )

    # 4. Combine and return
    return regular_tasks + virtual_instances
```

#### 3. Materialization Triggers
```python
async def materialize_task_instance(template_id, scheduled_date):
    """Convert virtual instance to real document."""

    template = await db.tasks.find_one({"_id": template_id})

    # Create materialized instance
    instance = {
        **copy_template_fields(template),
        "is_recurring": false,
        "source_recurring_task_id": template_id,
        "scheduled_date": scheduled_date,
        "materialized_at": utcnow(),
        "status": "SCHEDULED",  # Start as SCHEDULED, not DRAFT
    }

    result = await db.tasks.insert_one(instance)
    return result.inserted_id

# Trigger points:
# - start_task(): Materialize before starting
# - update_task(): Materialize before editing specific instance
# - complete_task(): Already materialized by start_task()
# - schedule_conflict_detection(): Materialize to reserve time slot
```

#### 4. School Calendar Integration
```python
async def get_day_tasks_with_recurrence(child_id, target_date):
    """Get all tasks for a day including virtual recurring instances."""

    # Get materialized tasks
    materialized = await get_tasks_for_date(child_id, target_date)

    # Get recurring templates that might apply to this date
    templates = await get_active_recurring_templates(child_id, target_date)

    # Check each template
    virtual_tasks = []
    for template in templates:
        # Expand recurrence pattern
        if template.recurrence_pattern.startswith("FREQ=SCHOOL_DAYS"):
            # Check if target_date is a school day
            day_type = await school_calendar_service.get_day_type(
                child_id, target_date
            )
            if day_type.day_type == "school_day":
                # Check not already materialized
                if not is_materialized(template._id, target_date):
                    virtual_tasks.append(
                        create_virtual_instance(template, target_date)
                    )
        # ... handle other patterns

    return materialized + virtual_tasks
```

### Implementation Phases

#### Phase 1: Core Dynamic Expansion (2-3 days)
- [ ] Add `last_generated_date`, `recurrence_start`, `recurrence_end` to Task model
- [ ] Implement `expand_recurrence()` service method
- [ ] Update `get_tasks_for_date_range()` to include virtual instances
- [ ] Add `create_virtual_instance()` helper
- [ ] Update frontend queries to handle virtual instances (no _id)

#### Phase 2: Materialization (2 days)
- [ ] Implement `materialize_task_instance()`
- [ ] Update `start_task()` to materialize virtual instances
- [ ] Update `update_task()` to materialize before editing
- [ ] Add `get_materialized_dates()` query helper
- [ ] Handle edge cases (delete template, update template)

#### Phase 3: School Calendar Integration (1 day)
- [ ] Update `expand_school_day_rrule()` for dynamic expansion
- [ ] Cache day type lookups for performance
- [ ] Handle school calendar updates (invalidate cache)

#### Phase 4: UI Updates (2 days)
- [ ] Distinguish visual indicators for virtual vs materialized tasks
- [ ] Handle clicking virtual tasks (materialize on demand)
- [ ] Update task editing to show "applies to all" vs "this instance only"
- [ ] Add "Extend recurrence" UI for templates

#### Phase 5: Migration & Cleanup (1 day)
- [ ] Write migration script to convert existing instances to materialized
- [ ] Add database indexes for performance
- [ ] Remove old `_generate_recurring_instances()` method
- [ ] Update documentation

### Benefits of Dynamic Approach

1. **Scalability**: Can handle infinite recurrence without storage cost
2. **Flexibility**: Changing source task template affects all future instances
3. **School Calendar Integration**: Virtual instances automatically reflect calendar updates
4. **Performance**: No upfront batch inserts
5. **Storage Efficiency**: Only store tasks that are actually being worked on
6. **Smart Caching**: Can cache expansion results for frequently accessed date ranges

### Technical Considerations

#### Performance Optimizations
- Cache expanded recurrence dates (Redis or in-memory)
- Index on `is_recurring`, `source_recurring_task_id`, `scheduled_date`
- Batch materialize for week/month views
- Lazy load virtual instances (only expand when scrolling)

#### Edge Cases to Handle
- Deleting source task: Cascade delete or orphan instances?
- Editing source task: Apply to future only or all instances?
- Timezone handling for all-day recurring tasks
- DST transitions for fixed-time recurring tasks
- School calendar retroactive changes

#### Backward Compatibility
- Keep `source_recurring_task_id` to identify materialized instances
- Migration path: Mark existing instances as `materialized_at` = creation date
- Support both approaches during transition period

### Success Metrics
- [ ] Query performance: <100ms for month view with 100+ recurring tasks
- [ ] Storage reduction: 90%+ reduction in task documents
- [ ] User experience: No visible lag when opening calendar
- [ ] Accuracy: 100% match between virtual and would-be-materialized instances

### Timeline
- **Phase 1**: Week 1
- **Phase 2**: Week 2
- **Phase 3**: Week 2
- **Phase 4**: Week 3
- **Phase 5**: Week 3

**Total Estimate**: 3-4 weeks for full implementation

## References
- Current implementation: `backend/services/task_service.py:_generate_recurring_instances()`
- School calendar integration: `backend/services/school_calendar_service.py:expand_school_day_rrule()`
- Task model: `backend/models/task.py`

## Notes
- The temporary solution is acceptable for MVP and testing
- Dynamic expansion becomes critical when:
  - Users create long-running recurring tasks (1 year+)
  - School calendar changes frequently
  - System has many users with many recurring tasks
- Consider using a proven RRULE library (python-dateutil) for production
