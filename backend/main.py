"""FastAPI application entry point."""
import sys
from pathlib import Path

# Add parent directory to Python path for imports to work both locally and on Render
# Local: /path/to/kidsprogress/backend/main.py -> add /path/to/kidsprogress
# Render: /opt/render/project/src/backend/main.py -> add /opt/render/project/src
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = backend_dir / ".env"
load_dotenv(env_path)

from backend.db.connection import db
from backend.routes import (
    auth,
    children,
    devices,
    task_metadata,
    task_collections,
    tasks,
)
from backend.routes import (
    # Obsolete - removed for unified task model
    # routine_routes,
    # activity_routes,
    # time_block_routes,
    schedule_routes,
    tool_routes,
    day_type_routes,
    ai_routes,
    ai_schedule_routes,
    school_calendar_routes,
    completion_routes,
    chat_routes,
    analysis_routes,
    template_library_routes,
    recurrence_routes,
    session_routes,
    attachment_routes,
    subtask_routes,
)
from backend.jobs import init_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("FastAPI starting up...")
    await db.connect_db()

    # Create indexes
    database = db.get_database()
    await database.users.create_index("email", unique=True)
    await database.children.create_index("parent_id")
    await database.children.create_index([("parent_id", 1), ("name", 1)])
    await database.device_registrations.create_index("device_token", unique=True)
    await database.device_registrations.create_index("parent_id")

    # Task management indexes
    await database.task_type_definitions.create_index("code", unique=True)
    await database.metric_type_definitions.create_index("code", unique=True)
    await database.task_collections.create_index("child_id")
    await database.task_collections.create_index([("child_id", 1), ("is_default", 1)])
    await database.tasks.create_index("collection_id")
    await database.tasks.create_index("child_id")
    await database.tasks.create_index([("child_id", 1), ("status", 1)])

    # Unified task model indexes
    await database.tasks.create_index([("task_source", 1), ("source_id", 1)])
    await database.tasks.create_index([("child_id", 1), ("scheduled_date", 1)])
    await database.tasks.create_index([("child_id", 1), ("obligation_level", 1)])
    await database.tasks.create_index([("child_id", 1), ("scheduling_type", 1)])
    await database.tasks.create_index([("child_id", 1), ("is_recurring", 1)])
    await database.tasks.create_index([("child_id", 1), ("is_in_pool", 1)])

    # Obsolete indexes - commented out (collections can be dropped later):
    # await database.routines.create_index([("child_id", 1), ("is_active", 1)])
    # await database.activities.create_index([("child_id", 1), ("is_active", 1)])
    # await database.activities.create_index([("child_id", 1), ("activity_type", 1)])
    # await database.activity_usage.create_index([("activity_id", 1), ("usage_date", 1)])
    # await database.time_blocks.create_index([("child_id", 1), ("date", 1)])

    # Day type calendar (needed for unified task model)
    await database.day_types.create_index([("child_id", 1), ("date", 1)], unique=True)
    await database.default_day_patterns.create_index("child_id", unique=True)

    # School calendar indexes
    await database.terms.create_index([("child_id", 1), ("is_active", 1)])
    await database.terms.create_index([("child_id", 1), ("start_date", 1), ("end_date", 1)])
    await database.special_days.create_index([("child_id", 1), ("date", 1)])

    # Task template system indexes
    await database.task_templates.create_index("template_id", unique=True)
    await database.task_templates.create_index([("created_by", 1), ("is_public", 1)])
    await database.task_templates.create_index("category_path")
    await database.task_templates.create_index("execution_handler")
    await database.task_completions.create_index("completion_id", unique=True)
    await database.task_completions.create_index("task_id")
    await database.task_completions.create_index([("child_id", 1), ("template_id", 1)])
    await database.task_completions.create_index([("child_id", 1), ("completed_at", 1)])
    # Multi-completion support indexes
    await database.task_completions.create_index([("task_id", 1), ("session_number", 1)])
    await database.task_completions.create_index([("task_id", 1), ("scheduled_date", 1)])
    await database.question_banks.create_index("question_bank_id", unique=True)
    await database.question_banks.create_index([("created_by", 1), ("is_public", 1)])

    # User templates (template library) indexes
    await database.user_templates.create_index([("user_id", 1), ("template_id", 1)], unique=True)
    await database.user_templates.create_index("user_id")

    # Recurrence Rules indexes
    await database.recurrence_rules.create_index("task_template_id")
    await database.recurrence_rules.create_index([("task_template_id", 1), ("effective_from", 1)])
    await database.recurrence_rules.create_index([("task_template_id", 1), ("effective_until", 1)])
    await database.recurrence_rules.create_index("effective_until")  # Find active rules

    # Task Sessions indexes
    await database.task_sessions.create_index([("task_id", 1), ("scheduled_date", 1)])
    await database.task_sessions.create_index([("child_id", 1), ("started_at", -1)])
    await database.task_sessions.create_index("completion_id")
    await database.task_sessions.create_index([("completed_at", 1)])  # Find in-progress (null) vs completed

    # Task Attachments indexes
    await database.task_attachments.create_index("task_id")
    await database.task_attachments.create_index("completion_id")
    await database.task_attachments.create_index([("child_id", 1), ("uploaded_at", -1)])
    await database.task_attachments.create_index("purpose")
    await database.task_attachments.create_index("session_id")

    # Subtasks indexes
    await database.subtasks.create_index([("task_id", 1), ("order", 1)])
    await database.subtasks.create_index("parent_subtask_id")
    await database.subtasks.create_index([("task_id", 1), ("status", 1)])

    # Task History indexes
    await database.task_history.create_index([("task_id", 1), ("changed_at", -1)])
    await database.task_history.create_index("changed_by")
    await database.task_history.create_index("change_type")
    await database.task_history.create_index([("changed_by", 1), ("changed_at", -1)])

    # Tools (still needed)
    await database.tools.create_index("code", unique=True)
    await database.tools.create_index([("is_system", 1), ("is_active", 1)])

    # LLM call logs
    await database.llm_logs.create_index([("created_at", -1)])  # Recent logs first
    await database.llm_logs.create_index([("service", 1), ("feature", 1)])  # By service/feature
    await database.llm_logs.create_index([("child_id", 1), ("created_at", -1)])  # By child
    await database.llm_logs.create_index([("user_id", 1), ("created_at", -1)])  # By user
    await database.llm_logs.create_index("error")  # Find errors

    # Initialize cron job scheduler
    init_scheduler(database)
    print("Cron job scheduler initialized")

    # Event bus is available for future handlers
    from backend.services.event_bus import get_event_bus
    event_bus = get_event_bus()
    # Note: Add event handler subscriptions here when needed

    yield

    print("FastAPI shutting down...")
    shutdown_scheduler()
    await db.close_db()

app = FastAPI(
    title="KidsProgress API",
    version="1.0.0-alpha",
    lifespan=lifespan
)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timezone middleware - extract timezone from X-Timezone header
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from backend.utils.timezone_context import set_request_timezone

class TimezoneMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        """Extract timezone from X-Timezone header and set in context."""
        timezone = request.headers.get("X-Timezone", "UTC")
        set_request_timezone(timezone)
        response = await call_next(request)
        return response

app.add_middleware(TimezoneMiddleware)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log validation errors for debugging."""
    print(f"[VALIDATION ERROR] {request.method} {request.url}")
    print(f"[VALIDATION ERROR] Body: {await request.body()}")
    print(f"[VALIDATION ERROR] Errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Include routers
app.include_router(auth.router)
app.include_router(children.router)
app.include_router(devices.router)
app.include_router(task_metadata.router)
app.include_router(task_collections.router)
app.include_router(tasks.router)

# Enhanced task management routers
# Obsolete - removed for unified task model:
# app.include_router(routine_routes.router)
# app.include_router(activity_routes.router)
# app.include_router(time_block_routes.router)
# app.include_router(time_block_routes.day_type_router)
app.include_router(schedule_routes.router)  # Keep for now - schedule generation
app.include_router(tool_routes.router)  # Keep - tools still needed
app.include_router(day_type_routes.router)  # Keep - needed for unified task model
app.include_router(school_calendar_routes.router)  # School calendar (terms, holidays)

# AI-powered features
app.include_router(ai_routes.router)
app.include_router(ai_schedule_routes.router)

# Task template system (plugin-based)
app.include_router(completion_routes.router)
app.include_router(analysis_routes.router)
app.include_router(template_library_routes.router)

# Task collection separation architecture routes
app.include_router(recurrence_routes.router)
app.include_router(session_routes.router)
app.include_router(attachment_routes.router)
app.include_router(subtask_routes.router)

# AI Chat
app.include_router(chat_routes.router)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "KidsProgress API", "version": "1.0.0-alpha"}
