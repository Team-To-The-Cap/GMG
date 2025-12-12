# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session

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
from .routers import naver_directions
from .routers import course
from .routers import meeting_must_visit_place
from .routers import meeting_courses  # ✅ 코스 자동 생성 라우터 추가


app = FastAPI()


@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)


import os
import re

# 개발 환경에서는 모든 localhost 포트 허용
# 프로덕션에서는 특정 origin만 허용
is_dev = os.getenv("ENV", "development") == "development"

if is_dev:
    # 개발 환경: localhost의 모든 포트 허용 + 서버 IP
    origins = [
        "http://localhost:*",  # 모든 localhost 포트
        "http://127.0.0.1:*",  # 모든 127.0.0.1 포트
        "http://211.188.55.98:8000",
        "http://211.188.55.98:8001",
        "capacitor://localhost",
    ]
    # 정규식으로 localhost의 모든 포트 허용
    allow_origin_regex = r"http://(localhost|127\.0\.0\.1):\d+"
else:
    # 프로덕션 환경: 특정 origin만 허용
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://211.188.55.98:8000",  # main 브랜치용 포트
        "http://211.188.55.98:8001",  # develop 브랜치용 포트
        "capacitor://localhost",
    ]
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ✅ 라우터 등록
app.include_router(meeting_point.router, prefix="")
app.include_router(participants.router, prefix="")
app.include_router(meetings.router, prefix="")
app.include_router(participant_times.router, prefix="")
app.include_router(meeting_plans.router, prefix="")
app.include_router(meeting_places.router, prefix="")
app.include_router(google_api.router, prefix="")
app.include_router(naver_search.router, prefix="")
app.include_router(naver_directions.router, prefix="")
app.include_router(meeting_must_visit_place.router, prefix="")
app.include_router(course.router, prefix="")          # 코스 단독용
app.include_router(meeting_courses.router, prefix="")  # ✅ 약속별 코스 자동 생성


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Hello World"}