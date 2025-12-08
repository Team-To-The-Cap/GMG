# app/routers/participants.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

import requests

from ..database import get_db
from .. import schemas
from .. import models

router = APIRouter(
    prefix="/meetings/{meeting_id}/participants",
    tags=["Participants"],
)

# 🔹 Naver Geocoding (APIGW) 인증 정보
#    - 여기 값은 실제 사용 중인 APIGW 키로 유지
CLIENT_ID = "o3qhd1pz6i"
CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"
GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"


def get_coords_from_address(address: str):
    """
    Naver Geocoding API를 호출하여 주소로부터 (위도, 경도)를 반환합니다.
    성공 시 (lat, lon) 튜플, 실패 시 None.
    """
    headers = {
        "X-NCP-APIGW-API-KEY-ID": CLIENT_ID,
        "X-NCP-APIGW-API-KEY": CLIENT_SECRET,
        "Accept": "application/json",
    }
    params = {"query": address}

    print("--- [Geocoding Debug] ---")
    print("Endpoint     :", GEOCODE_URL)
    print("Query        :", address)
    print("ClientID tail:", CLIENT_ID[-4:] if CLIENT_ID else "None")
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

    # 주소 정리
    raw_address = participant_dict.get("start_address")
    address = raw_address.strip() if isinstance(raw_address, str) else raw_address
    participant_dict["start_address"] = address

    # 프론트에서 미리 넘겨준 좌표 (옵션 A)
    lat = participant_dict.pop("start_latitude", None)
    lng = participant_dict.pop("start_longitude", None)

    fav = participant_dict.get("fav_activity")

    has_schedule = len(times_data_list) > 0
    has_origin = bool(address or (lat is not None and lng is not None))
    has_pref = bool(fav)

    if not (has_schedule or has_origin or has_pref):
        raise HTTPException(
            status_code=400,
            detail="At least one of schedule, origin or preferences is required.",
        )

    # 1) 좌표가 이미 들어온 경우 → 그대로 사용 (지오코딩 생략)
    if lat is not None and lng is not None:
        participant_dict["start_latitude"] = lat
        participant_dict["start_longitude"] = lng

    # 2) 좌표는 없지만 주소가 있는 경우 → 지오코딩 시도 (실패해도 주소만 저장)
    elif address:
        coordinates = get_coords_from_address(address)
        if coordinates:
            participant_dict["start_latitude"] = coordinates[0]
            participant_dict["start_longitude"] = coordinates[1]
        else:
            # ❗ 지오코딩 실패: 주소는 그대로 두고, 좌표는 None 처리 (에러 X)
            print(
                f"!!! [Geocoding] 주소는 있으나 좌표 변환 실패 → "
                f"address='{address}', lat/lng=None 로 저장"
            )
            participant_dict["start_latitude"] = None
            participant_dict["start_longitude"] = None

    # 3) 둘 다 없는 경우 → None
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
    - start_address + 위경도(start_latitude/longitude)가 같이 들어오면 그대로 사용
    - 좌표 없이 주소만 들어오면 Naver Geocoding 으로 위경도 재계산 (실패 시 좌표 None으로 저장)
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

    # ───────── 주소/좌표 처리 ─────────
    if (
        "start_address" in update_data
        or "start_latitude" in update_data
        or "start_longitude" in update_data
    ):
        raw_address = update_data.get("start_address", db_participant.start_address)
        lat_in = update_data.get("start_latitude", None)
        lng_in = update_data.get("start_longitude", None)

        # 1) 주소를 비우는 경우 → 주소 + 좌표 모두 초기화
        if raw_address is None or (
            isinstance(raw_address, str) and raw_address.strip() == ""
        ):
            db_participant.start_address = None
            db_participant.start_latitude = None
            db_participant.start_longitude = None

        else:
            address = raw_address.strip()

            # (1) 주소 + 좌표가 함께 온 경우 → 그대로 사용
            if lat_in is not None and lng_in is not None:
                db_participant.start_address = address
                db_participant.start_latitude = lat_in
                db_participant.start_longitude = lng_in

            # (2) 좌표 없이 주소만 온 경우 → 지오코딩 시도 (실패해도 주소만 저장)
            else:
                coordinates = get_coords_from_address(address)
                if coordinates:
                    db_participant.start_address = address
                    db_participant.start_latitude = coordinates[0]
                    db_participant.start_longitude = coordinates[1]
                else:
                    print(
                        f"!!! [Geocoding] PATCH 주소만 갱신, 좌표 변환 실패 → "
                        f"address='{address}', lat/lng=None 로 저장"
                    )
                    db_participant.start_address = address
                    db_participant.start_latitude = None
                    db_participant.start_longitude = None

        # 이미 직접 처리했으니 나머지 공통 루프에서 또 반영 안 되게 제거
        update_data.pop("start_address", None)
        update_data.pop("start_latitude", None)
        update_data.pop("start_longitude", None)

    # ───────── available_times 처리 ─────────
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

    # ───────── 나머지 필드 공통 처리 ─────────
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