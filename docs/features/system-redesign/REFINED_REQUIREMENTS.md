# Refined Requirements - Final Design

**Date**: 2025-12-08
**Status**: Approved - Ready for Implementation

---

## Executive Summary

Based on user feedback, the design has been simplified:

1. ✅ **Remove both rollover and carry-over systems** (simpler architecture)
2. ✅ **Unified "Kids Create Tasks" feature** (combines planning + quick capture)
3. ⏸️ **Memo feature postponed** (to be considered later)

---

## Part 1: Overdue Tasks - Simplified Design ✅

### Decision: Remove Both Systems

**Remove**:
- ❌ Rollover system (`task_rollover_job.py`)
- ❌ Carry-over system (`task_carryover_job.py` - just created, delete it)
- ❌ All carry-over fields from Task model

**Rationale**:
- No automatic date changes (simpler mental model)
- No nightly jobs (less complexity)
- Tasks naturally stay on their original scheduled date
- Simple query-based approach

### Implementation

#### 1. Remove These Files

```diff
- backend/jobs/task_rollover_job.py (DELETE)
- backend/jobs/task_carryover_job.py (DELETE)
- backend/services/task_service/rollover.py (DELETE rollover_task() method)
```

#### 2. Remove Database Fields

```python
# backend/models/task.py
class Task(BaseModel):
    # DELETE these fields:
    # is_carried_over: bool
    # carried_over_from: Optional[datetime]
    # carried_over_at: Optional[datetime]
    # carry_over_count: int

    # KEEP these (used for backlog feature):
    # is_in_backlog: bool
    # rollover_count: int (rename to overdue_days?)
```

#### 3. Update Job Scheduler

```python
# backend/jobs/__init__.py
def init_scheduler(db: AsyncIOMotorDatabase):
    # Daily task generation - runs at 00:00 (midnight)
    scheduler.add_job(
        generate_daily_tasks,
        trigger=CronTrigger(hour=0, minute=0),
        args=[db],
        id="daily_task_generator",
        name="Generate daily tasks from routines",
        replace_existing=True,
        misfire_grace_time=300
    )
    logger.info("Scheduled daily task generator job at 00:00")

    # REMOVE: Task rollover job
    # REMOVE: Task carry-over job

    scheduler.start()
    logger.info("Job scheduler started successfully")
```

#### 4. Overdue Tasks Backend API

```python
# backend/routes/tasks.py

@router.get("/child/{child_id}/overdue")
async def get_overdue_tasks(
    child_id: str,
    must_do_only: bool = Query(False, description="Show only MUST_DO tasks"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get all overdue tasks for a child.

    Overdue = scheduled before today AND not completed/skipped/archived.

    Args:
        must_do_only: If True, only return MUST_DO tasks
    """
    return await service.get_overdue_tasks(child_id, str(current_user.id), must_do_only)


@router.get("/child/{child_id}/overdue/stats")
async def get_overdue_stats(
    child_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get overdue task statistics.

    Returns:
        {
            "total_overdue": 15,
            "must_do_overdue": 5,
            "by_date": {
                "2025-12-07": 3,
                "2025-12-06": 2,
                ...
            }
        }
    """
    return await service.get_overdue_stats(child_id, str(current_user.id))
```

#### 5. Overdue Tasks Service Implementation

```python
# backend/services/task_service/crud.py

async def get_overdue_tasks(
    self,
    child_id: str,
    parent_id: str,
    must_do_only: bool = False
) -> List[Dict[str, Any]]:
    """Get all overdue tasks for a child."""
    from datetime import date, datetime

    child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
    parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

    today_start = datetime.combine(date.today(), datetime.min.time())

    query = {
        "child_id": child_id_obj,
        "parent_id": parent_id_obj,
        "scheduled_date": {"$lt": today_start},
        "status": {"$nin": ["completed", "skipped", "archived"]},
    }

    if must_do_only:
        query["obligation_level"] = "MUST_DO"

    cursor = self.tasks_collection.find(query).sort("scheduled_date", -1)  # Newest first
    tasks = []

    async for doc in cursor:
        task_obj = Task(**doc)
        task_dict = task_obj.model_dump(mode='json', by_alias=True)
        if "_id" in task_dict and not isinstance(task_dict["_id"], str):
            task_dict["_id"] = str(task_dict["_id"])
        tasks.append(task_dict)

    return tasks


async def get_overdue_stats(
    self,
    child_id: str,
    parent_id: str
) -> Dict[str, Any]:
    """Get overdue task statistics."""
    from datetime import date, datetime
    from collections import defaultdict

    child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
    parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

    today_start = datetime.combine(date.today(), datetime.min.time())

    # Get all overdue tasks
    all_overdue = await self.tasks_collection.find({
        "child_id": child_id_obj,
        "parent_id": parent_id_obj,
        "scheduled_date": {"$lt": today_start},
        "status": {"$nin": ["completed", "skipped", "archived"]},
    }).to_list(None)

    # Count by obligation level
    must_do_count = sum(1 for t in all_overdue if t.get("obligation_level") == "MUST_DO")

    # Count by date
    by_date = defaultdict(int)
    for task in all_overdue:
        scheduled = task.get("scheduled_date")
        if scheduled:
            date_key = scheduled.date().isoformat() if isinstance(scheduled, datetime) else scheduled
            by_date[date_key] += 1

    return {
        "total_overdue": len(all_overdue),
        "must_do_overdue": must_do_count,
        "by_date": dict(by_date)
    }
```

### Overdue Tasks UI

#### Child Portal - Task List with Tabs

```tsx
// frontend/src/pages/child-portal/tasks/index.tsx

import { useOverdueTasks, useOverdueStats } from '@/api/queries/useTasks';

export default function ChildTasksPage() {
  const { childId } = useParams();
  const [activeTab, setActiveTab] = useState<'today' | 'overdue'>('today');

  const { data: todayTasks } = useTasksByChild(childId);
  const { data: overdueTasks } = useOverdueTasks(childId);
  const { data: overdueStats } = useOverdueStats(childId);

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">
            {t('tasks:today')}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            {t('tasks:overdue')} ({overdueStats?.total_overdue || 0})
            {overdueStats?.must_do_overdue > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overdueStats.must_do_overdue} {t('tasks:must_do')}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <TodayTasksView tasks={todayTasks} />
        </TabsContent>

        <TabsContent value="overdue">
          <OverdueTasksView tasks={overdueTasks} stats={overdueStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### Overdue Tasks View Component

```tsx
// frontend/src/pages/child-portal/tasks/components/OverdueTasksView.tsx

interface OverdueTasksViewProps {
  tasks: Task[];
  stats: OverdueStats;
}

export function OverdueTasksView({ tasks, stats }: OverdueTasksViewProps) {
  // Group tasks by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const dateKey = task.scheduled_date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState>
        <IconCircleCheck className="h-12 w-12 text-green-500" />
        <h3>{t('tasks:all_caught_up')}</h3>
        <p>{t('tasks:no_overdue_tasks')}</p>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
        <div className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-orange-600" />
          <p className="font-medium text-orange-800">
            {t('tasks:overdue_summary', {
              total: stats.total_overdue,
              mustDo: stats.must_do_overdue
            })}
          </p>
        </div>
      </div>

      {/* Tasks grouped by date */}
      {Object.entries(groupedByDate)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Newest first
        .map(([date, dateTasks]) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700">
                {formatDate(date)} ({dateTasks.length})
              </h3>
            </div>

            <div className="space-y-2">
              {dateTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  variant="overdue"
                  showDate={false} // Date already shown in header
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
```

#### Calendar View - Highlight Overdue MUST_DO Days

```tsx
// frontend/src/pages/child-portal/calendar/index.tsx

export function ChildCalendarView() {
  const { data: overdueStats } = useOverdueStats(childId);

  const getDayStyle = (date: string) => {
    const mustDoCount = overdueStats?.by_date?.[date] || 0;

    if (mustDoCount > 0) {
      return {
        className: "bg-red-100 border-2 border-red-500",
        badge: <Badge variant="destructive">{mustDoCount}</Badge>
      };
    }

    return { className: "", badge: null };
  };

  return (
    <Calendar>
      {daysOfMonth.map(day => {
        const style = getDayStyle(day);
        return (
          <CalendarDay key={day} className={style.className}>
            <DayNumber>{day}</DayNumber>
            {style.badge}
            {/* Tasks for this day */}
          </CalendarDay>
        );
      })}
    </Calendar>
  );
}
```

#### Frontend API Hooks

```typescript
// frontend/src/api/queries/useTasks.ts

export const useOverdueTasks = (childId: string, mustDoOnly: boolean = false) => {
  return useQuery({
    queryKey: ["tasks", "child", childId, "overdue", mustDoOnly],
    queryFn: async () => {
      const response = await apiClient.get<Task[]>(
        `/api/tasks/child/${childId}/overdue`,
        { params: { must_do_only: mustDoOnly } }
      );
      return response.data;
    },
    enabled: !!childId,
  });
};

export const useOverdueStats = (childId: string) => {
  return useQuery({
    queryKey: ["tasks", "child", childId, "overdue", "stats"],
    queryFn: async () => {
      const response = await apiClient.get<{
        total_overdue: number;
        must_do_overdue: number;
        by_date: Record<string, number>;
      }>(`/api/tasks/child/${childId}/overdue/stats`);
      return response.data;
    },
    enabled: !!childId,
  });
};
```

---

## Part 2: Kids Create Tasks - Unified Feature ✅

### Decision: Combine "Kids Plan" + "Quick Capture"

**Single feature that supports**:
1. Planning ahead: "Tomorrow I want to practice guitar"
2. Quick capture: "I'm reading a book right now"

### User Stories

```
As a kid, I want to:
1. Add tasks I plan to do (so I can organize my day)
2. Record what I'm doing right now (so my parents can see)
3. See my own created tasks separately (so I feel ownership)
```

### Business Rules

✅ **Kids CAN**:
- Create one-off tasks (no recurrence)
- Assign to themselves only (not siblings)
- Set title, description, time
- Start immediately (quick capture mode)

❌ **Kids CANNOT**:
- Create recurring tasks (future feature)
- Set obligation_level (auto-set to OPTIONAL)
- Assign to other children
- Delete parent-created tasks

✅ **Parents CAN**:
- View all kid-created tasks
- Edit any field (convert to MUST_DO, etc.)
- Delete kid-created tasks
- No approval needed (trust model)

### Schema Addition

```python
# backend/models/task.py

class Task(BaseModel):
    # ... existing fields ...

    # New field
    created_by: str = "PARENT"  # "PARENT" or "CHILD"
    quick_capture: bool = False  # True if created via "What I'm Doing Now"
```

### Backend API

```python
# backend/routes/tasks.py

@router.post("/child/{child_id}/create")
async def create_task_as_child(
    child_id: str,
    task_data: ChildTaskCreate,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Create a task as a child.

    Kids can create simple one-off tasks for themselves.
    Auto-sets: obligation_level=OPTIONAL, created_by=CHILD
    """
    return await service.create_task_as_child(child_id, task_data)


# New request model
class ChildTaskCreate(BaseModel):
    """Simplified task creation for kids."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None  # Optional: for planning ahead
    scheduled_time: Optional[str] = None  # HH:MM format
    estimated_duration_minutes: Optional[int] = None
    quick_capture: bool = False  # True if "What I'm Doing Now"
```

### Service Implementation

```python
# backend/services/task_service/crud.py

async def create_task_as_child(
    self,
    child_id: str,
    task_data: ChildTaskCreate
) -> Task:
    """Create a task from child's perspective.

    Auto-sets restricted fields to safe defaults.
    """
    child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

    # Get child to get parent_id and collection_id
    child_doc = await self.db.children.find_one({"_id": child_id_obj})
    if not child_doc:
        raise ValueError("Child not found")

    parent_id = child_doc["parent_id"]

    # Get default collection for this child
    collection = await self.collections_collection.find_one({
        "child_id": child_id_obj,
        "is_default": True
    })
    if not collection:
        # Create default collection if doesn't exist
        collection = await self.collections_collection.insert_one({
            "child_id": child_id_obj,
            "parent_id": parent_id,
            "name": "My Tasks",
            "is_default": True,
            "created_at": utcnow()
        })
        collection_id = collection.inserted_id
    else:
        collection_id = collection["_id"]

    # Build task with safe defaults
    task = Task(
        collection_id=collection_id,
        child_id=child_id_obj,
        parent_id=parent_id,
        title=task_data.title,
        description=task_data.description,

        # Auto-set safe defaults
        created_by="CHILD",
        quick_capture=task_data.quick_capture,
        obligation_level=ObligationLevel.OPTIONAL,  # Kids can't create MUST_DO
        task_source=TaskSource.ONE_TIME,
        scheduling_type=SchedulingType.FLEXIBLE,

        # Quick capture starts immediately
        status=TaskStatus.IN_PROGRESS if task_data.quick_capture else TaskStatus.PENDING,
        started_at=utcnow() if task_data.quick_capture else None,

        # Schedule
        scheduled_date=task_data.scheduled_date or datetime.now(),
        estimated_duration_minutes=task_data.estimated_duration_minutes,

        # Defaults
        is_recurring=False,
        is_informational=False,
        blocks_other_tasks=False,
        can_be_interrupted=True,
        can_be_split=False,
        is_in_pool=False,
        rollover_count=0,
        is_in_backlog=False,
        is_delayed=False,
        concurrent_allowed=False,
        concurrent_compatible_with=[],
        priority_boost=0,
        exceptions=[],
        pause_history=[],
        metrics=[],
        quality_aspects=[],
        attachments=[],
        tools=[],
        subtasks=[],
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    result = await self.tasks_collection.insert_one(task.model_dump(by_alias=True, mode="json"))
    task.id = result.inserted_id

    return task
```

### Frontend UI

#### Quick Capture Button (Child Portal Home)

```tsx
// frontend/src/pages/child-portal/home/index.tsx

export default function ChildHomePage() {
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const { mutate: createTask } = useCreateTaskAsChild();

  const handleQuickCapture = (title: string) => {
    createTask({
      childId: currentChild.id,
      data: {
        title,
        quick_capture: true,
        scheduled_date: new Date().toISOString(),
      }
    }, {
      onSuccess: () => {
        toast.success(t('tasks:started_activity', { title }));
        setShowQuickCapture(false);
      }
    });
  };

  return (
    <div>
      {/* Quick Capture Button - Prominent */}
      <Button
        size="lg"
        onClick={() => setShowQuickCapture(true)}
        className="w-full mb-6 bg-gradient-to-r from-purple-500 to-pink-500"
      >
        <IconPlus className="mr-2" />
        {t('tasks:what_im_doing_now')}
      </Button>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        open={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onSubmit={handleQuickCapture}
      />
    </div>
  );
}
```

#### Quick Capture Modal

```tsx
// frontend/src/components/QuickCaptureModal.tsx

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
}

export function QuickCaptureModal({ open, onClose, onSubmit }: QuickCaptureModalProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit(title.trim());
      setTitle('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tasks:what_are_you_doing')}</DialogTitle>
          <DialogDescription>
            {t('tasks:quick_capture_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={t('tasks:activity_placeholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          {/* Suggested activities */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setTitle(t('tasks:suggestions.reading'))}
            >
              📚 {t('tasks:suggestions.reading')}
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setTitle(t('tasks:suggestions.playing'))}
            >
              🎮 {t('tasks:suggestions.playing')}
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setTitle(t('tasks:suggestions.drawing'))}
            >
              🎨 {t('tasks:suggestions.drawing')}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {t('tasks:start_now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Plan Ahead Form (Child Portal)

```tsx
// frontend/src/pages/child-portal/tasks/create.tsx

export default function ChildCreateTaskPage() {
  const { mutate: createTask } = useCreateTaskAsChild();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: new Date(),
    scheduled_time: '',
    estimated_duration_minutes: 30,
  });

  const handleSubmit = () => {
    createTask({
      childId: currentChild.id,
      data: {
        ...formData,
        quick_capture: false,
      }
    }, {
      onSuccess: () => {
        toast.success(t('tasks:task_created'));
        navigate('/child-portal/tasks');
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {t('tasks:plan_my_task')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>{t('tasks:what_do_you_want_to_do')}</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder={t('tasks:task_title_placeholder')}
            required
          />
        </div>

        <div>
          <Label>{t('tasks:notes_optional')}</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder={t('tasks:add_details')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('tasks:when')}</Label>
            <Input
              type="date"
              value={formData.scheduled_date.toISOString().split('T')[0]}
              onChange={(e) => setFormData({...formData, scheduled_date: new Date(e.target.value)})}
            />
          </div>

          <div>
            <Label>{t('tasks:time_optional')}</Label>
            <Input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label>{t('tasks:how_long')}</Label>
          <Select
            value={formData.estimated_duration_minutes.toString()}
            onValueChange={(val) => setFormData({...formData, estimated_duration_minutes: parseInt(val)})}
          >
            <SelectItem value="15">15 {t('common:minutes')}</SelectItem>
            <SelectItem value="30">30 {t('common:minutes')}</SelectItem>
            <SelectItem value="60">1 {t('common:hour')}</SelectItem>
          </Select>
        </div>

        <Button type="submit" className="w-full">
          {t('tasks:add_to_my_list')}
        </Button>
      </form>
    </div>
  );
}
```

#### Parent View - Filter Kid-Created Tasks

```tsx
// frontend/src/pages/parent-portal/children/[id]/tasks.tsx

export function ParentChildTasksView() {
  const [filter, setFilter] = useState<'all' | 'parent' | 'child'>('all');
  const { data: tasks } = useTasksByChild(childId);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.created_by === (filter === 'parent' ? 'PARENT' : 'CHILD'));
  }, [tasks, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Badge
          variant={filter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilter('all')}
        >
          {t('tasks:all_tasks')} ({tasks?.length})
        </Badge>
        <Badge
          variant={filter === 'parent' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilter('parent')}
        >
          {t('tasks:parent_created')} ({tasks?.filter(t => t.created_by === 'PARENT').length})
        </Badge>
        <Badge
          variant={filter === 'child' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilter('child')}
        >
          {t('tasks:child_created')} ({tasks?.filter(t => t.created_by === 'CHILD').length})
        </Badge>
      </div>

      <TaskList tasks={filteredTasks} />
    </div>
  );
}
```

---

## Summary of Changes

### ✅ To Remove
1. `backend/jobs/task_rollover_job.py` - DELETE
2. `backend/jobs/task_carryover_job.py` - DELETE
3. `backend/services/task_service/rollover.py` - DELETE `rollover_task()` method
4. `backend/models/task.py` - REMOVE carry-over fields
5. `frontend/src/api/queries/useTasks.ts` - REMOVE `useTasksSeparatedByCarryover`
6. `frontend/src/types/task.ts` - REMOVE carry-over fields

### ✅ To Add
1. **Overdue System**:
   - Backend: Overdue tasks API endpoint + stats endpoint
   - Service: `get_overdue_tasks()`, `get_overdue_stats()`
   - Frontend: Overdue tab, overdue stats display, calendar highlighting

2. **Kids Create Tasks**:
   - Backend: `create_task_as_child()` endpoint
   - Model: Add `created_by`, `quick_capture` fields
   - Frontend: Quick capture modal, plan ahead form, parent filter view

### ⏸️ Postponed
- Memo/reminder system (to be designed later)

---

## Implementation Effort

| Feature | Complexity | Estimated Hours |
|---------|-----------|-----------------|
| Remove rollover/carry-over systems | 🟢 Low | 2 hours |
| Overdue tasks backend | 🟢 Low | 3 hours |
| Overdue tasks UI (tab + calendar) | 🟡 Medium | 5 hours |
| Kids create tasks backend | 🟢 Low | 3 hours |
| Quick capture modal | 🟢 Low | 2 hours |
| Plan ahead form | 🟡 Medium | 4 hours |
| Parent view filters | 🟢 Low | 2 hours |

**Total**: ~21 hours (3 days)

---

## Next Steps

1. ✅ Remove rollover and carry-over systems
2. ✅ Implement overdue tasks feature
3. ✅ Implement kids create tasks feature
4. Test thoroughly with edge cases
5. Update i18n translations
6. Update documentation

Ready to begin implementation?
