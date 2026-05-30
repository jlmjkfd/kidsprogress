---
name: development-principles
description: Foundational principles for all KidsProgress code: SOLID, long-term maintainability, scalability, decision framework before writing code. Apply when implementing, designing, refactoring any feature or component.
---

# Development Principles (CRITICAL)

## Core Philosophy

**Always think about long-term maintainability and scalability, not just "what works now."**

Every decision should consider:
1. Will this scale as the project grows?
2. Will this be easy to maintain in 6 months?
3. Will other developers (or future you) understand this?
4. Is this the industry-standard best practice?

---

## Decision-Making Framework

### Before Writing Code, Ask:

#### 1. Scalability
- Will this work with 10x the data?
- Will this work with 10+ developers?
- Will this work with 100+ files?

```typescript
// 鉁?Works now, doesn't scale
import Button from '../../components/Button';

// 鉁?Scales to any project size
import Button from '@components/Button';
```

#### 2. Maintainability
- Can someone understand this in 6 months?
- Is this self-documenting?
- Does this follow conventions?

```typescript
// 鉁?Clever but unmaintainable
const x = data.reduce((a, b) => ({ ...a, [b.id]: b }), {});

// 鉁?Clear and maintainable
const userMap = data.reduce((map, user) => {
  map[user.id] = user;
  return map;
}, {} as Record<string, User>);
```

#### 3. Best Practices
- Is this the industry standard?
- Do major projects do it this way?
- Is there a proven better approach?

```typescript
// 鉁?Non-standard
const API_URL = './api/users';

// 鉁?Industry standard (path alias)
import { getUsers } from '@api/queries/useUsers';
```

---

## Anti-Pattern: "Quick and Dirty"

### 鉁?Bad Mindset
```typescript
// "I'll just hard-code this for now"
const apiUrl = "http://localhost:8000";

// "I'll organize this later"
// One giant 500-line component

// "This works, ship it"
// No error handling, no types
```

### 鉁?Good Mindset
```typescript
// "Let me do this right the first time"
const apiUrl = import.meta.env.VITE_API_BASE_URL;

// "Let me structure this properly"
// Separate components, clear responsibilities

// "Let me make this robust"
// Proper error handling, full type coverage
```

---

## Technical Debt Prevention

### When is "Quick and Dirty" Acceptable?
- **Never for foundational code** (auth, data layer, routing)
- **Never for shared code** (components, utils, types)
- **Only for prototypes** that will be thrown away

### Always Invest Upfront In:
1. **Project structure** - Folders, aliases, conventions
2. **Type safety** - Full TypeScript, no `any`
3. **Error handling** - Proper try/catch, user feedback
4. **Testing setup** - Even if tests come later
5. **Documentation** - README, code comments for complex logic
6. **Modern APIs** - Never use deprecated methods/functions

---

## Examples: Short-term vs Long-term Thinking

### Example 1: Imports

**Short-term thinking:**
```typescript
// "Single @ is easier to set up"
import { useLogin } from '@/api/mutations/useLogin';
```

**Long-term thinking:**
```typescript
// "Multiple aliases will help as we grow to 100+ files"
import { useLogin } from '@api/mutations/useLogin';
```

### Example 2: State Management

**Short-term thinking:**
```typescript
// "Let me just put everything in Redux"
const userSlice = createSlice({
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload; // API data in Redux
    }
  }
});
```

**Long-term thinking:**
```typescript
// "Server state should use TanStack Query, Redux for client state only"
// TanStack Query for API data
const { data: users } = useUsers();

// Redux only for UI state
const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen);
```

### Example 3: Component Structure

**Short-term thinking:**
```typescript
// "One big component is faster to write"
function Dashboard() {
  // 500 lines of mixed concerns
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... everything in one component
}
```

**Long-term thinking:**
```typescript
// "Separate by responsibility, easier to maintain"
function Dashboard() {
  return (
    <div>
      <UserList />
      <TaskBoard />
      <ActivityFeed />
    </div>
  );
}

// Each component has single responsibility
```

---

## Code Review Questions

Before committing, ask:

### Scalability Checklist
- [ ] Will this work with 10x more data?
- [ ] Will this work with 10x more files?
- [ ] Does this follow project conventions?

### Maintainability Checklist
- [ ] Can I understand this code in 6 months?
- [ ] Are names clear and descriptive?
- [ ] Is complex logic documented?
- [ ] Is this self-explanatory?

### Best Practice Checklist
- [ ] Is this the industry standard approach?
- [ ] Have I followed the project's skills guidelines?
- [ ] Would this pass code review at a top company?

---

## Architecture Patterns

### Apply Design Patterns (See architecture-patterns.md)
Before implementing features, consider:
- **Value Objects** for encapsulation (avoid primitive obsession)
- **State Machines** for lifecycle management (avoid scattered status checks)
- **Strategy Pattern** for type-specific behavior (avoid conditionals)
- **Observer Pattern** for decoupling (avoid tight coupling)
- **Specification Pattern** for queries (avoid complex query building)

**Reference**: See `.claude/skills/architecture-patterns.md` for details

### Current Refactoring Initiatives
- Task System Refactoring: See `docs/architecture/task-system-refactoring-plan.md`
- Implementation Progress: See `docs/architecture/implementation-progress.md`
- Process Docs: See `docs/architecture/phase-{1-5}-*-process.md`

---

## When to Refactor

### Refactor Immediately If:
- You're copy-pasting code 3+ times
- A function is 50+ lines
- You're using relative imports (`../../`)
- You have magic numbers/strings
- You're mixing concerns
- Logic scattered in 3+ places (extract to single source of truth)
- Complex conditional logic (consider state machine or strategy pattern)

### Examples

**鉁?Copy-paste (needs refactor NOW):**
```typescript
// In UserPage.tsx
const formattedDate = new Date(user.createdAt).toLocaleDateString();

// In TaskPage.tsx
const formattedDate = new Date(task.dueDate).toLocaleDateString();

// In CommentPage.tsx
const formattedDate = new Date(comment.postedAt).toLocaleDateString();
```

**鉁?Extract utility (maintainable):**
```typescript
// @utils/date.ts
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

// Usage
import { formatDate } from '@utils/date';
const formattedDate = formatDate(user.createdAt);
```

---

## Red Flags to Avoid

### 馃毄 "I'll fix this later"
- Later never comes
- Technical debt compounds
- Do it right now

### 馃毄 "This is good enough"
- If it's not best practice, it's not good enough
- "Good enough" becomes the new standard
- Raises the bar, don't lower it

### 馃毄 "No one will notice"
- Future you will notice
- Future teammates will notice
- It will be harder to fix later

### 馃毄 "It's just a small feature"
- Small features become core features
- Hard to refactor when it's critical
- Build for growth from day one

### 馃毄 "It's deprecated but still works"
- Deprecated methods will be removed in future versions
- Creates upgrade headaches later
- IDEs/linters will warn constantly
- Use modern replacements immediately

**Examples of deprecated methods to avoid:**
```python
# 鉁?Deprecated
datetime.utcnow()  # Use datetime.now(timezone.utc)
user.dict()  # Use user.model_dump() in Pydantic v2

# 鉁?Modern
from datetime import datetime, timezone
datetime.now(timezone.utc)
user.model_dump()
```

---

## Best Practice Sources

When in doubt, check:
1. **Official docs** - React, TypeScript, Vite, FastAPI
2. **Industry leaders** - Vercel, Airbnb, Google style guides
3. **Project skills** - `.claude/skills/` folder
4. **Large open source projects** - Next.js, Remix, tRPC

---

## Mindset Shift

### From: "Make it work"
```
Write code 鈫?Test if it works 鈫?Ship it
```

### To: "Make it right"
```
Think about architecture 鈫?Write maintainable code 鈫?
Consider edge cases 鈫?Add proper types 鈫?
Document if needed 鈫?Test if it works 鈫?Ship it
```

---

## Key Principles Summary

1. 鉁?**Think long-term** - Will this scale? Will this be maintainable?
2. 鉁?**Follow best practices** - Don't reinvent the wheel
3. 鉁?**Prevent technical debt** - Do it right the first time
4. 鉁?**Refactor early** - Don't let bad patterns spread
5. 鉁?**Question "quick fixes"** - They're rarely quick in the long run
6. 鉁?**Learn from mistakes** - Use them to improve processes

---

## When This Applies

**Always:**
- Foundational code (auth, routing, data layer)
- Shared code (components, utils, types)
- Core features (user management, permissions)

**Sometimes (with justification):**
- Prototypes that will be rewritten
- Spike/exploration code (clearly marked)

**Never:**
- Production code
- Code that others depend on
- Code you'll maintain long-term

---

## Remember

> "It takes a few minutes to do it right the first time, but hours or days to fix it later."

> "The best time to establish good patterns is at the beginning, not after 100 files exist."

> "Your future self (and teammates) will thank you for thinking long-term."
