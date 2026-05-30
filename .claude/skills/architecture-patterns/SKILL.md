---
name: architecture-patterns
description: Design patterns used across the KidsProgress task system: Value Objects (TaskIdentifier), State Machines, Strategy, Observer/Event Bus, Specification. Use when designing or refactoring task-domain code, especially backend/models/task_*.py and backend/services/task_service/.
---

# Architecture Patterns & Refactoring Guidelines

> **Purpose**: Design patterns and architectural guidelines for building maintainable, scalable features in KidsProgress.
>
> **Reference**: See `docs/architecture/task-system-refactoring-plan.md` for comprehensive refactoring plan.

---

## Core Principles

### 1. Reduce Complexity Through Abstraction

**DO**:
- 鉁?Extract repeated conditional logic into classes/functions
- 鉁?Use value objects to encapsulate related data and behavior
- 鉁?Create abstractions that hide implementation details
- 鉁?Make code changes localized (change one place, not ten)

**DON'T**:
- 鉂?Copy-paste similar logic across files
- 鉂?Leak implementation details (e.g., virtual task ID format) throughout codebase
- 鉂?Create "god functions" with too many responsibilities

### 2. Prefer Composition Over Inheritance

**DO**:
- 鉁?Use strategy pattern for different behaviors
- 鉁?Compose functionality with small, focused components
- 鉁?Inject dependencies rather than hardcoding them

**DON'T**:
- 鉂?Create deep inheritance hierarchies
- 鉂?Use inheritance for code reuse (use composition instead)

### 3. Single Responsibility Principle

Each class/function should have one reason to change.

**Example - BEFORE** (multiple responsibilities):
```python
async def complete_task(task_id):
    # Validate state
    if current_status not in [PENDING, IN_PROGRESS]:
        raise ValueError(...)

    # Update database
    await db.update(...)

    # Remove session
    await sessions.delete(...)

    # Send notification
    await notify(...)
```

**Example - AFTER** (single responsibility):
```python
# State machine handles validation
TaskStateMachine.validate_transition(current, COMPLETED)

# Event bus handles side effects
await event_bus.publish(TaskCompleted(...))
```

---

## Design Patterns to Use

### 1. Value Object Pattern

**When to Use**: Encapsulate related data that doesn't have identity.

**Example**: TaskIdentifier

```python
# BAD: Logic scattered everywhere
if "_" in task_id:
    template_id = task_id.rsplit("_", 1)[0]
    date = task_id.rsplit("_", 1)[1]
    # ... parse date, handle errors, etc.

# GOOD: Encapsulated in value object
identifier = TaskIdentifier(raw_id=task_id)
if identifier.is_virtual:
    template_id = identifier.template_id
    date = identifier.occurrence_date
```

**Benefits**:
- Validation in one place
- Reusable across codebase
- Self-documenting (properties show what's available)
- Easy to change internal representation

### 2. State Machine Pattern

**When to Use**: Managing object state transitions with validation.

**Example**: Task lifecycle

```python
# BAD: Scattered validation
if status in [PENDING, IN_PROGRESS, PAUSED]:
    # allow completion
else:
    raise ValueError(...)

# GOOD: Centralized state machine
TaskStateMachine.validate_transition(current_status, TaskStatus.COMPLETED)
```

**Benefits**:
- Single source of truth for valid transitions
- Easy to visualize allowed states
- Catches invalid transitions early
- Self-documenting

**When Implementing**:
1. Define all states as enum
2. Define transition rules in dict/class
3. Provide `can_transition()` and `validate_transition()` methods
4. Optional: Add `visualize()` for documentation

### 3. Strategy Pattern

**When to Use**: Different objects need different behaviors for the same operation.

**Example**: Task types (real vs virtual)

```python
# BAD: Conditional logic everywhere
if is_virtual:
    # virtual task logic
else:
    # real task logic

# GOOD: Strategy pattern
strategy = factory.create(identifier)
task = await strategy.get_task(identifier, parent_id)
```

**Benefits**:
- Adding new strategies doesn't modify existing code
- Each strategy is independently testable
- Clear separation of concerns
- Easy to understand: one strategy = one behavior

**When Implementing**:
1. Define abstract base with interface
2. Create concrete implementations
3. Create factory to select strategy
4. Client code uses factory, doesn't know about concrete types

### 4. Observer Pattern (Event Bus)

**When to Use**: Action needs to trigger multiple side effects.

**Example**: Task completion

```python
# BAD: Tightly coupled
await update_status(...)
await remove_session(...)
await send_notification(...)
await update_analytics(...)

# GOOD: Event-driven
await event_bus.publish(TaskCompleted(...))
# Handlers registered separately handle side effects
```

**Benefits**:
- Loose coupling
- Easy to add/remove handlers
- Handlers can be tested independently
- One handler failure doesn't break others

**When Implementing**:
1. Define event classes (use dataclasses)
2. Create event bus with subscribe/publish
3. Implement handlers as async functions
4. Register handlers at startup

### 5. Specification Pattern

**When to Use**: Building complex queries compositionally.

**Example**: Task queries

```python
# BAD: Complex query building
query = {
    "child_id": child_id,
    "scheduled_date": {"$lt": today},
    "status": {"$in": ["pending", "in_progress"]},
}
if must_do_only:
    query["obligation_level"] = "must_do"

# GOOD: Composable specifications
spec = ChildTasksSpec(child_id) & OverdueTasksSpec()
if must_do_only:
    spec = spec & ObligationLevelSpec("must_do")
query = spec.to_query()
```

**Benefits**:
- Reusable query components
- Composable with & and | operators
- Self-documenting
- Easy to test

**When Implementing**:
1. Define abstract base with `to_query()` method
2. Implement concrete specifications
3. Support & (__and__) and | (__or__) operators
4. Keep specifications small and focused

---

## Refactoring Workflow

### When to Refactor

**Indicators**:
- Code duplication (same logic in 3+ places)
- Complex conditional logic (cyclomatic complexity > 10)
- Long functions (>50 lines)
- Hard to add new feature without touching many files
- Tests are difficult to write

**Approach**:
1. 鉁?Write tests first (if they don't exist)
2. 鉁?Refactor incrementally (one pattern at a time)
3. 鉁?Run tests after each change
4. 鉁?Commit frequently with clear messages

### Refactoring Checklist

Before refactoring:
- [ ] Existing tests pass
- [ ] Understand current behavior
- [ ] Identify pattern to apply
- [ ] Plan changes (which files affected)

During refactoring:
- [ ] Implement new abstraction
- [ ] Update one usage site
- [ ] Run tests
- [ ] Update remaining usage sites one by one
- [ ] Remove old code once all sites updated

After refactoring:
- [ ] All tests still pass
- [ ] Code is more readable
- [ ] Complexity reduced
- [ ] Document new patterns (if needed)

---

## Common Anti-Patterns to Avoid

### 1. God Class

**Problem**: One class does too many things.

**Solution**: Split into focused classes with single responsibilities.

### 2. Shotgun Surgery

**Problem**: One change requires modifying many files.

**Example**: Changing virtual task ID format touches 15+ files.

**Solution**: Encapsulate in value object (TaskIdentifier).

### 3. Feature Envy

**Problem**: Method in class A uses data from class B more than its own.

**Solution**: Move method to class B or extract to separate service.

### 4. Primitive Obsession

**Problem**: Using primitive types (str, int) instead of domain objects.

**Example**: Passing `task_id: str` everywhere and parsing repeatedly.

**Solution**: Use value objects (TaskIdentifier).

### 5. Long Parameter List

**Problem**: Function takes many parameters (>4).

**Solution**: Group related parameters into object.

---

## Testing Strategy for Patterns

### Value Objects

```python
def test_task_identifier_virtual():
    id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
    assert id.is_virtual == True
    assert id.template_id == "507f1f77bcf86cd799439011"
    assert id.occurrence_date == date(2025, 12, 10)

def test_task_identifier_real():
    id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
    assert id.is_real == True
    assert id.template_id is None
```

### State Machine

```python
def test_state_machine_valid_transition():
    assert TaskStateMachine.can_transition(
        TaskStatus.PENDING,
        TaskStatus.COMPLETED
    ) == True

def test_state_machine_invalid_transition():
    with pytest.raises(ValueError):
        TaskStateMachine.validate_transition(
            TaskStatus.COMPLETED,
            TaskStatus.PENDING
        )
```

### Strategy Pattern

```python
def test_real_task_strategy():
    strategy = RealTaskStrategy(db, collections)
    task = await strategy.get_task(identifier, parent_id)
    assert task is not None
    assert task.id == identifier.raw_id

def test_virtual_task_strategy():
    strategy = VirtualTaskStrategy(db, collections)
    task = await strategy.get_task(identifier, parent_id)
    assert task.is_virtual == True
```

### Event Bus

```python
def test_event_handler_called():
    handler_called = False

    async def test_handler(event):
        nonlocal handler_called
        handler_called = True

    event_bus.subscribe(TaskCompleted, test_handler)
    await event_bus.publish(TaskCompleted(...))

    assert handler_called == True
```

---

## Integration with Existing Code

### Parallel Implementation

When refactoring, implement new pattern alongside old code:

```python
# Step 1: Add new abstraction
class TaskIdentifier:
    # implementation

# Step 2: Use in one place
async def new_get_task_by_id(task_id, parent_id):
    identifier = TaskIdentifier(raw_id=task_id)
    # new logic

# Step 3: Gradually migrate call sites
# Old code still works, new code calls new_get_task_by_id

# Step 4: Once all migrated, remove old code
```

### Feature Flags (Optional)

For risky changes, use feature flags:

```python
if feature_flags.is_enabled("use_task_identifier"):
    identifier = TaskIdentifier(raw_id=task_id)
    # new logic
else:
    # old logic
```

---

## Documentation Requirements

When implementing patterns:

### 1. Class/Module Docstring

```python
"""Task identity handling for real and virtual tasks.

This module provides the TaskIdentifier value object which encapsulates
logic for parsing and working with task IDs.

Virtual tasks have format: {template_id}_{date}
Real tasks are standard ObjectId strings.

Example:
    identifier = TaskIdentifier(raw_id="507f1f77_2025-12-10")
    if identifier.is_virtual:
        print(f"Template: {identifier.template_id}")
"""
```

### 2. Pattern Documentation

Add to `docs/architecture/` when introducing new pattern:
- What problem it solves
- When to use it
- Code examples (before/after)
- Integration points

### 3. Architecture Decision Records (ADRs)

For major architectural decisions, create ADR:

**File**: `docs/architecture/adr-001-task-identifier-pattern.md`

```markdown
# ADR 001: Use Value Object Pattern for Task Identifiers

## Status
Accepted

## Context
Virtual task IDs scattered throughout codebase...

## Decision
Implement TaskIdentifier value object...

## Consequences
- Positive: Centralized logic...
- Negative: One more class to learn...
```

---

## Quick Reference

### When to Use Each Pattern

| Pattern | Use When | Don't Use When |
|---------|----------|----------------|
| Value Object | Encapsulating related data without identity | Data has lifecycle/identity |
| State Machine | Object has well-defined states | States are simple (2-3 only) |
| Strategy | Different behaviors for same operation | Only one behavior exists |
| Observer | Action triggers multiple side effects | Side effects are fixed and few |
| Specification | Complex query building | Simple, one-off queries |

### Pattern Implementation Checklist

**Value Object**:
- [ ] Define class with properties (no setters)
- [ ] Implement validation in constructor
- [ ] Add `__str__` and `__repr__`
- [ ] Make immutable (frozen dataclass or Pydantic)

**State Machine**:
- [ ] Define states as enum
- [ ] Define transition rules
- [ ] Implement `can_transition()`, `validate_transition()`
- [ ] Add tests for valid/invalid transitions

**Strategy**:
- [ ] Define abstract base class
- [ ] Implement concrete strategies
- [ ] Create factory
- [ ] Write tests for each strategy

**Observer**:
- [ ] Define event classes
- [ ] Implement event bus
- [ ] Create handlers
- [ ] Register handlers
- [ ] Test handlers independently

**Specification**:
- [ ] Define base with `to_query()`
- [ ] Implement concrete specs
- [ ] Support & and | operators
- [ ] Write composition tests

---

## References

- **Task System Refactoring Plan**: `docs/architecture/task-system-refactoring-plan.md`
- **Development Principles**: `.claude/skills/development-principles.md`
- **Project Structure**: `.claude/skills/project-structure.md`

---

## Remember

> "Good architecture maximizes the number of decisions not made." - Robert C. Martin

> "Make it work, make it right, make it fast - in that order." - Kent Beck

> "The best design is the simplest one that works." - KISS Principle

