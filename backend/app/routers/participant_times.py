# app/routers/participant_times.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

# 상위 app 폴더에서 필요한 모듈들을 가져옵니다.
from ..database import get_db
from .. import schemas
from .. import models

# 1. 라우터 객체 생성
router = APIRouter(
    prefix="/participant-times",  # API 주소는 /participant-times로 시작
    tags=["Participant Times"]      # /docs 문서에서 "Participant Times" 그룹으로 묶임
)

# 2. GET /participant-times (모든 참가 시간 조회)
@router.get("/", response_model=List[schemas.ParticipantTimeResponse])
def get_all_participant_times(db: Session = Depends(get_db)):
    """
    모든 참가 가능 시간 목록을 조회합니다.
    """
    times = db.query(models.ParticipantTime).all()
    return times

# 3. POST /participant-times (새 참가 시간 생성)
@router.post("/", response_model=schemas.ParticipantTimeResponse)
def create_participant_time(
    time_in: schemas.ParticipantTimeCreate, 
    db: Session = Depends(get_db)
):
    """
    새로운 참가 가능 시간을 DB에 저장합니다.
    """
    # Pydantic 모델을 SQLAlchemy 모델로 변환
    db_time = models.ParticipantTime(**time_in.model_dump())
    
    # DB에 추가, 커밋, 새로고침 (INSERT 실행)
    db.add(db_time)
    db.commit()
    db.refresh(db_time)
    
    # 생성된 객체 반환 (ID 포함)
    return db_time