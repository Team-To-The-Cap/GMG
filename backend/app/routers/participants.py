# app/routers/participants.py

# 1. [수정] HTTPException, status 임포트
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import schemas
from .. import models

# 2. [수정] 라우터 prefix 변경 (계층적 구조)
router = APIRouter(
    prefix="/meetings/{meeting_id}/participants", # API 주소가 /meetings/{id}/participants로 시작
    tags=["Participants"]                  # /docs 태그 이름 변경
)

# 3. [수정] GET / (특정 약속의 모든 참가자 조회)
@router.get("/", response_model=List[schemas.ParticipantResponse])
def get_participants_for_meeting(
    meeting_id: int, # [수정] URL 경로에서 meeting_id를 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 모든 참가자 목록과
    각 참가자의 시간 목록(available_times)을 함께 조회합니다.
    """
    
    # 1. 부모인 Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. [수정] 해당 meeting_id의 참가자만 조회 (Eager Loading 포함)
    participants = db.query(models.Participant).filter(
        models.Participant.meeting_id == meeting_id
    ).options(
        joinedload(models.Participant.available_times)
    ).all()
    
    return participants

# 4. [수정] POST / (새 참가자 및 시간 중첩 생성)
@router.post("/", response_model=schemas.ParticipantResponse)
def create_participant_for_meeting(
    meeting_id: int, # [수정] URL 경로에서 meeting_id를 받음
    # [수정] meeting_id가 빠진 'ParticipantCreateNested' 스키마 사용
    participant_in: schemas.ParticipantCreate, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 새로운 참가자 1명과
    그 참가자가 가능한 시간 목록(N개)을 DB에 저장합니다.
    """
    
    # 1. 부모 Meeting 확인 (참가자를 추가할 약속이 존재하는지)
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 2. Participant (부모) 생성
    participant_dict = participant_in.model_dump()
    times_data_list = participant_dict.pop("available_times", [])
    
    # [수정] meeting_id를 URL 경로에서 주입
    db_participant = models.Participant(
        **participant_dict, 
        meeting_id=meeting_id 
    )
    
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    
    # 3. ParticipantTimes (자식) 생성
    for time_data in times_data_list:
        db_time = models.ParticipantTime(
            **time_data,
            meeting_id=meeting_id, # URL의 meeting_id
            participant_id=db_participant.id # 방금 생성된 참가자 id
        )
        db.add(db_time)
        
    db.commit()
    
    # 4. 최종 반환 (생성된 객체 다시 조회)
    final_participant = db.query(models.Participant).options(
        joinedload(models.Participant.available_times)
    ).filter(models.Participant.id == db_participant.id).first()

    return final_participant

# 5. [수정] PATCH /participants/{participant_id} (기존 코드)
@router.patch("/{participant_id}", response_model=schemas.ParticipantResponse)
def update_participant(
    meeting_id: int, # [수정] 부모 ID (검증용)
    participant_id: int, # URL에서 수정할 참가자 ID
    participant_in: schemas.ParticipantUpdate, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 속한 participant_id의 참가자 정보를 수정합니다.
    """
    # [수정] 쿼리 시 meeting_id를 함께 검증
    db_participant = db.query(models.Participant).filter(
        models.Participant.id == participant_id,
        models.Participant.meeting_id == meeting_id 
    ).first()
    
    if db_participant is None:
        raise HTTPException(status_code=404, detail="Participant not found for this meeting")
        
    update_data = participant_in.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_participant, key, value)
        
    db.commit()
    
    final_participant = db.query(models.Participant).options(
        joinedload(models.Participant.available_times)
    ).filter(models.Participant.id == db_participant.id).first()

    return final_participant

# 6. [수정] DELETE /participants/{participant_id} (기존 코드)
@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(
    meeting_id: int, # [수정] 부모 ID (검증용)
    participant_id: int, # URL에서 삭제할 참가자 ID
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 속한 participant_id의 참가자 정보를 삭제합니다.
    """
    # [수정] 쿼리 시 meeting_id를 함께 검증
    db_participant = db.query(models.Participant).filter(
        models.Participant.id == participant_id,
        models.Participant.meeting_id == meeting_id
    ).first()
    
    if db_participant is None:
        raise HTTPException(status_code=404, detail="Participant not found for this meeting")
        
    db.delete(db_participant)
    db.commit()
    return