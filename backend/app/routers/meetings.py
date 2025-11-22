# app/routers/meetings.py

# 1. [추가] HTTPException과 Eager Loading을 위한 joinedload 임포트
from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy.orm import Session, joinedload 
from typing import List

from datetime import date, timedelta
from typing import Dict, Set

from ..database import get_db
from .. import schemas
from .. import models

router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"]
)

# ✅ 날짜별로 가능한 participant id들을 모아주는 함수
def build_date_to_participants(meeting: models.Meeting) -> Dict[date, Set[int]]:
    """
    meeting.participants[*].available_times 를 보고
    날짜(date) -> 이 날짜에 가능한 참가자 id 집합(set)으로 매핑한다.
    """
    date_to_participants: Dict[date, Set[int]] = {}

    for p in meeting.participants:
        for t in p.available_times:
            start_d = t.start_time.date()
            end_d = t.end_time.date()

            # 혹시 잘못 들어온 경우 대비
            if end_d < start_d:
                start_d, end_d = end_d, start_d

            d = start_d
            while d <= end_d:
                if d not in date_to_participants:
                    date_to_participants[d] = set()
                date_to_participants[d].add(p.id)
                d = d + timedelta(days=1)

    return date_to_participants

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

    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants).joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan).joinedload(models.MeetingPlan.available_dates),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 참가 가능 날짜 → 참가자 ID 매핑
    date_mapping = build_date_to_participants(meeting)

    result = schemas.MeetingResponse.model_validate(meeting)

    if result.plan:
        for d in result.plan.available_dates:
            participant_ids = sorted(date_mapping.get(d.date, []))
            d.available_participant = participant_ids
            d.available_participant_number = len(participant_ids)

    return result

@router.patch("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting_name(
    meeting_id: int,  # URL에서 수정할 대상 ID를 받음
    meeting_in: schemas.MeetingUpdate, # Body에서 "수정할 내용(name)"만 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id의 약속 이름(name)을 수정합니다.
    """
    
    # 1. DB에서 수정할 원본 데이터를 조회
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    
    # 2. 데이터가 없으면 404 에러
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 3. [핵심] Pydantic 모델을 딕셔너리로 변환
    #    exclude_unset=True: 클라이언트가 "실제로 보낸 필드(name)"만 딕셔너리로 만듦
    update_data = meeting_in.model_dump(exclude_unset=True)
    
    # 4. 딕셔너리를 순회하며 원본 객체(db_meeting)의 값을 변경
    for key, value in update_data.items():
        setattr(db_meeting, key, value) # db_meeting.name = "새 이름"
        
    # 5. DB에 커밋 (UPDATE 쿼리 실행)
    db.commit()
    db.refresh(db_meeting)
    
    # 6. 수정된 최종 객체를 (관계 포함하여) 다시 조회 후 반환
    final_meeting = db.query(models.Meeting).options(
        joinedload(models.Meeting.participants)
    ).filter(models.Meeting.id == db_meeting.id).first()

    return final_meeting

@router.delete(
    "/{meeting_id}", 
    status_code=status.HTTP_204_NO_CONTENT # 성공 시 204 (내용 없음) 반환
)
def delete_meeting(
    meeting_id: int,  # URL에서 삭제할 대상 ID를 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id의 약속(Meeting) 정보를 삭제합니다.
    (models.py에 설정된 CASCADE 옵션에 의해
     연결된 Participants, Plans, Places, Times가 모두 자동 삭제됩니다.)
    """
    
    # 1. DB에서 삭제할 원본 데이터를 조회
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    
    # 2. 데이터가 없으면 404 에러
    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 3. [핵심] SQLAlchemy 세션에서 객체 삭제 (DELETE 쿼리 준비)
    db.delete(db_meeting)
    
    # 4. DB에 커밋 (실제 DELETE 쿼리 실행)
    db.commit()
    
    # 5. 204 No Content 응답을 위해 아무것도 반환하지 않음
    return
