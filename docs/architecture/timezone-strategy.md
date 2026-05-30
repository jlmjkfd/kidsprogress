# Timezone Handling Strategy - Industry Best Practices

## The Core Challenge

When a user travels from New York (UTC-5) to Tokyo (UTC+9), what happens to their 9:00 AM meeting scheduled for tomorrow?

### Two Philosophies:

1. **Floating Time** (follows user) - 9:00 AM stays 9:00 AM in Tokyo
2. **Fixed Time** (stays in original timezone) - 9:00 AM NY = 11:00 PM Tokyo

## Industry Solutions

### 1. **Google Calendar / Apple Calendar Approach**

**Strategy: Store timezone + datetime together**

```json
{
  "title": "Team Meeting",
  "start": "2026-01-11T09:00:00",
  "timezone": "America/New_York",
  "end": "2026-01-11T10:00:00",
  "endTimezone": "America/New_York"
}
```

**How it works:**
- When created in NYC: "9 AM EST" stored
- User travels to Tokyo: App shows "11 PM JST (9 AM EST)"
- Display both times: "9:00 AM in New York (11:00 PM your time)"

**Advantages:**
- Meetings stay synchronized across timezones
- Zoom/video calls work correctly
- Business hours are preserved

**Implementation:**
```javascript
// Storage
const event = {
  datetime: "2026-01-11T09:00:00",  // No Z!
  timezone: "America/New_York"
}

// Display
const displayInUserTz = moment.tz(event.datetime, event.timezone)
  .tz(userCurrentTz);
```

---

### 2. **Todoist / Asana Approach**

**Strategy: Differentiate "All-Day" vs "Timed" events**

**All-Day Tasks (Floating):**
```json
{
  "title": "Submit report",
  "date": "2026-01-11",  // No time!
  "allDay": true
}
```
- Always shows on Jan 11, regardless of timezone
- Use case: Deadlines, all-day reminders

**Timed Tasks (Fixed):**
```json
{
  "title": "Call client",
  "datetime": "2026-01-11T14:00:00Z",  // UTC
  "timezone": "America/New_York"
}
```
- Follows absolute time
- Use case: Appointments, meetings

**Advantages:**
- Intuitive for most users
- Simple mental model
- Works for solo users and teams

---

### 3. **Fantastical / Natural Language Approach**

**Strategy: Smart timezone inference**

User types: "Meeting tomorrow at 9am"
- If in NYC: Stores as 9 AM EST
- If in Tokyo: Stores as 9 AM JST

User types: "Call John 9am PST"
- Explicitly sets timezone
- Shows "9 AM PST (12 AM Tokyo time)"

**Key insight:** Let user choose implicitly through context

---

### 4. **Outlook / Microsoft Approach**

**Strategy: Per-event timezone + "Time Zone Support"**

```json
{
  "subject": "Project Review",
  "start": {
    "dateTime": "2026-01-11T14:00:00",
    "timeZone": "Pacific Standard Time"
  },
  "end": {
    "dateTime": "2026-01-11T15:00:00",
    "timeZone": "Pacific Standard Time"
  }
}
```

Plus user setting: "Show my calendar in: [Automatic / Specific Timezone]"

**Advantages:**
- Handles recurring events correctly
- Respects daylight saving time
- Shows multiple timezones side-by-side

---

## Common Scenarios & Solutions

### Scenario 1: Daily Recurring Task (e.g., "Take medicine at 8 AM")

**Problem:** Should it be 8 AM local time everywhere, or fixed 8 AM EST?

**Solutions:**

**Option A: Floating Time (Recommended for personal tasks)**
```json
{
  "title": "Take medicine",
  "time": "08:00",  // No timezone!
  "recurrence": "FREQ=DAILY",
  "isFloating": true  // ← Key flag
}
```
- 8 AM in NYC = 8 AM in Tokyo
- Best for: Exercise, medication, morning routine

**Option B: Fixed Time (Recommended for team tasks)**
```json
{
  "title": "Daily standup",
  "datetime": "2026-01-11T09:00:00",
  "timezone": "America/New_York",
  "recurrence": "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
}
```
- 9 AM EST always, shows as local equivalent
- Best for: Team meetings, calls with specific locations

---

### Scenario 2: Travel Day Transition

User in NYC (Jan 11, 8 PM) flies to Tokyo, arrives Jan 12, 10 AM Tokyo time.

**Tasks on Jan 12:**
- All-day tasks: Show on "Jan 12" in Tokyo
- Floating time tasks: Show at scheduled local time
- Fixed time tasks: Might appear on "wrong" day if crossing midnight

**Solution: Show both dates**
```
Tomorrow (Jan 12)
├─ Submit report (all day)
├─ Morning jog (8:00 AM)
└─ NYC office call (9:00 AM EST → 11:00 PM Jan 12 JST)

Day after tomorrow (Jan 13)
└─ (empty - the EST call is technically "tomorrow" in EST)
```

---

## Best Practices for Implementation

### 1. **Three-Layer Model**

```javascript
// Layer 1: Storage (UTC + Timezone)
const dbRecord = {
  scheduled_date: "2026-01-11T00:00:00Z",  // Always UTC
  timezone: "Pacific/Auckland",  // IANA timezone
  is_all_day: true
};

// Layer 2: Business Logic (Timezone-aware)
const moment = require('moment-timezone');
const localTime = moment.tz(dbRecord.scheduled_date, dbRecord.timezone);

// Layer 3: Display (User's current timezone)
const displayTime = localTime.clone().tz(userTimezone);
```

### 2. **Store Both Date Types**

```javascript
{
  // For all-day events (floating)
  "date": "2026-01-11",  // ISO date, no time

  // For timed events (fixed)
  "datetime": "2026-01-11T14:00:00Z",  // ISO 8601 with Z
  "timezone": "America/New_York"
}
```

### 3. **Use IANA Timezone Database**
- ✅ `"America/New_York"` (handles DST automatically)
- ❌ `"EST"` (doesn't handle DST)
- ❌ `"-05:00"` (offset changes with DST)

### 4. **Recurrence Rule Timezone**

```javascript
// Bad: Ambiguous
{
  "recurrence": "FREQ=DAILY;BYHOUR=8"
}

// Good: Explicit timezone
{
  "recurrence": "FREQ=DAILY",
  "recurrence_timezone": "Pacific/Auckland",
  "time": "08:00"  // 8 AM in NZ timezone
}
```

---

## Recommended Approach for KidsProgress

Given your app is for **children's tasks and parents**, I recommend:

### For Most Tasks: **Floating Time Approach**

```javascript
// Task model
{
  "title": "Homework",
  "scheduled_date": "2026-01-11",  // Date only
  "fixed_time_slot": {
    "start": "15:00",  // 3 PM local time
    "end": "16:00"
  },
  "is_floating": true,  // ← Always local time
  "created_timezone": "Pacific/Auckland"  // For reference
}
```

**Why?**
- Kids' routines are location-dependent (school starts at 8 AM local)
- Family activities happen in their current timezone
- Simple mental model for parents

### For Special Cases: **Fixed Time with Timezone**

```javascript
// Video call with grandparents
{
  "title": "Call Grandma",
  "scheduled_datetime": "2026-01-11T10:00:00",
  "timezone": "America/New_York",
  "is_floating": false,
  "display_hint": "10:00 AM EST"
}
```

### Implementation:

```typescript
// timezone.ts
export interface ScheduledTask {
  // Floating time (most tasks)
  scheduled_date?: string;  // "2026-01-11"
  time_slot?: { start: string; end: string };  // "15:00", "16:00"

  // Fixed time (special cases)
  scheduled_datetime?: string;  // "2026-01-11T10:00:00Z"
  timezone?: string;  // "America/New_York"
}

export function getDisplayDate(task: ScheduledTask, userTz: string): string {
  if (task.scheduled_date) {
    // Floating: always show the date as-is
    return task.scheduled_date;
  }

  if (task.scheduled_datetime && task.timezone) {
    // Fixed: convert to user's timezone
    return moment.tz(task.scheduled_datetime, task.timezone)
      .tz(userTz)
      .format('YYYY-MM-DD');
  }
}

export function getDisplayTime(task: ScheduledTask, userTz: string): string {
  if (task.time_slot) {
    // Floating: show time as-is
    return task.time_slot.start;
  }

  if (task.scheduled_datetime && task.timezone) {
    // Fixed: show in user's timezone with origin hint
    const localTime = moment.tz(task.scheduled_datetime, task.timezone)
      .tz(userTz)
      .format('h:mm A');
    const origTime = moment.tz(task.scheduled_datetime, task.timezone)
      .format('h:mm A z');
    return `${localTime} (${origTime})`;
  }
}
```

---

## Migration Path

### Current System → Recommended System

**Phase 1: Add timezone field**
```javascript
// Add to existing tasks
{
  scheduled_date: "2026-01-11T00:00:00Z",  // Keep as-is
  timezone: userTimezone,  // Add from X-Timezone header
  is_floating: true  // Default: floating
}
```

**Phase 2: Deprecate naive datetimes**
```javascript
// Old: "2026-01-11T00:00:00" (naive, ambiguous)
// New: "2026-01-11" (date) + timezone (explicit)
```

**Phase 3: Split date and time**
```javascript
{
  // All-day/floating tasks
  date: "2026-01-11",
  time: "15:00",  // Optional
  timezone: "Pacific/Auckland",

  // Fixed datetime tasks
  datetime: "2026-01-11T15:00:00",
  timezone: "Pacific/Auckland"
}
```

---

## Testing Strategy

### Test Cases:

1. **User in NZ creates task for tomorrow**
   - Expect: Shows on correct local date

2. **User travels NZ → USA**
   - Floating task: Updates to USA time
   - Fixed task: Shows NZ time equivalent

3. **Recurring task crossing DST boundary**
   - Mar 10 (before DST): 9 AM PST = UTC-8
   - Mar 11 (after DST): 9 AM PDT = UTC-7
   - Expect: Still shows at 9 AM local

4. **All-day task near midnight**
   - Task: "Jan 11" (all day)
   - User in UTC+14 timezone
   - Expect: Shows on Jan 11, not Jan 10

---

## Industry Examples

### Apps That Handle This Well:

1. **Fantastical** - Best timezone UX
   - Shows "floating" badge for all-day events
   - Displays origin timezone for remote events
   - Smart parsing: "tomorrow at 3pm London time"

2. **Google Calendar** - Most robust
   - Per-event timezone
   - Shows multiple timezones side-by-side
   - Handles DST transitions perfectly

3. **Todoist** - Simplest
   - All tasks are floating by default
   - Advanced: Can set specific timezone
   - Clear UI: "9:00 AM (always your local time)"

### Apps That Struggle:

1. **Many habit trackers** - Don't handle travel
2. **Simple todo apps** - Assume one timezone
3. **Old calendar apps** - Store only UTC offset

---

## Key Takeaways

1. **Store timezone, not just offset**
   - ✅ `"Pacific/Auckland"`
   - ❌ `"+13:00"`

2. **Differentiate all-day vs timed events**
   - All-day: Date only, always floating
   - Timed: Datetime + timezone

3. **Default to floating for personal tasks**
   - Kids' routines follow local time
   - Parent reminders are location-dependent

4. **Be explicit in UI**
   - Show "9 AM (your time)" vs "9 AM EST"
   - Visual indicators for timezone

5. **Test with travelers**
   - Cross midnight boundaries
   - Cross DST transitions
   - Cross international date line

