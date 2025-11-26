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
    모든 약속(Meeting) 목록 조회
    - participants, plan, places, must_visit_places를 한 번에 가져옴
    - (여기서는 available_dates의 participant 정보까지 계산하면 너무 무거울 수 있어서 생략)
    """
    meetings = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants),
            joinedload(models.Meeting.plan),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .all()
    )
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
    특정 Meeting 상세 조회
    - participants + participant.available_times
    - plan + plan.available_dates
    - places
    - must_visit_places
    를 한 번에 가져오고,
    각 날짜별 available_participant / available_participant_number 를 채워서 반환.
    """
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants).joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan).joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 참가 가능 날짜 → 참가자 ID 매핑
    date_mapping = build_date_to_participants(meeting)

    # SQLAlchemy 객체 → Pydantic 모델
    result = schemas.MeetingResponse.model_validate(meeting)

    # available_dates에 참가자 정보 채워넣기
    if result.plan:
        for d in result.plan.available_dates:
            participant_ids = sorted(date_mapping.get(d.date, []))
            d.available_participant = participant_ids
            d.available_participant_number = len(participant_ids)

    return result

@router.patch("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting_name(
    meeting_id: int,
    meeting_in: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id의 약속 정보를 부분 수정합니다.
    - name, with_whom, purpose, vibe, budget, profile_memo 등
      MeetingUpdate에 정의된 필드만 수정 대상.
    """
    # 1. 원본 조회
    db_meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 2. 클라이언트가 실제로 보낸 필드만 딕셔너리로 추출
    update_data = meeting_in.model_dump(exclude_unset=True)

    # 3. 해당 필드만 SQLAlchemy 객체에 적용
    for key, value in update_data.items():
        setattr(db_meeting, key, value)

    # 4. 커밋
    db.commit()
    db.refresh(db_meeting)

    # 5. 상세 조회와 동일한 형태로 다시 로딩 (joinedload + available_dates 계산)
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants).joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan).joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        # 이 경우는 거의 없음 (방금 업데이트했으니까)
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 날짜→참가자 매핑 다시 계산
    date_mapping = build_date_to_participants(meeting)

    result = schemas.MeetingResponse.model_validate(meeting)

    if result.plan:
        for d in result.plan.available_dates:
            participant_ids = sorted(date_mapping.get(d.date, []))
            d.available_participant = participant_ids
            d.available_participant_number = len(participant_ids)

    return result

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
