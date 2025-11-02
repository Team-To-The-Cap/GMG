# app/routers/meetings.py

# 1. [추가] HTTPException과 Eager Loading을 위한 joinedload 임포트
from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session, joinedload 
from typing import List

from ..database import get_db
from .. import schemas
from .. import models

router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"]
)


# 2. GET /meetings (모든 약속 조회)
@router.get("/", response_model=List[schemas.MeetingResponse])
def get_all_meetings(db: Session = Depends(get_db)):
    """
    모든 약속(Meeting) 목록을 조회합니다.
    """
    meetings = db.query(models.Meeting).all()
    return meetings

# 3. POST /meetings (새 약속 생성)
@router.post("/", response_model=schemas.MeetingResponse)
def create_meeting(
    meeting_in: schemas.MeetingCreate, 
    db: Session = Depends(get_db)
):
    """
    새로운 약속(Meeting)을 생성합니다.
    """
    # 1. Pydantic 모델을 SQLAlchemy 모델로 변환
    db_meeting = models.Meeting(**meeting_in.model_dump())
    
    # 2. DB에 추가, 커밋, 새로고침 (INSERT 실행)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    
    # 3. 생성된 객체 반환 (ID 포함)
    return db_meeting


# 2. [신규] 특정 Meeting 상세 조회 (Participants 포함)
@router.get("/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting_details(meeting_id: int, db: Session = Depends(get_db)):
    """
    특정 meeting_id의 약속 정보와
    해당 약속에 포함된 모든 참가자 목록을 함께 반환합니다.
    """
    
    # 3. [핵심 쿼리]
    #    joinedload(models.Meeting.participants)를 사용하여
    #    Meeting을 조회할 때 Participants 정보도 JOIN으로 한 번에 가져옵니다. (Eager Loading)
    meeting = db.query(models.Meeting).options(
        joinedload(models.Meeting.participants)
    ).filter(models.Meeting.id == meeting_id).first()
    
    # 4. 약속이 없는 경우 404 에러 반환
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 5. 조회된 meeting 객체 반환
    #    FastAPI가 'MeetingResponse' 스키마에 맞춰
    #    meeting.participants까지 JSON으로 자동 변환합니다.
    return meeting