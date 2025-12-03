# app/routers/meetings.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Set
from datetime import date, timedelta

from datetime import date, timedelta
from typing import Dict, Set

from ..database import get_db
from .. import schemas, models

router = APIRouter(
    prefix="/meetings",
    tags=["Meetings"],
)

# -------------------------------------------------
# 유틸: 날짜 -> 가능한 참가자 ID 집합
# -------------------------------------------------

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

            if end_d < start_d:  # 안전 장치
                start_d, end_d = end_d, start_d

            d = start_d
            while d <= end_d:
                if d not in date_to_participants:
                    date_to_participants[d] = set()
                date_to_participants[d].add(p.id)
                d = d + timedelta(days=1)

    return date_to_participants


# -------------------------------------------------
# 1) 모든 Meeting 목록 조회
# -------------------------------------------------

@router.get("/", response_model=List[schemas.MeetingResponse])
def get_all_meetings(db: Session = Depends(get_db)):
    """
    모든 약속(Meeting) 목록 조회
    - participants, plan, places, must_visit_places를 한 번에 가져옴
    """
    meetings = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants),
            joinedload(models.Meeting.plan)
            .joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .all()
    )
    return meetings


# -------------------------------------------------
# 2) Meeting 생성
# -------------------------------------------------

@router.post("/", response_model=schemas.MeetingResponse)
def create_meeting(
    meeting_in: schemas.MeetingCreate,
    db: Session = Depends(get_db),
):
    """
    새로운 약속(Meeting)을 생성합니다.
    """
    db_meeting = models.Meeting(**meeting_in.model_dump())
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


# -------------------------------------------------
# 3) 특정 Meeting 상세 조회
# -------------------------------------------------

@router.get("/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting_details(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    특정 Meeting 상세 조회
    - participants + participant.available_times
    - plan + plan.available_dates
    - places (MeetingPlace)
    - must_visit_places
    를 한 번에 가져오고,
    available_dates[*].available_participant / available_participant_number 채워서 반환.
    """
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants)
            .joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan)
            .joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 날짜 → 참가자 매핑
    date_mapping = build_date_to_participants(meeting)

    result = schemas.MeetingResponse.model_validate(meeting)

    if result.plan:
        for d in result.plan.available_dates:
            participant_ids = sorted(date_mapping.get(d.date, []))
            d.available_participant = participant_ids
            d.available_participant_number = len(participant_ids)

    return result


# -------------------------------------------------
# 4) Meeting 일부 수정 (이름/프로필)
# -------------------------------------------------

@router.patch("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    meeting_in: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id의 약속 정보를 부분 수정합니다.
    - MeetingUpdate에 정의된 필드(name, with_whom, purpose, vibe, budget, profile_memo 등)만 수정
    """
    db_meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    update_data = meeting_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meeting, key, value)

    db.commit()
    db.refresh(db_meeting)

    # 수정 후 다시 eager load
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants)
            .joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan)
            .joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.places),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    date_mapping = build_date_to_participants(meeting)
    result = schemas.MeetingResponse.model_validate(meeting)

    if result.plan:
        for d in result.plan.available_dates:
            participant_ids = sorted(date_mapping.get(d.date, []))
            d.available_participant = participant_ids
            d.available_participant_number = len(participant_ids)

    return result


# -------------------------------------------------
# 5) Meeting 삭제
# -------------------------------------------------

@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id의 약속(Meeting)을 삭제합니다.
    models.Meeting 에 설정된 cascade 덕분에
    연결된 Participants, Plans, Places, Times가 함께 삭제됩니다.
    """
    db_meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    db.delete(db_meeting)
    db.commit()
    # 204 이라서 반환값 없음