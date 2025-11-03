from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, models

router = APIRouter(
    prefix="/meetings", # 1. prefix를 meeting-places로 변경
    tags=["Meeting-Places"]
)


# 1. POST /meetings/{meeting_id}/places (코스 장소 1개 추가)
@router.post("/{meeting_id}/places", response_model=schemas.MeetingPlaceResponse)
def create_place_for_meeting(
    meeting_id: int,  # URL 경로에서 meeting_id를 받음
    place_in: schemas.MeetingPlaceCreate, # Request Body에서 장소 정보를 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 새로운 Meeting_Place (코스 장소)를 생성합니다.
    """
    
    # 1. 부모인 Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. Pydantic 모델을 SQLAlchemy 모델로 변환 (meeting_id 주입)
    db_place = models.MeetingPlace(
        **place_in.model_dump(), 
        meeting_id=meeting_id 
    )
    
    # 3. DB에 추가, 커밋, 새로고침 (INSERT 실행)
    db.add(db_place)
    db.commit()
    db.refresh(db_place)
    
    # 4. 생성된 객체 반환 (ID 포함)
    return db_place

# 2. GET /meetings/{meeting_id}/places (코스 장소 목록 조회)
@router.get("/{meeting_id}/places", response_model=List[schemas.MeetingPlaceResponse])
def get_places_for_meeting(
    meeting_id: int, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 모든 Meeting_Places (코스 장소) 목록을 조회합니다.
    """
    
    # 1. Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. MeetingPlan 테이블에서 meeting_id가 일치하는 모든 데이터를 조회
    # (SQLAlchemy의 relationship을 사용해도 됩니다: return meeting.places)
    places = db.query(models.MeetingPlace).filter(
        models.MeetingPlace.meeting_id == meeting_id
    ).all()
    
    return places