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
from backend.routes import auth, children, devices, task_metadata, task_collections, tasks

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

    yield

    print("FastAPI shutting down...")
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

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "KidsProgress API", "version": "1.0.0-alpha"}
