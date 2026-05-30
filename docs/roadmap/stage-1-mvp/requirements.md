# Stage 1: MVP Requirements

## Goal
Build core functionality that proves the concept and delivers immediate value.

**Timeline**: 8-10 weeks
**Target**: Working app that parents and kids can use daily

## Success Criteria
- [ ] Parent can create and assign tasks
- [ ] Child can view, start, and complete tasks
- [ ] Points are earned automatically
- [ ] Writing can be submitted and evaluated
- [ ] Basic chat helper works
- [ ] Works on mobile and desktop
- [ ] Deployed and accessible online

---

## Features Included

### 1. Authentication & User Management

**Users**
- Parent account (can create child accounts)
- Child account (linked to parent)
- Login/logout
- Password reset

**User Profile**
- Name, email, role (parent/child)
- Child: grade level, preferences
- Parent: timezone, notification settings

**Out of scope:**
- OAuth (Google, Apple login)
- Multi-child per parent (1 parent = 1 child for MVP)
- Profile pictures

---

### 2. Task Management (Basic)

**Task CRUD**
- Create task (parent only)
- View tasks (both)
- Edit task (parent only)
- Delete task (parent only)
- Complete task (child only)

**Task Properties**
- Title, description
- Category (writing, math, reading, other)
- Estimated duration
- Priority (low, medium, high)
- Status (pending, in_progress, completed)

**Task Actions**
- Start task (records start time)
- Finish task (records end time, calculates actual duration)
- Mark as completed

**Out of scope:**
- Recurring tasks (daily, weekly)
- Task dependencies
- Task cancellation workflow
- Flexible/occasional tasks
- Task templates

---

### 3. Schedule (Manual Only)

**Time Blocks**
- Parent can define unavailable times
- Fixed schedule (same every day)
- Visual timeline view

**Manual Scheduling**
- Parent can assign tasks to time slots
- Drag-and-drop interface
- Child sees daily schedule

**Out of scope:**
- AI-generated schedules
- Dynamic replanning
- Per-weekday schedules
- Different schedules for different days

---

### 4. Points System (Earn Only)

**Earning Points**
- Complete task on time: 100 points
- Complete task late: 70 points
- Bonus for early completion: +20 points

**Points Display**
- Total points (lifetime)
- Points this week
- Points today

**Out of scope:**
- Point deductions/penalties
- Spending points (rewards marketplace)
- Point advisor AI
- Configurable point rules
- Bonuses for quality

---

### 5. Writing Tool (Basic)

**Text Editor**
- Rich text input
- Word count
- Save draft
- Submit for evaluation

**AI Evaluation**
- Grammar and spelling check
- Basic feedback (2-3 strengths, 2-3 improvements)
- Simple score (0-100)
- Age-appropriate language

**Out of scope:**
- Handwriting OCR
- Advanced writing type detection
- Comparison to previous writings
- Detailed analytics
- Style-specific evaluation

---

### 6. AI Chat Helper (Basic)

**General Helper**
- Answer questions in kid-friendly language
- Define words
- Explain concepts
- Encourage and motivate

**Features**
- Text-based chat
- Message history (last 20 messages)
- Clear conversation button

**Out of scope:**
- Task-specific helper mode
- Context switching
- Tool calling (database queries)
- Voice input
- Streaming responses
- Conversation insights

---

### 7. UI/UX (Responsive)

**Layout**
- Desktop: Three-panel (schedule | work area | chat)
- Mobile: Single panel with bottom nav
- Responsive design (all breakpoints)

**Pages**
- Login/Register
- Dashboard (child view)
- Task list
- Task detail
- Writing tool
- Chat
- Parent dashboard (basic)
- Settings

**Components**
- Button, Input, Card, Modal
- Task card
- Timer display
- Points badge
- Chat message

**Out of scope:**
- Advanced animations
- Dark mode
- Customizable themes
- Accessibility features (beyond basics)

---

### 8. Parent Dashboard (Basic)

**View**
- Child's tasks (list)
- Points summary
- Recent completions
- Create task form

**Out of scope:**
- Analytics/charts
- Progress reports
- AI insights
- Approval workflows
- Advanced filtering

---

## Technical Specifications

### Frontend
```
Tech: React + TypeScript + Vite
State: Redux (UI, auth) + TanStack Query (API)
Styling: Tailwind CSS
Icons: @tabler/icons-react
Testing: Jest (unit tests for critical components)
```

### Backend
```
Tech: FastAPI + Python 3.11+
Database: MongoDB + Motor (async)
AI: Google Gemini 1.5 Flash (direct API calls)
Testing: pytest (basic API tests)
```

### Deployment
```
Frontend: Vercel or Netlify
Backend: Railway or Render
Database: MongoDB Atlas (free tier)
Environment: .env files, no secrets in code
```

### API Endpoints (MVP)
```
Auth:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

Tasks:
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/{id}
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}
POST   /api/tasks/{id}/start
POST   /api/tasks/{id}/complete

Points:
GET    /api/points/balance
GET    /api/points/transactions

Writing:
POST   /api/tools/writing/submit
GET    /api/tools/writing/{id}

Chat:
POST   /api/chat/messages
GET    /api/chat/messages

Schedule:
GET    /api/schedule/{date}
PATCH  /api/schedule/{date}/blocks
```

### Data Models (MVP)
```python
User:
  - id, email, password_hash, role, name
  - child: grade_level
  - created_at, updated_at

Task:
  - id, user_id, title, description, category
  - estimated_duration, priority, status
  - started_at, completed_at, actual_duration
  - created_at, updated_at

PointsTransaction:
  - id, user_id, task_id, amount, reason
  - transaction_type, created_at

ToolSession:
  - id, user_id, task_id, tool_type
  - content (text), evaluation, score
  - status, submitted_at, evaluated_at

Message:
  - id, user_id, role, content
  - created_at

Schedule:
  - id, user_id, date
  - time_blocks (unavailable periods)
  - manual_assignments (task_id -> time_slot)
```

---

## Development Phases

### Week 1-2: Foundation
- [ ] Project setup (frontend + backend scaffolding)
- [ ] Database connection
- [ ] Auth system (register, login, JWT)
- [ ] Basic user model
- [ ] Deployment pipeline (CI/CD)

### Week 3-4: Task Management
- [ ] Task CRUD API
- [ ] Task list UI
- [ ] Create task form (parent)
- [ ] Task detail page
- [ ] Start/complete task flow
- [ ] Timer component

### Week 5-6: Points & Schedule
- [ ] Points calculation logic
- [ ] Points display UI
- [ ] Transaction history
- [ ] Manual schedule UI
- [ ] Time block editor
- [ ] Daily schedule view

### Week 7: Writing Tool
- [ ] Text editor component
- [ ] Gemini integration (basic)
- [ ] Writing submission API
- [ ] Evaluation result display
- [ ] Save draft functionality

### Week 8: Chat & Polish
- [ ] Chat UI component
- [ ] Chat API with Gemini
- [ ] Message history
- [ ] Mobile responsive fixes
- [ ] Bug fixes
- [ ] Basic error handling

### Week 9-10: Testing & Deployment
- [ ] Unit tests (critical paths)
- [ ] Manual testing (all flows)
- [ ] Bug fixes
- [ ] Performance check
- [ ] Production deployment
- [ ] User acceptance testing

---

## What We're Deliberately Skipping

**For Stage 2+:**
- AI planning/replanning
- Handwriting OCR
- Math tool
- Advanced analytics
- Rewards marketplace
- Multi-language support
- Offline mode
- Advanced accessibility

**Reasoning:**
- Focus on core value proposition
- Get feedback early
- Validate concept before building complex features
- Faster time to first real users

---

## MVP Success Metrics

**User Engagement**
- Daily active users (target: 5-10 beta families)
- Tasks completed per day (target: 3+)
- Tool usage (target: 1+ writing submission per week)

**Technical**
- Page load time < 2s
- API response time < 500ms
- Uptime > 99%
- Zero critical bugs after week 10

**Qualitative**
- Parents find it useful (survey)
- Kids actually use it (not forced)
- Positive feedback on writing evaluation
- Requests for specific features (validates roadmap)

---

## Dependencies & Risks

**External Dependencies**
- Gemini API availability and stability
- MongoDB Atlas free tier limits (512MB)
- Deployment platform reliability

**Technical Risks**
- Gemini API response quality inconsistent
- Mobile performance issues
- Auth security vulnerabilities

**Mitigation**
- Fallback prompts if Gemini quality poor
- Mobile testing from day 1
- Use proven auth libraries (no custom crypto)

---

## Go/No-Go Criteria

**After Week 10, evaluate:**
- [ ] All success criteria met
- [ ] No critical bugs
- [ ] Positive user feedback from beta testers
- [ ] Technical debt manageable
- [ ] Team ready for Stage 2

**If YES → Proceed to Stage 2**
**If NO → Extend MVP, fix issues, re-evaluate**
