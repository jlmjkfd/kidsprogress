"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).parent / ".env"
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
    await database.active_task_sessions.create_index("child_id")
    await database.active_task_sessions.create_index("task_id", unique=True)

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

# AI Chat
app.include_router(chat_routes.router)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "KidsProgress API", "version": "1.0.0-alpha"}
