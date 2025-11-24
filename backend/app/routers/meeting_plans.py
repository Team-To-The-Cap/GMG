# app/routers/meetings.py


# 1. [추가] HTTPException과 Eager Loading을 위한 joinedload 임포트
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload 
from typing import List

from ..database import get_db
from .. import schemas
from .. import models
from .calc_func import *
from typing import Optional
import requests


NAVER_MAP_CLIENT_ID = "o3qhd1pz6i"
NAVER_MAP_CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"

CLIENT_ID = "o3qhd1pz6i"
CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"

router = APIRouter(
    prefix="/meetings",
    tags=["Meeting-Plans"]
)



def reverse_geocode_naver(lon: float, lat: float) -> Optional[str]:
    """
    네이버 Reverse Geocoding API를 사용해서
    (lon, lat) → 한글 주소 문자열로 변환.

    실패하면 None 반환.
    """
    if not NAVER_MAP_CLIENT_ID or not NAVER_MAP_CLIENT_SECRET:
        # 키 설정 안 된 경우
        return None

    url = "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc"
    # Naver는 coords = "경도,위도" (x,y)
    params = {
        "coords": f"{lon},{lat}",
        "sourcecrs": "epsg:4326",             # WGS84 (osmnx 기본)
        "orders": "addr,roadaddr,admcode",    # 필요한 형식들
        "output": "json",
    }
    headers = {
        "X-NCP-APIGW-API-KEY-ID": NAVER_MAP_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": NAVER_MAP_CLIENT_SECRET,
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=3)
        resp.raise_for_status()
    except Exception as e:
        # TODO: 필요하면 로그 찍기
        print("Naver reverse geocode error:", e)
        return None

    data = resp.json()

    try:
        results = data.get("results", [])
        if not results:
            return None

        # 가장 첫 번째 결과 사용
        r0 = results[0]
        region = r0.get("region", {})
        land = r0.get("land", {})

        # 행정구역 이름들
        area1 = region.get("area1", {}).get("name")  # 시/도
        area2 = region.get("area2", {}).get("name")  # 시/군/구
        area3 = region.get("area3", {}).get("name")  # 동/읍/면
        area4 = region.get("area4", {}).get("name")  # 리 등

        # 도로명/지번 등
        land_name = land.get("name")                 # 도로명 or 지번 이름
        number1 = land.get("number1")
        number2 = land.get("number2")

        # 간단히 조합 (필요하면 포맷 더 다듬어도 됨)
        parts = [area1, area2, area3, area4, land_name]
        addr = " ".join(p for p in parts if p)

        if number1:
            if number2:
                addr = f"{addr} {number1}-{number2}"
            else:
                addr = f"{addr} {number1}"

        return addr or None
    except Exception as e:
        print("Naver reverse geocode parse error:", e)
        return None


@router.post("/{meeting_id}/plans", response_model=schemas.MeetingPlanResponse)
def create_plan_for_meeting(
    meeting_id: int,
    plan_in: schemas.MeetingPlanCreate,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id에 연결된 새로운 Meeting_Plan (상세 일정)을 생성합니다.
    - meeting_time 이 없어도(미정이어도) Plan 을 만들 수 있음.
    """
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.id == meeting_id)
        .first()
    )
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    db_plan = models.MeetingPlan(
        **plan_in.model_dump(),
        meeting_id=meeting_id,
    )

    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/{meeting_id}/plans", response_model=schemas.MeetingPlanResponse) 
def get_plans_for_meeting(
    meeting_id: int, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 모든 Meeting_Plans (상세 일정) 목록을 조회합니다.
    """
    
    plan = db.query(models.MeetingPlan).filter(
        models.MeetingPlan.meeting_id == meeting_id
    ).first()
    
    # 3. [추가] Plan이 없는 경우 404 에러 반환
    if plan is None:
        raise HTTPException(status_code=404, detail="Meeting plan not found for this meeting")
        
    # 4. [수정] 조회된 단일 plan 객체 반환
    return plan


@router.patch(
    "/{meeting_id}/plans", # [수정] {plan_id} 제거
    response_model=schemas.MeetingPlanResponse
)
def update_meeting_plan(
    meeting_id: int, # [수정] {plan_id} 제거
    plan_in: schemas.MeetingPlanUpdate,
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 속한 "유일한" 상세 일정을 수정합니다.
    """
    # [수정] 쿼리 변경 (meeting_id로만 조회)
    db_plan = db.query(models.MeetingPlan).filter(
        models.MeetingPlan.meeting_id == meeting_id
    ).first()

    if db_plan is None:
        raise HTTPException(status_code=404, detail="Meeting plan not found for this meeting")
    
    update_data = plan_in.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_plan, key, value)
            
    db.commit()
    db.refresh(db_plan)
    return db_plan




@router.post(
    "/{meeting_id}/plans/calculate",
    response_model=schemas.MeetingPlanResponse,
)
def create_auto_plan_for_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    meeting_id 기준으로:

    1) Meeting + Participant + ParticipantTime 정보를 조회하고
    2) 공통 가능한 날짜(date 리스트)를 계산한 뒤 (없어도 OK)
    3) 참가자 출발 좌표로 도로 그래프 중간 지점을 계산하고
    4) MeetingPlan + MeetingPlanAvailableDate 들을 DB에 저장,
    5) 최종 MeetingPlan(available_dates 포함)을 반환.
    """

    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants),
            joinedload(models.Meeting.participant_times),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.participants:
        raise HTTPException(status_code=400, detail="No participants in this meeting")

    # 1) 공통 가능한 날짜 계산
    common_dates = get_common_available_dates_for_meeting(meeting)

    # ★ 공통 날짜가 있으면 "가장 이른 날짜 + 19:00",
    #   없으면 meeting_time 은 None (일정 미정 상태)
    if common_dates:
        earliest_date = common_dates[0]
        meeting_time = datetime.combine(earliest_date, time(hour=19, minute=0))
    else:
        meeting_time = None

    # 2) 참가자 출발 좌표 수집 (기존 그대로)
    coords: List[Tuple[float, float]] = []
    for p in meeting.participants:
        if p.start_latitude is None or p.start_longitude is None:
            continue
        coords.append((p.start_longitude, p.start_latitude))

    if not coords:
        raise HTTPException(
            status_code=400,
            detail="No participants with valid start_latitude/start_longitude",
        )

    # 3) 도로 그래프 위 중간 지점 계산
    center_result = find_road_center_node(
        G,
        coords_lonlat=coords,
        weight="length",
        return_paths=True,
        top_k=3,
    )
    print(center_result)

    center_lat = float(center_result["lat"])
    center_lon = float(center_result["lon"])

    addr = reverse_geocode_naver(center_lon, center_lat)
    if addr is None:
        addr = "자동 계산된 중간 지점"

    # 4) MeetingPlan 생성 or 업데이트
    db_plan = (
        db.query(models.MeetingPlan)
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    if db_plan is None:
        db_plan = models.MeetingPlan(
            meeting_id=meeting_id,
            meeting_time=meeting_time,  # ★ None 허용
            address=addr,
            latitude=center_lat,
            longitude=center_lon,
            total_time=None,
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
    else:
        db_plan.meeting_time = meeting_time
        db_plan.address = addr
        db_plan.latitude = center_lat
        db_plan.longitude = center_lon
        db.commit()
        db.refresh(db_plan)

    # 5) MeetingPlanAvailableDate 갱신
    db.query(models.MeetingPlanAvailableDate).filter(
        models.MeetingPlanAvailableDate.meeting_plan_id == db_plan.id
    ).delete()
    db.commit()

    # ★ 공통 날짜가 있을 때만 available_dates 채우기
    if common_dates:
        for d in common_dates:
            db_date = models.MeetingPlanAvailableDate(
                meeting_plan_id=db_plan.id,
                date=d,
            )
            db.add(db_date)

        db.commit()
        db.refresh(db_plan)

    return db_plan

@router.post(
    "/{meeting_id}/plans/calculate",
    response_model=schemas.MeetingPlanResponse,
)
def create_auto_plan_for_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    meeting_id 기준으로:

    1) Meeting + Participant + ParticipantTime 정보를 조회하고
    2) 공통 가능한 날짜(date 리스트)를 계산한 뒤
    3) 참가자 출발 좌표로 도로 그래프 중간 지점을 계산하고
    4) MeetingPlan + MeetingPlanAvailableDate 들을 DB에 저장,
    5) 최종 MeetingPlan(available_dates 포함)을 반환.
    """

    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants),
            joinedload(models.Meeting.participant_times),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.participants:
        raise HTTPException(status_code=400, detail="No participants in this meeting")

    # 1) 공통 가능한 날짜 계산
    common_dates = get_common_available_dates_for_meeting(meeting)
    if not common_dates:
        raise HTTPException(
            status_code=400,
            detail="No common available dates for all participants",
        )

    # 일단 가장 이른 날짜 + 19:00 을 meeting_time 기본값으로 사용
    earliest_date = common_dates[0]
    meeting_time = datetime.combine(earliest_date, time(hour=19, minute=0))

    # 2) 참가자 출발 좌표 수집
    coords: List[Tuple[float, float]] = []
    for p in meeting.participants:
        if p.start_latitude is None or p.start_longitude is None:
            continue
        # (lon, lat) 순서
        coords.append((p.start_longitude, p.start_latitude))

    if not coords:
        raise HTTPException(
            status_code=400,
            detail="No participants with valid start_latitude/start_longitude",
        )

    # 3) 도로 그래프 위 중간 지점 계산
    center_result = find_road_center_node(
        G,
        coords_lonlat=coords,    # (lon, lat) 리스트
        weight="length",         # 또는 "travel_time" (원하는 기준으로 고정)
        return_paths=True,
        top_k=3,                 # 상위 3개 후보까지 계산
    )
    print(center_result)

    # 대표 center는 기존대로 하나 사용
    center_lat = float(center_result["lat"])
    center_lon = float(center_result["lon"])

    # 🔥 네이버 Reverse Geocode로 한글 주소 구하기
    addr = reverse_geocode_naver(center_lon, center_lat)
    if addr is None:
        addr = "자동 계산된 중간 지점"  # fallback 문구

    # 4) MeetingPlan 생성 or 업데이트
    db_plan = (
        db.query(models.MeetingPlan)
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    if db_plan is None:
        db_plan = models.MeetingPlan(
            meeting_id=meeting_id,
            meeting_time=meeting_time,
            address=addr,
            latitude=center_lat,
            longitude=center_lon,
            total_time=None,
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
    else:
        db_plan.meeting_time = meeting_time
        db_plan.address = addr
        db_plan.latitude = center_lat
        db_plan.longitude = center_lon
        db.commit()
        db.refresh(db_plan)

    # 5) MeetingPlanAvailableDate 갱신
    db.query(models.MeetingPlanAvailableDate).filter(
        models.MeetingPlanAvailableDate.meeting_plan_id == db_plan.id
    ).delete()
    db.commit()

    for d in common_dates:
        db_date = models.MeetingPlanAvailableDate(
            meeting_plan_id=db_plan.id,
            date=d,
        )
        db.add(db_date)

    db.commit()
    db.refresh(db_plan)  # available_dates까지 포함해서 다시 로딩

    return db_plan