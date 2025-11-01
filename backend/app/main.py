# main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session

# 상대 임포트 유지 (패키지 실행: app.main:app)
from . import models
from .database import engine, SessionLocal
from . import schemas
from .routers import meeting_point  # ✅ 이걸로 충분
from .routers import participants  # ✅ 이걸로 충분


app = FastAPI()

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:3000",
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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Hello World"}

