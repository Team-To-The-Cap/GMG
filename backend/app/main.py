# main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session

# 상대 임포트 유지 (패키지 실행: app.main:app)
from . import models
from .database import engine, SessionLocal
from . import schemas
from .routers import calc_func as meeting_point
from .routers import participants 
from .routers import meetings  
from .routers import participant_times 
from .routers import meeting_plans 
from .routers import meeting_places  
from .routers import google_api  
from .routers import naver_search 
from .routers import course



app = FastAPI()

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://223.130.152.114:8001",
    "capacitor://localhost", 
    # "http://<서버-공인IP>:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 이미 위에서 임포트했으니 그대로 사용
app.include_router(meeting_point.router, prefix="")
app.include_router(participants.router, prefix="")
app.include_router(meetings.router, prefix="")
app.include_router(participant_times.router, prefix="")
app.include_router(meeting_plans.router, prefix="")
app.include_router(meeting_places.router, prefix="")
app.include_router(google_api.router, prefix="")
app.include_router(naver_search.router, prefix="") 


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Hello World"}

