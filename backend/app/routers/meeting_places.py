from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, models

router = APIRouter(
    prefix="/meetings", # 1. prefix를 meeting-places로 변경
    tags=["Meeting-Places"]
)


@router.post(
    "/{meeting_id}/places", 
    # [수정] 반환 모델을 "List[...]" (목록)으로 변경
    response_model=List[schemas.MeetingPlaceResponse]
)
def create_places_for_meeting( # 함수 이름 변경 (선택 사항)
    meeting_id: int,
    # [수정] 입력 데이터를 "List[...]" (목록)으로 받음
    places_in: List[schemas.MeetingPlaceCreate], 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 새로운 Meeting_Place (코스 장소)
    "목록"을 한 번에 생성합니다.
    """
    
    # 1. 부모인 Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    
    # [수정] 2. 리스트를 순회하며 DB 객체 목록 생성
    
    created_places = [] # 새로 생성된 객체를 담을 리스트
    
    for place_data in places_in:
        # Pydantic 모델을 SQLAlchemy 모델로 변환 (meeting_id 주입)
        db_place = models.MeetingPlace(
            **place_data.model_dump(), 
            meeting_id=meeting_id 
        )
        db.add(db_place)
        created_places.append(db_place)
    
    # [수정] 3. 모든 장소를 한 번에 DB에 커밋 (INSERT 실행)
    db.commit()
    
    # [수정] 4. 새로고침 (DB에서 생성된 ID를 가져옴)
    for db_place in created_places:
        db.refresh(db_place)
    
    # 5. 생성된 "목록" 반환
    return created_places

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