# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Schedule   │  │  Work Area   │  │   AI Chat    │      │
│  │   Timeline   │  │  Tool Editor │  │   Helper     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                    TanStack Query                            │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  FastAPI      │
                    │  REST API     │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ MongoDB │         │ Gemini  │        │  Cache  │
   │  Motor  │         │   API   │        │  Redis  │
   └─────────┘         └─────────┘        └─────────┘
                      (1.5 Flash)
                Text + Image + Audio
```

## Frontend Architecture

### State Management
```
Redux (Client State)                TanStack Query (Server State)
├── UI State                       ├── Tasks
│   ├── sidebarOpen               ├── Schedule
│   ├── activeView                ├── Chat Messages
│   └── notifications             ├── Points
├── Auth                          ├── Tool Sessions
│   ├── token                     └── AI Evaluations
│   └── isAuthenticated
└── User Preferences
    ├── theme
    └── language
```

### Component Structure
```
src/
├── pages/
│   ├── dashboard/
│   │   ├── index.tsx                    # Main dashboard
│   │   ├── components/
│   │   │   ├── ScheduleTimeline.tsx
│   │   │   ├── CurrentTaskCard.tsx
│   │   │   └── QuickActions.tsx
│   │   └── hooks/
│   │       ├── useSchedule.ts
│   │       └── useDailyPlan.ts
│   ├── task-detail/
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── TaskHeader.tsx
│   │   │   ├── TaskTimer.tsx
│   │   │   └── TaskActions.tsx
│   │   └── hooks/
│   │       └── useTaskActions.ts
│   └── tools/
│       ├── writing/
│       │   ├── index.tsx
│       │   ├── components/
│       │   │   ├── TextEditor.tsx
│       │   │   ├── HandwritingUpload.tsx
│       │   │   └── EvaluationResults.tsx
│       │   └── hooks/
│       │       └── useWritingEvaluation.ts
│       └── math/
│           ├── index.tsx
│           └── components/
│               ├── ProblemDisplay.tsx
│               └── AnswerInput.tsx
├── components/
│   ├── layout/
│   │   ├── LeftPanel.tsx
│   │   ├── CenterPanel.tsx
│   │   └── RightPanel.tsx
│   ├── chat/
│   │   ├── ChatBox.tsx
│   │   ├── MessageList.tsx
│   │   └── HelperToggle.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── PointsBadge.tsx
├── api/
│   ├── client.ts                        # Axios config
│   ├── queries/
│   │   ├── useTasks.ts
│   │   ├── useSchedule.ts
│   │   ├── useChat.ts
│   │   └── usePoints.ts
│   └── mutations/
│       ├── useCreateTask.ts
│       ├── useUpdateSchedule.ts
│       └── useSubmitWork.ts
└── store/
    ├── index.ts
    └── slices/
        ├── uiSlice.ts
        ├── authSlice.ts
        └── preferencesSlice.ts
```

## Backend Architecture

### API Structure
```
backend/
├── main.py                              # FastAPI app
├── config.py                            # Gemini API config
├── routes/
│   ├── tasks.py                         # Task CRUD
│   ├── schedule.py                      # Schedule management
│   ├── tools.py                         # Writing/Math tools
│   ├── chat.py                          # AI chat endpoints
│   ├── points.py                        # Points system
│   ├── rewards.py                       # Rewards marketplace
│   └── auth.py                          # Authentication
├── services/
│   ├── task_service.py
│   ├── schedule_service.py
│   ├── planning_service.py              # Simple AI planning
│   ├── evaluation_service.py            # Tool evaluation
│   ├── points_service.py
│   └── rewards_service.py
├── ai/
│   ├── client.py                        # Gemini client setup
│   ├── prompts/                         # Prompt templates
│   │   ├── writing_eval.py
│   │   ├── math_eval.py
│   │   ├── planning.py
│   │   ├── chat_helper.py
│   │   └── insights.py
│   ├── evaluators/                      # Direct API calls
│   │   ├── writing.py                   # OCR + evaluation
│   │   ├── math.py
│   │   └── points_advisor.py
│   ├── planning.py                      # Schedule generation
│   └── insights/                        # Optional: LangChain agents
│       ├── chat_agent.py                # If needed for tool calling
│       └── analytics_agent.py           # If queries get complex
├── models/
│   ├── user.py
│   ├── task.py
│   ├── schedule.py
│   ├── message.py
│   ├── tool_session.py
│   ├── points_transaction.py
│   ├── reward.py
│   └── redemption.py
└── dependencies/
    ├── auth.py
    └── database.py
```

### AI Architecture (Simplified)

**Phase 1: Direct Gemini API Calls** (Start Here)
```python
# ai/client.py
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini = genai.GenerativeModel('gemini-1.5-flash')

# ai/evaluators/writing.py
async def evaluate_writing(
    text: str = None,
    image: bytes = None,
    context: dict = None
) -> EvaluationResult:
    """Direct API call - no framework needed"""
    prompt = WRITING_EVAL_PROMPT.format(**context)

    content = [prompt]
    if image:
        content.append({"mime_type": "image/jpeg", "data": image})
    if text:
        content.append(text)

    response = await gemini.generate_content_async(content)
    return parse_evaluation(response.text)
```

**Phase 2: Add LangChain for Tool Calling** (Only If Needed)
```python
# ai/insights/analytics_agent.py
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent

# Only add when insights queries need multiple tools
```

**Phase 3: Add LangGraph** (Only If Proven Necessary)
```python
# Only if planning needs complex state management
# Most likely won't need this
```

## Data Models

### Task Model
```python
class Task(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    category: TaskCategory  # WRITING, MATH, READING, etc.
    type: TaskType  # DAILY, WEEKLY, OCCASIONAL, ONE_TIME, FLEXIBLE

    # Scheduling
    estimated_duration: int  # minutes
    priority: Priority  # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[datetime]
    scheduled_time: Optional[datetime]

    # Recurrence (for DAILY/WEEKLY)
    recurrence_rule: Optional[RecurrenceRule]

    # Status
    status: TaskStatus  # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    actual_duration: Optional[int]

    # Tool integration
    required_tool: Optional[ToolType]
    tool_session_id: Optional[str]

    # Metadata
    assigned_by: str  # PARENT or SELF
    parent_approval_required: bool
    dependencies: List[str]  # task IDs that must be completed first

    created_at: datetime
    updated_at: datetime
```

### Schedule Model
```python
class Schedule(BaseModel):
    id: str
    user_id: str
    date: date

    # Unavailable periods
    constraints: List[TimeBlock]  # school, sleep, meals

    # Planned tasks
    planned_tasks: List[PlannedTask]

    # AI recommendations
    ai_suggestions: Optional[List[ScheduleSuggestion]]

    # Status
    needs_replanning: bool
    last_replanned_at: Optional[datetime]

    created_at: datetime
    updated_at: datetime

class TimeBlock(BaseModel):
    start_time: time
    end_time: time
    label: str  # "School", "Sleep", "Lunch", etc.
    is_flexible: bool  # Can be adjusted if needed

class PlannedTask(BaseModel):
    task_id: str
    scheduled_start: datetime
    scheduled_end: datetime
    buffer_time: int  # extra minutes allocated
    confidence: float  # AI confidence in this plan
```

### Chat Message Model
```python
class Message(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str]  # If task-specific helper

    role: MessageRole  # USER, AI, SYSTEM
    content: str
    message_type: MessageType  # TEXT, TOOL_SUBMISSION, NOTIFICATION

    # Context
    helper_mode: HelperMode  # TASK_SPECIFIC, GENERAL

    # Metadata
    ai_model: Optional[str]
    tokens_used: Optional[int]

    created_at: datetime
```

### Points Transaction Model
```python
class PointsTransaction(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str]
    redemption_id: Optional[str]  # If spending points on reward

    amount: int  # Positive (earn) or negative (spend/deduct)
    balance_after: int  # Running balance
    reason: str
    transaction_type: TransactionType  # TASK_COMPLETE, BONUS, DEDUCTION, REDEMPTION

    # AI involvement
    ai_recommended: bool
    ai_reasoning: Optional[str]
    parent_override: Optional[bool]

    created_at: datetime
```

### Reward Model
```python
class Reward(BaseModel):
    id: str
    parent_id: str  # Who created this reward

    # Basic info
    title: str
    description: Optional[str]
    category: RewardCategory  # PHYSICAL, PRIVILEGE, EXPERIENCE, TREAT
    point_cost: int

    # Visual
    image_url: Optional[str]
    icon: Optional[str]  # Icon name from icon library

    # Availability
    quantity: Optional[int]  # None = unlimited
    available: bool  # Can be disabled temporarily
    expiration_date: Optional[datetime]

    # Tracking
    times_redeemed: int

    created_at: datetime
    updated_at: datetime

class RewardCategory(str, Enum):
    PHYSICAL = "physical"      # Toys, items
    PRIVILEGE = "privilege"    # Screen time, stay up late
    EXPERIENCE = "experience"  # Outings, activities
    TREAT = "treat"           # Food, special meals
```

### Redemption Model
```python
class Redemption(BaseModel):
    id: str
    child_id: str
    reward_id: str

    # Transaction
    points_spent: int
    redeemed_at: datetime

    # Fulfillment
    status: RedemptionStatus  # PENDING, FULFILLED, CANCELLED
    fulfilled_by: Optional[str]  # Parent ID
    fulfilled_at: Optional[datetime]
    parent_notes: Optional[str]

    # Refund tracking
    refunded: bool
    refund_reason: Optional[str]

    created_at: datetime
    updated_at: datetime

class RedemptionStatus(str, Enum):
    PENDING = "pending"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
```

### Tool Session Model
```python
class ToolSession(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str]

    tool_type: ToolType  # WRITING, MATH

    # Content
    content: dict  # Tool-specific content
    # Writing: {text: str, handwriting_image_url?: str}
    # Math: {problems: List[Problem], answers: List[Answer]}

    # Evaluation
    evaluation: Optional[AIEvaluation]
    score: Optional[float]

    # Status
    status: SessionStatus  # DRAFT, SUBMITTED, EVALUATED

    submitted_at: Optional[datetime]
    evaluated_at: Optional[datetime]
    created_at: datetime
```

## AI Workflows (Gemini-Based)

### 1. Writing Evaluation (Direct API)
```python
async def evaluate_writing(
    text: str = None,
    image: bytes = None,
    grade_level: int = 5,
    writing_type: str = None,
    prompt: str = None
) -> EvaluationResult:
    """
    Single Gemini API call handles:
    - OCR (if image provided)
    - Content analysis
    - Grammar/spelling check
    - Contextual evaluation
    - Feedback generation
    """

    context = {
        "grade_level": grade_level,
        "writing_type": writing_type or "general",
        "prompt": prompt or "No specific prompt"
    }

    system_prompt = f"""
    You are an educational writing evaluator for grade {grade_level} students.

    Writing type: {writing_type}
    Original prompt: {prompt}

    Evaluate this writing with flexible, context-aware criteria:
    1. If handwriting image: First extract the text
    2. Analyze based on writing type (essay/story/diary/etc)
    3. Identify strengths and areas for improvement
    4. Provide age-appropriate, encouraging feedback

    Return JSON format:
    {{
        "extracted_text": "..." (if image),
        "score": 0-100,
        "writing_type_detected": "...",
        "strengths": ["...", "..."],
        "improvements": ["...", "..."],
        "grammar_issues": [{{"issue": "...", "suggestion": "..."}}],
        "overall_feedback": "..."
    }}
    """

    content = [system_prompt]
    if image:
        content.append({
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image).decode()
        })
    if text:
        content.append(f"Text: {text}")

    response = await gemini.generate_content_async(content)
    return parse_json_response(response.text)
```

### 2. Math Evaluation (Direct API)
```python
async def evaluate_math(
    problem: str,
    student_answer: str,
    grade_level: int
) -> MathEvaluation:
    """Single API call for math evaluation"""

    prompt = f"""
    Grade {grade_level} math evaluation.

    Problem: {problem}
    Student answer: {student_answer}

    Check if correct and provide feedback.
    If incorrect, give hints without full solution.

    Return JSON:
    {{
        "correct": true/false,
        "feedback": "...",
        "hints": ["..."] (if incorrect),
        "explanation": "..."
    }}
    """

    response = await gemini.generate_content_async(prompt)
    return parse_json_response(response.text)
```

### 3. Planning (Direct API with Good Prompt)
```python
async def generate_daily_plan(
    tasks: List[Task],
    constraints: List[TimeBlock],
    user_context: UserContext
) -> Schedule:
    """
    Single Gemini call for schedule generation.
    No LangGraph needed for most cases.
    """

    available_time = calculate_available_time(constraints)
    task_summary = format_tasks_for_prompt(tasks)

    prompt = f"""
    You are a scheduling assistant for a grade {user_context.grade} student.

    Available time today: {available_time}
    Unavailable blocks: {constraints}

    Tasks to schedule:
    {task_summary}

    Student patterns:
    - Best time for difficult tasks: {user_context.best_focus_time}
    - Needs breaks every: {user_context.break_frequency} minutes

    Create optimal schedule considering:
    1. Task priority and deadlines
    2. Estimated durations (add 10% buffer)
    3. Energy levels (hard tasks when fresh)
    4. Break requirements

    Return JSON:
    {{
        "scheduled_tasks": [
            {{
                "task_id": "...",
                "start_time": "HH:MM",
                "end_time": "HH:MM",
                "buffer_minutes": 5,
                "reasoning": "why scheduled here"
            }}
        ],
        "suggestions": ["...", "..."],
        "warnings": ["..."] (if issues)
    }}
    """

    response = await gemini.generate_content_async(prompt)
    return parse_schedule(response.text)
```

### 4. Replanning (Direct API)
```python
async def replan_schedule(
    current_schedule: Schedule,
    active_task: Task,
    time_overrun: int
) -> UpdatedSchedule:
    """Dynamic replanning when tasks take longer"""

    prompt = f"""
    A task is taking longer than planned.

    Active task: {active_task.title}
    - Planned end: {active_task.scheduled_end}
    - Likely actual end: {calculate_likely_end(active_task, time_overrun)}

    Remaining tasks: {format_remaining_tasks(current_schedule)}
    Available time left: {calculate_remaining_time(current_schedule)}

    Adjust the schedule:
    - Keep important tasks
    - Reschedule less urgent tasks to tomorrow
    - Add breaks if schedule is too tight

    Return JSON with updated schedule and explanation.
    """

    response = await gemini.generate_content_async(prompt)
    return parse_updated_schedule(response.text)
```

### 5. Chat Helper (Direct API or Simple LangChain)
```python
async def chat_helper(
    message: str,
    context: ChatContext
) -> str:
    """
    Simple chat - direct API call.
    Add LangChain only if need multiple tools.
    """

    if context.task_id:
        # Task-specific helper
        task_info = await get_task(context.task_id)
        system_prompt = f"""
        You are helping a grade {context.grade} student with: {task_info.title}
        Task description: {task_info.description}

        Provide helpful guidance without giving full answers.
        """
    else:
        # General helper
        system_prompt = f"""
        You are a helpful assistant for a grade {context.grade} student.
        Answer questions in age-appropriate language.
        """

    response = await gemini.generate_content_async([
        system_prompt,
        f"User: {message}"
    ])

    return response.text
```

### 6. Insights & Analytics (Optional LangChain)
```python
# Only add if insights queries get complex and need multiple DB queries

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.tools import tool

@tool
async def get_writing_history(user_id: str, limit: int = 10):
    """Fetch user's writing submissions"""
    return await db.tool_sessions.find({
        "user_id": user_id,
        "tool_type": "writing"
    }).limit(limit).to_list()

@tool
async def generate_chart_data(chart_type: str, data: list):
    """Prepare data for frontend chart"""
    return {"type": chart_type, "data": data}

# Use only if queries like "compare my last 3 writings" need multiple steps
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
agent = create_tool_calling_agent(llm, [get_writing_history, generate_chart_data], prompt)
executor = AgentExecutor(agent=agent, tools=tools)
```

## When to Add Complexity

**Start with:** Direct Gemini API calls (Phase 1)
- Fastest to build
- Easiest to debug
- Sufficient for 90% of use cases

**Add LangChain if:** (Phase 2)
- Insights queries consistently need 3+ database queries
- Chat helper needs multiple external tools
- Function calling becomes essential

**Add LangGraph only if:** (Unlikely Phase 3)
- Planning requires iterative refinement with backtracking
- Multi-agent collaboration becomes necessary
- State management across 5+ steps is critical

## API Endpoints

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/{id}` - Get task details
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/{id}/start` - Start task
- `POST /api/tasks/{id}/complete` - Complete task
- `POST /api/tasks/{id}/cancel` - Request cancellation

### Schedule
- `GET /api/schedule/{date}` - Get schedule for date
- `POST /api/schedule/plan` - Generate AI plan for date
- `POST /api/schedule/replan` - Trigger replanning
- `PATCH /api/schedule/{date}/constraints` - Update time constraints

### Tools
- `POST /api/tools/writing/submit` - Submit writing for evaluation
- `POST /api/tools/writing/ocr` - OCR handwriting image
- `POST /api/tools/math/evaluate` - Evaluate math answers

### Chat
- `GET /api/chat/messages` - Get message history
- `POST /api/chat/messages` - Send message to AI
- `PATCH /api/chat/helper-mode` - Switch helper mode

### Points
- `GET /api/points/balance` - Get current points balance
- `GET /api/points/transactions` - Get transaction history
- `GET /api/points/stats` - Get points statistics

### Rewards
- `GET /api/rewards` - List available rewards (child view)
- `GET /api/rewards/{id}` - Get reward details
- `POST /api/rewards` - Create reward (parent only)
- `PATCH /api/rewards/{id}` - Update reward (parent only)
- `DELETE /api/rewards/{id}` - Delete reward (parent only)

### Redemptions
- `GET /api/redemptions` - Get redemption history
- `POST /api/redemptions` - Redeem reward (child)
- `PATCH /api/redemptions/{id}/fulfill` - Mark as fulfilled (parent)
- `POST /api/redemptions/{id}/cancel` - Cancel and refund (parent)
- `GET /api/redemptions/pending` - Get pending fulfillments (parent)

## Database Schema

### Collections
- `users` - User profiles
- `tasks` - All tasks
- `schedules` - Daily schedules
- `messages` - Chat messages
- `tool_sessions` - Tool usage sessions
- `points_transactions` - Points history
- `rewards` - Available rewards
- `redemptions` - Reward purchase records
- `ai_evaluations` - Cached AI evaluations

### Indexes
```python
# tasks
- user_id, status
- user_id, scheduled_time
- user_id, deadline

# schedules
- user_id, date (unique)

# messages
- user_id, created_at
- user_id, task_id

# points_transactions
- user_id, created_at
- user_id, transaction_type

# rewards
- parent_id, available
- category

# redemptions
- child_id, created_at
- status
- reward_id
```

## Caching Strategy

### Redis Cache
- Active schedules (1 day TTL)
- User preferences (1 hour TTL)
- AI responses for common questions (7 days TTL)
- Points balance (invalidate on transaction)

## Real-time Features

### WebSocket Events
- Task status changes
- Schedule updates
- AI messages
- Points earned notifications
- Parent approval requests
