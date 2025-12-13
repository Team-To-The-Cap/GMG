# app/routers/meeting_must_visit_place.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(
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
    """
    name/address/lat/lng 를 받아 MustVisit을 추가.
    같은 meeting_id + name + address 가 있으면 재사용.
    (lat/lng 는 새 값이 들어와도 기존 것을 유지)
    """
    _get_meeting_or_404(db, meeting_id)

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

    obj = models.MeetingMustVisitPlace(
        meeting_id=meeting_id,
        name=body.name,
        address=body.address,
        latitude=body.latitude,
        longitude=body.longitude,
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
    return