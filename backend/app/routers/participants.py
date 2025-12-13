# app/routers/participants.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from pathlib import Path
import os

import requests

from ..database import get_db
from .. import schemas
from .. import models

router = APIRouter(
    prefix="/meetings/{meeting_id}/participants",
    tags=["Participants"],
)

# ── .env 강제 로드 (backend 루트의 .env) ──
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except Exception:
    pass

GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"

def _get_naver_map_creds() -> tuple[str | None, str | None]:
    """네이버 지도 API 크리덴셜을 환경 변수에서 가져옵니다."""
    cid = os.getenv("NAVER_MAP_CLIENT_ID") or os.getenv("NAVER_CLIENT_ID") or os.getenv("client_id")
    sec = os.getenv("NAVER_MAP_CLIENT_SECRET") or os.getenv("NAVER_CLIENT_SECRET") or os.getenv("client_secret")
    return cid, sec


def get_coords_from_address(address: str):
    """
    Naver Geocoding API를 호출하여 주소로부터 (위도, 경도)를 반환합니다.
    성공 시 (lat, lon) 튜플, 실패 시 None.
    """
    client_id, client_secret = _get_naver_map_creds()
    if not client_id or not client_secret:
        print("!!! [Geocoding] Naver API credentials not configured")
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
        "Accept": "application/json",
    }
    params = {"query": address}

    print("--- [Geocoding Debug] ---")
    print("Endpoint     :", GEOCODE_URL)
    print("Query        :", address)
    print("ClientID tail:", client_id[-4:] if client_id else "None")
    print("-------------------------")

    try:
        resp = requests.get(GEOCODE_URL, params=params, headers=headers, timeout=7)
        print("Final URL    :", resp.url)
        print("Status       :", resp.status_code)
    except requests.exceptions.RequestException as e:
        print(f"!!! [Geocoding] 요청 예외: {e}")
        return None

    if resp.status_code != 200:
        print("Body(text)   :", resp.text)
        return None

    try:
        data = resp.json()
    except ValueError:
        print("!!! [Geocoding] JSON 파싱 실패:", resp.text[:200])
        return None

    addresses = data.get("addresses", [])
    if not addresses:
        print("!!! [Geocoding] 결과 0건:", data)
        return None

    first = addresses[0]
    try:
        x = float(first["x"])  # lon
        y = float(first["y"])  # lat
        return (y, x)
    except (KeyError, ValueError) as e:
        print("!!! [Geocoding] 좌표 파싱 실패:", e, "; payload:", first)
        return None


@router.get("/", response_model=List[schemas.ParticipantResponse])
def list_participants_for_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id에 속한 모든 참가자 목록을 조회합니다.
    """
    participants = (
        db.query(models.Participant)
        .options(joinedload(models.Participant.available_times))
        .filter(models.Participant.meeting_id == meeting_id)
        .all()
    )
    return participants


@router.post("/", response_model=schemas.ParticipantResponse)
def create_participant_for_meeting(
    meeting_id: int,
    participant_in: schemas.ParticipantCreate,
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participant_dict = participant_in.model_dump()
    times_data_list = participant_dict.pop("available_times", [])

    raw_address = participant_dict.get("start_address")
    address = raw_address.strip() if isinstance(raw_address, str) else raw_address
    participant_dict["start_address"] = address

    fav = participant_dict.get("fav_activity")

    has_schedule = len(times_data_list) > 0
    has_origin = bool(address)
    has_pref = bool(fav)

    if not (has_schedule or has_origin or has_pref):
        raise HTTPException(
            status_code=400,
            detail="At least one of schedule, origin or preferences is required.",
        )

    if address:
        coordinates = get_coords_from_address(address)
        if not coordinates:
            raise HTTPException(
                status_code=400,
                detail="Invalid start_address or geocoding failed. (주소 변환 실패)",
            )
        participant_dict["start_latitude"] = coordinates[0]
        participant_dict["start_longitude"] = coordinates[1]
    else:
        participant_dict["start_latitude"] = None
        participant_dict["start_longitude"] = None

    db_participant = models.Participant(
        **participant_dict,
        meeting_id=meeting_id,
    )

    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)

    for time_data in times_data_list:
        db_time = models.ParticipantTime(
            **time_data,
            meeting_id=meeting_id,
            participant_id=db_participant.id,
        )
        db.add(db_time)

    db.commit()

    final_participant = (
        db.query(models.Participant)
        .options(joinedload(models.Participant.available_times))
        .filter(models.Participant.id == db_participant.id)
        .first()
    )

    return final_participant


@router.patch("/{participant_id}", response_model=schemas.ParticipantResponse)
def update_participant(
    meeting_id: int,
    participant_id: int,
    participant_in: schemas.ParticipantUpdate,
    db: Session = Depends(get_db),
):
    """
    특정 participant_id의 참가자 정보 또는
    참가 가능 시간 목록(available_times)을 수정(덮어쓰기)합니다.

    - start_address 가 ""(빈 문자열) 이나 공백이면 주소/위경도 None 으로 초기화
    - start_address 가 유효한 문자열이면 Naver Geocoding 으로 위경도 재계산
    """

    db_participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.id == participant_id,
            models.Participant.meeting_id == meeting_id,
        )
        .first()
    )

    if db_participant is None:
        raise HTTPException(
            status_code=404,
            detail="Participant not found for this meeting",
        )

    update_data = participant_in.model_dump(exclude_unset=True)

    if "start_address" in update_data:
        raw_address = update_data["start_address"]

        if raw_address is None or (
            isinstance(raw_address, str) and raw_address.strip() == ""
        ):
            db_participant.start_address = None
            db_participant.start_latitude = None
            db_participant.start_longitude = None

            update_data.pop("start_address", None)
            update_data.pop("start_latitude", None)
            update_data.pop("start_longitude", None)
        else:
            coordinates = get_coords_from_address(raw_address)
            if not coordinates:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid new start_address or geocoding failed.",
                )

            update_data["start_address"] = raw_address
            update_data["start_latitude"] = coordinates[0]
            update_data["start_longitude"] = coordinates[1]

    if "available_times" in update_data:
        times_data_list = update_data.pop("available_times")

        db_participant.available_times = []
        db.commit()

        for time_data in times_data_list:
            db_time = models.ParticipantTime(
                **time_data,
                meeting_id=db_participant.meeting_id,
                participant_id=db_participant.id,
            )
            db.add(db_time)

    for key, value in update_data.items():
        setattr(db_participant, key, value)

    db.commit()

    final_participant = (
        db.query(models.Participant)
        .options(joinedload(models.Participant.available_times))
        .filter(models.Participant.id == db_participant.id)
        .first()
    )

    return final_participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(
    meeting_id: int,
    participant_id: int,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id에 속한 participant_id의 참가자 정보를 삭제합니다.
    """
    db_participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.id == participant_id,
            models.Participant.meeting_id == meeting_id,
        )
        .first()
    )

    if db_participant is None:
        raise HTTPException(
            status_code=404,
            detail="Participant not found for this meeting",
        )

    db.delete(db_participant)
    db.commit()
    return