---
name: api-design
description: Backend API design conventions for the KidsProgress FastAPI service — route/service/repository layering, REST conventions, Pydantic request/response models, dependency injection. Use when adding or modifying endpoints under backend/routes or services under backend/services.
---

# API Design Patterns (FastAPI + Python)

## SOLID Principles (CRITICAL)

Apply SOLID principles to all backend code:

### Single Responsibility Principle (SRP)
- **Routes**: Only handle HTTP request/response, delegate to services
- **Services**: Only handle business logic for one domain
- **Models**: Only define data structure and validation

```python
# 鉁?Each class has one responsibility
class AuthService:
    """Only handles authentication logic"""
    def authenticate_user(self, email, password): ...
    def create_access_token(self, data): ...

class UserService:
    """Only handles user management"""
    def create_user(self, user_data): ...
    def get_user_by_id(self, user_id): ...
```

### Open/Closed Principle (OCP)
- Use dependency injection for extensibility
- Define interfaces (protocols) for flexibility

```python
# 鉁?Open for extension, closed for modification
from typing import Protocol

class NotificationService(Protocol):
    async def send(self, message: str): ...

class EmailNotificationService:
    async def send(self, message: str):
        # Email implementation

class SMSNotificationService:
    async def send(self, message: str):
        # SMS implementation
```

### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for base types
- Honor method contracts

### Interface Segregation Principle (ISP)
- Small, focused interfaces over large ones
- Don't force clients to depend on methods they don't use

### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- Use dependency injection

```python
# 鉁?Service depends on database abstraction
class TaskService:
    def __init__(self, db: AsyncIOMotorDatabase = Depends(get_db)):
        self.db = db  # Depends on interface, not concrete implementation
```

## Structure
```
backend/
  routes/          # API route definitions
  services/        # Business logic
  models/          # MongoDB models (Pydantic)
  workflows/       # LangGraph workflows
  dependencies/    # Dependency injection
```

## Layered Architecture

```python
# routes/users.py - Route definitions
from fastapi import APIRouter, Depends
from services.user_service import UserService
from models.user import User, CreateUserRequest

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    service: UserService = Depends()
):
    return await service.get_by_id(user_id)

# services/user_service.py - Business logic
from models.user import User
from fastapi import HTTPException

class UserService:
    async def get_by_id(self, user_id: str) -> User:
        user = await db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return User(**user)
```

## RESTful Conventions
```
GET    /api/users         # List
POST   /api/users         # Create
GET    /api/users/{id}    # Get one
PUT    /api/users/{id}    # Update (full)
PATCH  /api/users/{id}    # Update (partial)
DELETE /api/users/{id}    # Delete
```

## Response Models (Pydantic)

```python
from pydantic import BaseModel, Field
from typing import Optional, List

# Response wrapper
class DataResponse[T](BaseModel):
    data: T
    meta: Optional[dict] = None

class ErrorResponse(BaseModel):
    error: dict[str, any]

# Domain models
class User(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: str

    class Config:
        populate_by_name = True

class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')

# Usage
@router.post("/", response_model=DataResponse[User])
async def create_user(data: CreateUserRequest):
    user = await service.create(data)
    return DataResponse(data=user)
```

## Validation

```python
# 鉁?Use Pydantic for automatic validation
from pydantic import BaseModel, Field, validator

class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    age: int = Field(ge=0, le=150)

    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email')
        return v.lower()

# 鉁?FastAPI validates automatically
@router.post("/")
async def create_user(data: CreateUserRequest):  # Auto-validated
    # data is guaranteed to be valid here
    pass
```

## Error Handling

```python
from fastapi import HTTPException, status

# 鉁?Use HTTPException for API errors
def get_user(user_id: str):
    user = await db.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# 鉁?Custom exception handler
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
    )
```

## Dependency Injection

```python
from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

# Dependency
async def get_db() -> AsyncIOMotorDatabase:
    return app.state.db

# Usage in routes
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"_id": user_id})
    return user

# Service dependency
class UserService:
    def __init__(self, db: AsyncIOMotorDatabase = Depends(get_db)):
        self.db = db
```

## Async/Await

```python
# 鉁?Always use async for I/O operations
async def get_users():
    users = await db.users.find().to_list(100)
    return users

# 鉁?Use sync for CPU-bound operations
def process_data(data: list):
    return [item * 2 for item in data]

# Combine
async def get_and_process():
    data = await fetch_data()  # I/O
    result = process_data(data)  # CPU
    return result
```

## Naming Conventions

```python
# Files
routes/users.py
routes/auth.py
services/user_service.py
models/user.py

# Classes
class UserService:  # PascalCase
class CreateUserRequest:

# Functions/methods
async def get_user():  # snake_case
async def create_user():

# Constants
MAX_USERS = 100  # UPPER_SNAKE_CASE
```

## Router Organization

```python
# main.py
from fastapi import FastAPI
from routes import users, auth, posts

app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(posts.router)

# routes/users.py
router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
async def list_users(): ...

@router.post("/")
async def create_user(): ...
```
