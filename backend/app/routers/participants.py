# 1. [수정] HTTPException, status 임포트
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List


# [신규] Naver API 호출을 위한 requests 임포트
import requests 

from ..database import get_db
from .. import schemas
from .. import models

# 2. [수정] 라우터 prefix 변경 (계층적 구조)
router = APIRouter(
    prefix="/meetings/{meeting_id}/participants", 
    tags=["Participants"]              
)


CLIENT_ID = "o3qhd1pz6i"
CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"
GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"

def get_coords_from_address(address: str):
    """
    Naver Geocoding API를 호출하여 주소로부터 (위도, 경도)를 반환합니다.
    성공 시 (lat, lon) 튜플, 실패 시 None.
    """
    headers = {
        "X-NCP-APIGW-API-KEY-ID": "o3qhd1pz6i",
        "X-NCP-APIGW-API-KEY": "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5",
        "Accept": "application/json",
    }   
    params = {"query": address}

    # ▶ 민감정보는 출력하지 말고 끝자리만 확인
    print("--- [Geocoding Debug] ---")
    print("Endpoint     :", GEOCODE_URL)
    print("Query        :", address)
    print(CLIENT_ID)
    print("ClientID tail:", CLIENT_SECRET[-6:] if CLIENT_ID else "None")
    print("-------------------------")

    try:
        resp = requests.get(GEOCODE_URL, params=params, headers=headers, timeout=7)
        print("Final URL    :", resp.url)
        print("Status       :", resp.status_code)
    except requests.exceptions.RequestException as e:
        print(f"!!! [Geocoding] 요청 예외: {e}")
        return None

    # 4xx/5xx 상세 바디 출력
    if resp.status_code != 200:
        print("Body(text)   :", resp.text)
        return None

    # 정상 파싱
    try:
        data = resp.json()
    except ValueError:
        print("!!! [Geocoding] JSON 파싱 실패:", resp.text[:200])
        return None

    # addresses가 비었는지 검사
    addresses = data.get("addresses", [])
    if not addresses:
        print("!!! [Geocoding] 결과 0건:", data)
        return None

    first = addresses[0]
    # Naver: x=경도(lon), y=위도(lat)
    try:
        x = float(first["x"])
        y = float(first["y"])
        return (y, x)
    except (KeyError, ValueError) as e:
        print("!!! [Geocoding] 좌표 파싱 실패:", e, "; payload:", first)
        return None


# 4. [수정] POST / (새 참가자 및 시간 중첩 생성)
@router.post("/", response_model=schemas.ParticipantResponse)
def create_participant_for_meeting(
    meeting_id: int,
    participant_in: schemas.ParticipantCreate,
    db: Session = Depends(get_db)
):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participant_dict = participant_in.model_dump()
    times_data_list = participant_dict.pop("available_times", [])

    address = participant_dict.get("start_address")
    fav = participant_dict.get("fav_activity")

    # 🔹 서버에서도 최소 한 개는 확인 (이름 + (일정/장소/선호))
    has_schedule = len(times_data_list) > 0
    has_origin = bool(address)
    has_pref = bool(fav)

    if not (has_schedule or has_origin or has_pref):
        raise HTTPException(
            status_code=400,
            detail="At least one of schedule, origin or preferences is required.",
        )

    # 🔹 주소가 있으면 지오코딩, 없으면 위경도는 None
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

    # 🔹 일정 있으면 ParticipantTime 생성, 없으면 스킵
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
    db: Session = Depends(get_db)
):
    """
    특정 participant_id의 참가자 정보 또는
    참가 가능 시간 목록(available_times)을 수정(덮어쓰기)합니다.
    [수정] start_address가 변경되면 위도/경도를 다시 계산합니다.
    """
    
    # 1. DB에서 원본 Participant 조회 (meeting_id 검증 포함)
    db_participant = db.query(models.Participant).filter(
        models.Participant.id == participant_id,
        models.Participant.meeting_id == meeting_id 
    ).first()
    
    if db_participant is None:
        raise HTTPException(status_code=404, detail="Participant not found for this meeting")
        
    # 2. Pydantic 모델을 딕셔너리로 변환 (클라이언트가 보낸 필드만)
    update_data = participant_in.model_dump(exclude_unset=True)
    
    # 3. [신규] 'start_address'가 업데이트 목록에 있는지 확인
    if "start_address" in update_data:
        address = update_data["start_address"]
        if not address:
             raise HTTPException(status_code=400, detail="start_address cannot be set to empty.")

        # Geocoding 수행
        coordinates = get_coords_from_address(address)
        if not coordinates:
            raise HTTPException(
                status_code=400, 
                detail="Invalid new start_address or geocoding failed."
            )
        
        # [신규] update_data 딕셔너리에 위경도 값 추가/덮어쓰기
        update_data["start_latitude"] = coordinates[0]
        update_data["start_longitude"] = coordinates[1]
        
    
    # 4. [기존] 'available_times'가 요청에 포함되었는지 확인
    if "available_times" in update_data:
        # 4a. 'available_times' 목록을 딕셔너리에서 분리
        times_data_list = update_data.pop("available_times")
        
        # 4b. [핵심] 기존의 모든 참가 시간(ParticipantTime) 삭제
        db_participant.available_times = []
        db.commit() # (삭제를 먼저 반영)

        # 4c. 새 시간 목록으로 재생성
        for time_data in times_data_list:
            db_time = models.ParticipantTime(
                **time_data,
                meeting_id=db_participant.meeting_id,
                participant_id=db_participant.id
            )
            db.add(db_time)

    # 5. [기존] 'name' 등 Participant의 (Geocoding으로 수정된 위경도 포함) 나머지 필드 업데이트
    for key, value in update_data.items():
        setattr(db_participant, key, value)
        
    # 6. DB에 모든 변경 사항 커밋 (UPDATE 및 INSERT 실행)
    db.commit()
    
    # 7. 수정된 최종 객체를 (관계 포함하여) 다시 조회 후 반환
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