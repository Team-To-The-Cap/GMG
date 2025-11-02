from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session # ✅ 추가: Session 임포트
from typing import List

from ..database import get_db
from .. import schemas
from .. import models # ✅ 추가: models 임포트 (NameError 해결)

router = APIRouter()

# CREATE (생성)
@router.post("/", response_model=schemas.ParticipantCreate)
def create_participant(participant: schemas.ParticipantCreate, db: Session = Depends(get_db)):
    db_participant = models.Participant(
        name=participant.name,
        email=participant.email
    )
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    return db_participant

# READ (전체 조회)
@router.get("/", response_model=List[schemas.ParticipantResponse])
def get_participants(db: Session = Depends(get_db)):
    return db.query(models.Participant).all()

# READ (단일 조회)
@router.get("/{participant_id}", response_model=schemas.ParticipantResponse)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    participant = db.query(models.Participant).filter(models.Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant

# ... (나머지 Update, Delete 로직이 있었을 것으로 추정)