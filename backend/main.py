from datetime import datetime
from typing import Any, List, Optional
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from pydantic import BaseModel
from pymongo import DESCENDING

from db.client import MongoDBClient
from db.constants import (
    ChatHistoryFormType,
    ChatHistoryRole,
    ChatHistoryType,
    CollectionName,
)
from db.models import ChatHistory, EnglishWriting
from workflows.supervisor import build_supervisor
from workflows.states import SupervisorState

testTitle = "The Snowman"
testEssay = """whenever I try to make a snowman it alwats gets destroyed. 
I don't know why? My dad says \"make a snow ball then pat more snow on it\". I put more snow on it, but it doesn't work. 
Once he make one in front of me but I didn't understand. I was soooo confusing for me. And each day in the winter I beg my dad to go out and practice how to mak a snowman.
And each day I go out to play with the snow I get better. And I tryed and I tryed until one time I gotherd up the snow and just made it round and I had make a snowman!
I was soooo suprised that I had made a snowman! And then I just got a couple of sticks and I put them on and I screamed to my dad and said \"I MADE A SNOWMAM\" because he wasn't watching me and he huged me.
"""

testTitle1 = "My day at school"
testEssay1 = "Today I had mandar lesson. I made snake because this year is the year of snake. At lunch playtime, I played my favourite game chase. It's my favourite game because I like running around. School is best!"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FastAPI starting up...")
    MongoDBClient.get_client()
    yield
    print("FastAPI shutting down...")
    MongoDBClient.close()


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",  # front-end url
]

# tackle with cross domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    # id: Optional[str]
    role: ChatHistoryRole
    content: str
    type: Optional[ChatHistoryType]
    formType: Optional[ChatHistoryFormType] = None
    payload: Optional[Any] = None


@app.post("/chat")
async def chat(request: ChatRequest):
    print(">>>>>>>>>>enter /chat api")
    print(request)

    # run graph
    graph = build_supervisor()
    graphDataParams = {
        "role": request.role,
        "userContent": request.content,
        "type": request.type,
    }
    for field in ["formType", "payload"]:
        value = getattr(request, field, None)
        if value is not None:
            graphDataParams[field] = value
    graphData = SupervisorState(**graphDataParams)
    result = graph.invoke(graphData)

    print(">>>>>>>result")
    print(result)

    # construct the return data
    returnData = {
        "userMsgId": result.get("userMsgId"),
        "AIMsg": {
            "_id": result.get("AIMsgId"),
            "role": ChatHistoryRole.AI,
            "type": result.get("type"),
            "content": result.get("AIContent"),
        },
    }
    formType = result.get("formType", None)
    if formType is not None:
        returnData["AIMsg"]["formType"] = formType
    payload = result.get("workflowResult", None)
    if payload is not None:
        returnData["AIMsg"]["payload"] = payload

    print(">>>>>>>>>>return data")
    print(returnData)
    # for field in ["formType", "payload"]:
    #     value = getattr(result,field,None)
    #     if value is not None:
    #         returnDataParams[field] = value

    # msg = ChatHistory(**returnDataParams)
    # db[CollectionName.CHATHISTORY.value].insert_one(msg.model_dump())
    # {chatHistory:{},}
    return returnData


@app.get("/chats", response_model=List[ChatHistory])
def get_chats(limit: int = Query(30, gt=0), before: Optional[datetime] = None):
    # def get_chats():
    db = MongoDBClient.get_db()
    query = {}
    if before:
        query["date"] = {"$lt": before}  # get earlier messages

    chats = (
        db[CollectionName.CHATHISTORY.value]
        .find(query)
        .sort("date", DESCENDING)
        .limit(limit)
    )

    chats_list = list(chats)
    for chat in chats_list:
        chat["_id"] = str(chat["_id"])
    print(chats_list)
    chats_list.sort(key=lambda x: x["date"])
    return chats_list


@app.get("/writings", response_model=List[EnglishWriting])
def get_writings():
    db = MongoDBClient.get_db()
    writings = db[CollectionName.ENG_WRITINGS.value].find()
    writing_list = list(writings)
    for writing in writing_list:
        writing["_id"] = str(writing["_id"])
    print(writing_list)
    return writing_list


@app.get("/writings/{id}", response_model=EnglishWriting)
def get_writing_by_id(id: str):
    db = MongoDBClient.get_db()
    try:
        object_id = ObjectId(id)
    except:
        # if ID is invalid，return 400 Bad Request
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    writing = db[CollectionName.ENG_WRITINGS.value].find_one({"_id": object_id})
    if writing:
        writing["_id"] = str(writing["_id"])
        return writing
    else:
        raise HTTPException(status_code=404, detail="Writing not found")
