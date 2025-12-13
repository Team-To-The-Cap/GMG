# app/main.py
from fastapi import FastAPI, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import List
from sqlalchemy.orm import Session
import traceback
import logging

from . import models
from .database import engine, SessionLocal
from . import schemas

log = logging.getLogger(__name__)
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
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
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
    max_age=3600,  # CORS preflight 캐시 시간 증가
)

# 전역 예외 핸들러 추가 (CORS 헤더 보장)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    모든 예외를 처리하여 CORS 헤더를 보장합니다.
    """
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # 요청 origin 확인
    origin = request.headers.get("origin")
    if origin:
        # origins 리스트에 있는지 확인
        if origin not in origins:
            # 정규식으로 확인
            if allow_origin_regex:
                import re
                if not re.match(allow_origin_regex, origin):
                    origin = None
        # origins에 있으면 그대로 사용
    else:
        origin = None
    
    # 에러 상세 정보 (개발 환경에서만)
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
    }
    
    if is_dev:
        error_detail["traceback"] = traceback.format_exc()
    
    # CORS 헤더 설정
    headers = {
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif is_dev:
        # 개발 환경에서는 origin이 없어도 localhost 허용
        headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_detail,
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    요청 검증 에러 처리 (CORS 헤더 보장)
    """
    log.warning(f"Validation error: {exc.errors()}")
    
    # 요청 origin 확인
    origin = request.headers.get("origin")
    if origin:
        # origins 리스트에 있는지 확인
        if origin not in origins:
            # 정규식으로 확인
            if allow_origin_regex:
                import re
                if not re.match(allow_origin_regex, origin):
                    origin = None
        # origins에 있으면 그대로 사용
    else:
        origin = None
    
    # CORS 헤더 설정
    headers = {
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif is_dev:
        # 개발 환경에서는 origin이 없어도 localhost 허용
        headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=headers
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