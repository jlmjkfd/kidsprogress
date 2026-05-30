---
name: database
description: MongoDB + Motor (async) usage conventions for KidsProgress: collection design, ObjectId handling, indexing, async queries, projections. Use when writing repository code, queries, or new collection schemas under backend/models, backend/repositories, or backend/services.
---

# Database Best Practices (MongoDB + Motor)

## Standard: Motor (Async) Only

**Why Motor for this app:**
- 鉁?Non-blocking I/O for FastAPI endpoints
- 鉁?Better concurrency with AI/LangGraph workflows
- 鉁?Multiple kids can use app simultaneously without blocking
- 鉁?Best practice for async FastAPI applications

## Connection Setup

```python
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    app.state.mongo_client = AsyncIOMotorClient(MONGO_URI)
    app.state.db = app.state.mongo_client[DB_NAME]

@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.mongo_client.close()

# Dependency
async def get_db() -> AsyncIOMotorDatabase:
    return app.state.db
```

## Models (Pydantic)

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CreateUserRequest(BaseModel):
    name: str
    email: str
```

## Query Patterns

```python
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

# 鉁?Find one
async def get_user(db: AsyncIOMotorDatabase, user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return User(**user) if user else None

# 鉁?Find many with filter
async def get_users_by_status(db: AsyncIOMotorDatabase, status: str):
    cursor = db.users.find({"status": status})
    users = await cursor.to_list(length=100)
    return [User(**user) for user in users]

# 鉁?Projection (select specific fields)
async def get_user_names(db: AsyncIOMotorDatabase):
    cursor = db.users.find({}, {"name": 1, "email": 1})
    return await cursor.to_list(length=100)

# 鉁?Pagination
async def get_users_paginated(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    limit: int = 20
):
    skip = (page - 1) * limit
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    total = await db.users.count_documents({})
    return users, total
```

## Insert/Update/Delete

```python
# 鉁?Insert one
async def create_user(db: AsyncIOMotorDatabase, data: CreateUserRequest):
    result = await db.users.insert_one(data.model_dump())
    user = await db.users.find_one({"_id": result.inserted_id})
    return User(**user)

# 鉁?Insert many
async def create_users_bulk(db: AsyncIOMotorDatabase, users: list[CreateUserRequest]):
    docs = [user.model_dump() for user in users]
    result = await db.users.insert_many(docs)
    return result.inserted_ids

# 鉁?Update one
async def update_user(db: AsyncIOMotorDatabase, user_id: str, updates: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return await get_user(db, user_id)

# 鉁?Delete one
async def delete_user(db: AsyncIOMotorDatabase, user_id: str):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
```

## Aggregation

```python
# 鉁?Aggregation pipeline
async def get_user_stats(db: AsyncIOMotorDatabase):
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "avg_age": {"$avg": "$age"}
        }},
        {"$sort": {"count": -1}}
    ]
    cursor = db.users.aggregate(pipeline)
    return await cursor.to_list(length=None)

# 鉁?Complex aggregation
async def get_user_posts_count(db: AsyncIOMotorDatabase):
    pipeline = [
        {"$lookup": {
            "from": "posts",
            "localField": "_id",
            "foreignField": "user_id",
            "as": "posts"
        }},
        {"$addFields": {"post_count": {"$size": "$posts"}}},
        {"$project": {"name": 1, "email": 1, "post_count": 1}}
    ]
    cursor = db.users.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

## Indexes

```python
# Create indexes at startup
@app.on_event("startup")
async def create_indexes():
    db = app.state.db

    # Single field index
    await db.users.create_index("email", unique=True)

    # Compound index
    await db.users.create_index([
        ("status", 1),
        ("created_at", -1)
    ])

    # Text search index
    await db.posts.create_index([("title", "text"), ("content", "text")])
```

## Transactions

```python
from motor.motor_asyncio import AsyncIOMotorClientSession

# 鉁?Use transactions for related operations
async def transfer_credits(
    db: AsyncIOMotorDatabase,
    from_user_id: str,
    to_user_id: str,
    amount: int
):
    async with await db.client.start_session() as session:
        async with session.start_transaction():
            # Deduct from sender
            await db.users.update_one(
                {"_id": ObjectId(from_user_id)},
                {"$inc": {"credits": -amount}},
                session=session
            )

            # Add to receiver
            await db.users.update_one(
                {"_id": ObjectId(to_user_id)},
                {"$inc": {"credits": amount}},
                session=session
            )
```

## Query Operators

```python
# Comparison
await db.users.find({"age": {"$gte": 18, "$lte": 65}})

# Logical
await db.users.find({
    "$or": [
        {"status": "active"},
        {"premium": True}
    ]
})

# Array
await db.users.find({"tags": {"$in": ["python", "fastapi"]}})

# Exists
await db.users.find({"deleted_at": {"$exists": False}})

# Regex
await db.users.find({"email": {"$regex": "gmail.com$"}})
```

## Performance Tips

```python
# 鉁?Use indexes for filtered/sorted queries
await db.users.create_index("created_at")

# 鉁?Limit results
cursor = db.users.find().limit(100)

# 鉁?Project only needed fields
cursor = db.users.find({}, {"name": 1, "email": 1})

# 鉁?Use explain to analyze queries
explain = await db.users.find({"email": "test@example.com"}).explain()

# 鉁?Avoid fetching all documents
# cursor = db.users.find()  # No limit!
# all_users = await cursor.to_list(length=None)  # Dangerous!
```

## Common Patterns

```python
# Upsert (update or insert)
await db.users.update_one(
    {"email": email},
    {"$set": {"name": name}},
    upsert=True
)

# Increment/Decrement
await db.posts.update_one(
    {"_id": post_id},
    {"$inc": {"views": 1}}
)

# Array operations
await db.users.update_one(
    {"_id": user_id},
    {"$push": {"tags": "new-tag"}}
)

await db.users.update_one(
    {"_id": user_id},
    {"$pull": {"tags": "old-tag"}}
)
```
