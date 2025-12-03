# app/routers/meeting_must_visit_place.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(
    # ✅ meetings 라우터와 동일하게 "/meetings" 만 prefix로 잡기
    prefix="/meetings",
    tags=["meeting-must-visit-places"],
)


def _get_meeting_or_404(db: Session, meeting_id: int) -> models.Meeting:
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.get(
    "/{meeting_id}/must-visit-places",
    response_model=list[schemas.MeetingMustVisitPlaceResponse],
)
def list_must_visit_places(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    _get_meeting_or_404(db, meeting_id)
    return (
        db.query(models.MeetingMustVisitPlace)
        .filter(models.MeetingMustVisitPlace.meeting_id == meeting_id)
        .order_by(models.MeetingMustVisitPlace.id.asc())
        .all()
    )


# app/routers/meeting_must_visit_place.py


@router.post(
    "/{meeting_id}/must-visit-places",
    response_model=schemas.MeetingMustVisitPlaceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_must_visit_place(
    meeting_id: int,
    body: schemas.MeetingMustVisitPlaceBase,
    db: Session = Depends(get_db),
):
    _get_meeting_or_404(db, meeting_id)

    # ✅ 1) 같은 meeting_id + name + address 가 이미 있으면 그거 그대로 반환
    existing = (
        db.query(models.MeetingMustVisitPlace)
        .filter(
            models.MeetingMustVisitPlace.meeting_id == meeting_id,
            models.MeetingMustVisitPlace.name == body.name,
            models.MeetingMustVisitPlace.address == body.address,
        )
        .first()
    )
    if existing:
        return existing

    # ✅ 2) 없을 때만 새로 생성
    obj = models.MeetingMustVisitPlace(
        meeting_id=meeting_id,
        name=body.name,
        address=body.address,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete(
    "/{meeting_id}/must-visit-places/{place_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_must_visit_place(
    meeting_id: int,
    place_id: int,
    db: Session = Depends(get_db),
):
    _get_meeting_or_404(db, meeting_id)

    obj = (
        db.query(models.MeetingMustVisitPlace)
        .filter(
            models.MeetingMustVisitPlace.id == place_id,
            models.MeetingMustVisitPlace.meeting_id == meeting_id,
        )
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Must-visit place not found")

    db.delete(obj)
    db.commit()
    # 204 이므로 반환값 없음
    return