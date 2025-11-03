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
    tags=["Meeting-Plans"]
)


@router.post("/{meeting_id}/plan", response_model=schemas.MeetingPlanResponse)
def create_plan_for_meeting(
    meeting_id: int,  # 1. URL 경로에서 meeting_id를 받음
    plan_in: schemas.MeetingPlanCreate, # 2. Request Body에서 상세 일정 정보를 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 새로운 Meeting_Plan (상세 일정)을 생성합니다.
    """
    
    # 1. (권장) 부모인 Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. Pydantic 모델을 SQLAlchemy 모델로 변환
    #    plan_in.model_dump()로 딕셔너리를 만들고,
    #    URL에서 받은 meeting_id를 추가합니다.
    db_plan = models.MeetingPlan(
        **plan_in.model_dump(), 
        meeting_id=meeting_id 
    )
    
    # 3. DB에 추가, 커밋, 새로고침 (INSERT 실행)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    # 4. 생성된 객체 반환 (ID 포함)
    return db_plan

@router.get("/{meeting_id}/plans", response_model=List[schemas.MeetingPlanResponse]) # 1. [수정] List[] 추가
def get_plans_for_meeting( # 2. [수정] 함수 이름 변경 (권장)
    meeting_id: int, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 모든 Meeting_Plans (상세 일정) 목록을 조회합니다.
    """
    
    # 3. [수정] 쿼리 대상 변경 (Meeting -> MeetingPlan)
    # (SQL: SELECT * FROM "Meeting_Plans" WHERE meeting_id = {meeting_id})
    plans = db.query(models.MeetingPlan).filter(
        models.MeetingPlan.meeting_id == meeting_id
    ).all()
    
    # (Meeting이 존재하는지 확인하는 로직은 생략. 필요시 추가)
    
    # 4. [수정] 조회된 plans (목록) 반환
    return plans