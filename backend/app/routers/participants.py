# app/routers/participants.py

# 1. (제공해주신 Base Code)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from .. import schemas
from .. import models

# 2. 라우터 객체 생성 (prefix와 tags 설정)
router = APIRouter(
    prefix="/participants",  # 이 파일의 모든 API 주소는 /participants로 시작
    tags=["Participants"]      # /docs 문서에서 "Participants" 그룹으로 묶임
)

# 3. GET /participants (모든 참가자 조회)
@router.get("/", response_model=List[schemas.ParticipantResponse])
def get_all_participants(db: Session = Depends(get_db)):
    """
    DB에 저장된 모든 참가자 목록을 조회합니다.
    """
    # SQLAlchemy 쿼리: SELECT * FROM participants;
    participants = db.query(models.Participant).all()
    
    # 조회된 목록 반환 (Pydantic이 JSON으로 자동 변환)
    return participants

# # 4. POST /participants (새 참가자 생성)
# @router.post("/", response_model=schemas.ParticipantResponse)
# def create_participant(
#     # 입력 데이터를 schemas.ParticipantCreate로 검증
#     participant_in: schemas.ParticipantCreate, 
#     # DB 세션 주입
#     db: Session = Depends(get_db)
# ):
#     """
#     새로운 참가자 정보를 DB에 저장합니다.
#     """
#     # 1. Pydantic 모델(participant_in)을 SQLAlchemy 모델(models.Participant)로 변환
#     db_participant = models.Participant(**participant_in.model_dump())
    
#     # 2. DB 세션에 추가 (INSERT 준비)
#     db.add(db_participant)
    
#     # 3. DB에 커밋 (실제 INSERT 실행)
#     db.commit()
    
#     # 4. DB가 방금 생성한 id 값을 객체에 새로고침
#     db.refresh(db_participant)
    
#     # 5. 생성된 객체 반환 (ID 포함)
#     return db_participant





# [수정] POST /participants (새 참가자 및 시간 중첩 생성)
@router.post("/", response_model=schemas.ParticipantResponse)
def create_participant(
    # [수정] 입력 데이터를 중첩 스키마인 ParticipantCreate로 받음
    participant_in: schemas.ParticipantCreate, 
    db: Session = Depends(get_db)
):
    """
    새로운 참가자 1명과
    그 참가자가 가능한 시간 목록(N개)을 DB에 저장합니다.
    """
    
    # --- 1. Participant (부모) 생성 ---
    
    # 1a. Pydantic 모델을 딕셔너리로 변환
    participant_dict = participant_in.model_dump()
    
    # 1b. 'available_times'는 DB 컬럼이 아니므로 딕셔너리에서 분리
    times_data_list = participant_dict.pop("available_times", [])
    
    # 1c. Participant 객체 생성
    # (meeting_id, name 등이 participant_dict에 포함되어 있음)
    db_participant = models.Participant(**participant_dict)
    
    # 1d. DB에 저장 (INSERT) 및 ID 가져오기
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant) # DB에서 생성된 participant.id를 가져옴
    
    # --- 2. ParticipantTimes (자식) 생성 ---
    
    # 2a. 분리해 둔 시간 목록을 순회
    for time_data in times_data_list:
        db_time = models.ParticipantTime(
            **time_data,  # start_time, end_time
            meeting_id = db_participant.meeting_id, # 부모의 meeting_id
            participant_id = db_participant.id      # [핵심] 방금 생성된 부모의 id
        )
        db.add(db_time)
        
    # 2b. 모든 시간을 DB에 커밋 (INSERT)
    db.commit()
    
    # --- 3. 최종 반환 ---
    # 생성된 참가자와 시간 목록을 모두 포함하여 다시 조회
    final_participant = db.query(models.Participant).options(
        joinedload(models.Participant.available_times)
    ).filter(models.Participant.id == db_participant.id).first()

    return final_participant