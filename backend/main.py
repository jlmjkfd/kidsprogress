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
    routine_routes,
    activity_routes,
    schedule_routes,
    tool_routes,
    time_block_routes,
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

    # Enhanced task management indexes
    await database.tasks.create_index([("task_source", 1), ("source_id", 1)])
    await database.tasks.create_index([("child_id", 1), ("scheduled_date", 1)])
    await database.tasks.create_index([("child_id", 1), ("obligation_level", 1)])
    await database.routines.create_index([("child_id", 1), ("is_active", 1)])
    await database.activities.create_index([("child_id", 1), ("is_active", 1)])
    await database.activities.create_index([("child_id", 1), ("activity_type", 1)])
    await database.activity_usage.create_index([("activity_id", 1), ("usage_date", 1)])
    await database.time_blocks.create_index([("child_id", 1), ("date", 1)])
    await database.day_types.create_index([("child_id", 1), ("date", 1)], unique=True)
    await database.tools.create_index("code", unique=True)
    await database.tools.create_index([("is_system", 1), ("is_active", 1)])

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
app.include_router(routine_routes.router)
app.include_router(activity_routes.router)
app.include_router(schedule_routes.router)
app.include_router(tool_routes.router)
app.include_router(time_block_routes.router)
app.include_router(time_block_routes.day_type_router)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "KidsProgress API", "version": "1.0.0-alpha"}
