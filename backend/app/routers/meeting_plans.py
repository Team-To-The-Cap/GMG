# app/routers/meeting_plans.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Tuple
from datetime import datetime, date, time, timedelta  # ⬅️ 사용 중

from ..database import get_db
from .. import schemas
from .. import models
from .calc_func import *  # find_road_center_node, save_calculated_places 등
from .calc_func import G  # 그래프 import
from typing import Optional
import requests

from ..services.google_distance_matrix import compute_minimax_travel_times

NAVER_MAP_CLIENT_ID = "o3qhd1pz6i"
NAVER_MAP_CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"

CLIENT_ID = "o3qhd1pz6i"
CLIENT_SECRET = "CgU14l9YJBqqNetcd8KiZ0chNLJmYBwmy9HkAjg5"

router = APIRouter(prefix="/meetings", tags=["Meeting-Plans"])


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
        "sourcecrs": "epsg:4326",  # WGS84 (osmnx 기본)
        "orders": "addr,roadaddr,admcode",  # 필요한 형식들
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
        land_name = land.get("name")  # 도로명 or 지번 이름
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
        .options(
            # 참가자 + 참가자별 available_times 까지 한번에 로드하고 싶으면:
            joinedload(models.Meeting.participants).joinedload(
                models.Participant.available_times
            ),
            # Meeting.plan + plan.available_dates 까지 eager load
            joinedload(models.Meeting.plan).joinedload(
                models.MeetingPlan.available_dates
            ),
        )
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
def get_plans_for_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """
    특정 meeting_id에 연결된 모든 Meeting_Plans (상세 일정) 목록을 조회합니다.
    """

    plan = (
        db.query(models.MeetingPlan)
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    # 3. [추가] Plan이 없는 경우 404 에러 반환
    if plan is None:
        raise HTTPException(
            status_code=404, detail="Meeting plan not found for this meeting"
        )

    # 4. [수정] 조회된 단일 plan 객체 반환
    return plan


@router.patch(
    "/{meeting_id}/plans",  # [수정] {plan_id} 제거
    response_model=schemas.MeetingPlanResponse,
)
def update_meeting_plan(
    meeting_id: int,  # [수정] {plan_id} 제거
    plan_in: schemas.MeetingPlanUpdate,
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id에 속한 "유일한" 상세 일정을 수정합니다.
    """
    # [수정] 쿼리 변경 (meeting_id로만 조회)
    db_plan = (
        db.query(models.MeetingPlan)
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    if db_plan is None:
        raise HTTPException(
            status_code=404, detail="Meeting plan not found for this meeting"
        )

    update_data = plan_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_plan, key, value)

    db.commit()
    db.refresh(db_plan)
    return db_plan


def get_common_available_dates_for_meeting(meeting: models.Meeting) -> List[date]:
    """
    특정 Meeting에 대해, 각 참가자의 ParticipantTime(start_time ~ end_time)을
    날짜 단위로 풀어서(set으로) 만든 뒤, 그 교집합(공통 날짜)만 반환한다.

    예)
    - P1: 18~20 → {18,19,20}
    - P2: 19~20 → {19,20}
      => 공통: {19,20}
    """

    # 참가자별 가능한 날짜 집합
    from typing import Dict, Set

    dates_by_participant: Dict[int, Set[date]] = {}

    for p in meeting.participants:
        dates: Set[date] = set()

        for t in p.available_times:
            start_d = t.start_time.date()
            end_d = t.end_time.date()
            # 안전장치: 혹시 end < start 로 들어오면 swap
            if end_d < start_d:
                start_d, end_d = end_d, start_d

            d = start_d
            while d <= end_d:
                dates.add(d)
                d = d + timedelta(days=1)

        if dates:
            dates_by_participant[p.id] = dates

    # 이 미팅에서 실제로 "시간을 입력한" 참가자가 한 명도 없으면 공통 날짜 없음
    if not dates_by_participant:
        return []

    participant_ids_with_times = list(dates_by_participant.keys())

    # 한 명만 시간 입력한 경우: 그 사람 날짜를 그대로 반환
    if len(participant_ids_with_times) == 1:
        only_pid = participant_ids_with_times[0]
        return sorted(dates_by_participant[only_pid])

    # 두 명 이상인 경우: 날짜 교집합
    common: Set[date] | None = None
    for pid in participant_ids_with_times:
        ds = dates_by_participant[pid]
        if common is None:
            common = set(ds)
        else:
            common &= ds
        if not common:
            break

    return sorted(common) if common else []


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

    1) Meeting + Participant + ParticipantTime 조회
    2) 공통 가능한 날짜(date 리스트) 계산
    3) 출발 좌표 있는 참가자만 모아서 도로 그래프 중간 지점 + 후보 장소 계산
       (1차: OSMnx minimax / 2차: Google Distance Matrix로 공평성 보정)
    4) MeetingPlan + MeetingPlanAvailableDate 저장
    5) MeetingPlace(places) 저장
    6) 최종 MeetingPlan(available_dates 포함)을 반환
    """

    # 1. Meeting + 참가자 + 참가자별 available_times + places 로드
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants).joinedload(
                models.Participant.available_times
            ),
            joinedload(models.Meeting.places),  # 코스 초기화를 위해 places도 로드
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.participants:
        raise HTTPException(status_code=400, detail="No participants in this meeting")

    # 2. 공통 가능한 날짜 계산
    common_dates = get_common_available_dates_for_meeting(meeting)

    if common_dates:
        earliest_date = common_dates[0]
        meeting_time = datetime.combine(earliest_date, time(hour=19, minute=0))
    else:
        # 공통 날짜가 전혀 없는 경우: 시간 미정으로 두고 계속 진행
        meeting_time = None

    # 3. 출발 좌표 모으기 (lon, lat) + 하이브리드용 participant 정보
    coords: List[Tuple[float, float]] = []
    participant_for_matrix: List[dict] = []

    for p in meeting.participants:
        if p.start_latitude is None or p.start_longitude is None:
            continue

        coords.append((p.start_longitude, p.start_latitude))  # (lon, lat)
        participant_for_matrix.append(
            {
                "lat": p.start_latitude,
                "lng": p.start_longitude,
                "transportation": p.transportation,
            }
        )

    center_lat: float | None = None
    center_lon: float | None = None
    addr: str = ""

    candidates: list[dict] = []  # MeetingPlace로 저장할 후보들
    print(
        f"[DEBUG] Starting plan calculation for meeting_id={meeting_id}, total_participants={len(meeting.participants)}, with_coordinates={len(coords)}"
    )

    if coords:
        print(f"[DEBUG] Found {len(coords)} participant coordinates")
        # 3-0. 그래프 범위 확인 (서울 그래프는 서울 지역만 커버)
        # 입력 좌표가 그래프 범위 밖이면 단순 지리적 중심점 사용
        try:
            # 3-1. 도로 그래프 위 minimax center + top_k 후보 계산 (1차 후보 생성)
            center_result = find_road_center_node(
                G,
                coords_lonlat=coords,
                weight="length",
                return_paths=True,
                top_k=3,  # 상위 3개 후보까지
            )
            print(f"[DEBUG] center_result: {center_result}")
        except (RuntimeError, ValueError, Exception) as e:
            # 그래프 범위 밖이거나 경로를 찾을 수 없는 경우 지리적 중심점 사용
            print(f"[WARNING] Graph-based calculation failed: {e}")
            print("[WARNING] Falling back to geographic center calculation")

            # 단순 지리적 중심점 계산 (위도/경도의 평균)
            center_lat = sum(lat for _, lat in coords) / len(coords)
            center_lon = sum(lon for lon, _ in coords) / len(coords)

            # 역지오코딩으로 주소 가져오기
            resolved = reverse_geocode_naver(center_lon, center_lat)
            addr = resolved or "자동 계산된 중간 지점"

            # 단일 후보 생성
            candidates.append(
                {
                    "name": "자동 추천 만남 장소",
                    "poi_name": None,
                    "address": addr,
                    "lat": center_lat,
                    "lng": center_lon,
                    "category": "meeting_point",
                    "duration": None,
                }
            )

            # MeetingPlan 업데이트를 위한 값 설정
            center_lat_val = center_lat
            center_lon_val = center_lon
            addr_val = addr
        else:
            # 정상적으로 계산된 경우 기존 로직 계속

            # 대표 center (보정 전)
            raw_center_lat = float(center_result["lat"])
            raw_center_lon = float(center_result["lon"])

            # 대표 center에 대해 한 번 보정
            adjusted_main = center_result.get("adjusted_point") or {}
            raw_adjusted_lat = float(adjusted_main.get("lat", raw_center_lat))
            raw_adjusted_lon = float(adjusted_main.get("lng", raw_center_lon))

            # top_k 후보들
            top_candidates_raw = center_result.get("top_candidates") or []

            # 3-2. 각 후보를 "보정된 좌표" 기준으로 center 후보 리스트로 구성
            center_candidates: List[dict] = []

            if top_candidates_raw:
                for cand in top_candidates_raw:
                    adj = cand.get("adjusted_point") or {}
                    lat = float(adj.get("lat", cand["lat"]))
                    lng = float(adj.get("lng", cand["lon"]))
                    poi_name = adj.get("poi_name")

                    center_candidates.append(
                        {
                            "lat": lat,
                            "lng": lng,
                            "poi_name": poi_name,
                        }
                    )
            else:
                # fallback: 대표 center 하나만 후보로
                center_candidates.append(
                    {
                        "lat": raw_adjusted_lat,
                        "lng": raw_adjusted_lon,
                        "poi_name": adjusted_main.get("poi_name"),
                    }
                )

            # 3-3. Google Distance Matrix로 공평한 center 재선택 (하이브리드)
            best_center_lat = raw_adjusted_lat
            best_center_lon = raw_adjusted_lon
            best_index = 0

            if participant_for_matrix and center_candidates:
                dm_result = compute_minimax_travel_times(
                    participants=participant_for_matrix,
                    candidates=center_candidates,
                )
                if dm_result is not None:
                    best_index = dm_result["best_index"]
                    chosen = center_candidates[best_index]
                    best_center_lat = float(chosen["lat"])
                    best_center_lon = float(chosen["lng"])

            # 최종 center 좌표
            center_lat = best_center_lat
            center_lon = best_center_lon

            # 대표 center 기준으로 한 번만 역지오코딩 수행
            resolved = reverse_geocode_naver(center_lon, center_lat)
            addr = resolved or "자동 계산된 중간 지점"

            # 3-4. MeetingPlace candidates 생성
            #     - Google minimax 기준으로 고른 best_index가 "주요 만남 장소"
            #     - 나머지는 후보 #2, #3 ...
            for idx, c in enumerate(center_candidates):
                lat = float(c["lat"])
                lng = float(c["lng"])
                poi_name = c.get("poi_name")

                if idx == best_index:
                    place_name = "자동 추천 만남 장소"
                else:
                    place_name = f"자동 추천 후보 #{idx+1}"

                candidates.append(
                    {
                        "name": place_name,  # UI 라벨
                        "poi_name": poi_name,  # 카드 큰 제목용
                        "address": addr,  # 대표 center 기준 주소 공통 사용
                        "lat": lat,
                        "lng": lng,
                        "category": "meeting_point",
                        "duration": None,
                    }
                )

            # 정상 계산된 경우 center_lat, center_lon, addr 사용
            center_lat_val = center_lat
            center_lon_val = center_lon
            addr_val = addr
            print(
                f"[DEBUG] Successfully calculated {len(candidates)} candidates from graph"
            )
    else:
        # 출발 좌표가 하나도 없으면 장소/후보 없음
        addr_val = ""
        center_lat_val = None
        center_lon_val = None
        candidates = []
        print("[DEBUG] No coordinates found, candidates will be empty")

    # 4. MeetingPlan 생성 or 업데이트
    db_plan = (
        db.query(models.MeetingPlan)
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    if db_plan is None:
        db_plan = models.MeetingPlan(
            meeting_id=meeting_id,
            meeting_time=meeting_time,
            address=addr_val,
            latitude=center_lat_val,
            longitude=center_lon_val,
            total_time=None,
        )
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
    else:
        db_plan.meeting_time = meeting_time
        db_plan.address = addr_val
        db_plan.latitude = center_lat_val
        db_plan.longitude = center_lon_val
        db.commit()
        db.refresh(db_plan)

    # 5. MeetingPlanAvailableDate 갱신
    db.query(models.MeetingPlanAvailableDate).filter(
        models.MeetingPlanAvailableDate.meeting_plan_id == db_plan.id
    ).delete()
    db.commit()

    if common_dates:
        for d in common_dates:
            db_date = models.MeetingPlanAvailableDate(
                meeting_plan_id=db_plan.id,
                date=d,
            )
            db.add(db_date)
        db.commit()

    # 6. ✅ 일정/장소 계산 시 코스 장소만 유지하고, meeting_point 장소는 새로 계산된 것으로 교체
    # 중간 계산을 다시 하면 기존 코스 정보는 모두 삭제됩니다.
    # 코스는 별도의 "코스 계산하기" 버튼을 통해 다시 추가해야 합니다.

    # 기존 meeting_point 장소만 삭제 (코스 장소는 그대로 유지)
    db.query(models.MeetingPlace).filter(
        models.MeetingPlace.meeting_id == meeting_id,
        models.MeetingPlace.category == "meeting_point",
    ).delete(synchronize_session=False)
    db.commit()

    # 새로 계산된 meeting_point 장소들 저장
    print(
        f"[DEBUG] Before saving: candidates count={len(candidates)}, candidates={candidates}"
    )
    if candidates:
        print(
            f"[DEBUG] Saving {len(candidates)} candidates for meeting_id={meeting_id}"
        )
        new_places: list[models.MeetingPlace] = []
        for c in candidates:
            db_place = models.MeetingPlace(
                meeting_id=meeting_id,
                name=c["name"],
                latitude=c["lat"],
                longitude=c["lng"],
                address=c["address"],
                category=c.get("category", "meeting_point"),
                duration=c.get("duration"),
                poi_name=c.get("poi_name"),
            )
            db.add(db_place)
            new_places.append(db_place)

        db.commit()
        for p in new_places:
            db.refresh(p)
        print(f"[DEBUG] Saved {len(new_places)} meeting places")
        print(
            f"[DEBUG] Saved places details: {[(p.name, p.category, p.latitude, p.longitude) for p in new_places]}"
        )

        # 저장 확인: 실제로 DB에 저장되었는지 확인
        saved_count = (
            db.query(models.MeetingPlace)
            .filter(
                models.MeetingPlace.meeting_id == meeting_id,
                models.MeetingPlace.category == "meeting_point",
            )
            .count()
        )
        print(
            f"[DEBUG] Verification: Found {saved_count} meeting_point places in DB after save"
        )
    else:
        print(f"[WARNING] No candidates to save! candidates={candidates}")
        print(f"[WARNING] This means either:")
        print(f"[WARNING]   1. coords was empty (no participants with coordinates)")
        print(
            f"[WARNING]   2. Graph calculation failed AND fallback didn't create candidates"
        )
        print(f"[WARNING]   3. else block (normal calculation) didn't execute")

    # 7. available_dates까지 포함해서 MeetingPlan 다시 로딩해서 반환
    plan_full = (
        db.query(models.MeetingPlan)
        .options(
            joinedload(models.MeetingPlan.available_dates),
        )
        .filter(models.MeetingPlan.meeting_id == meeting_id)
        .first()
    )

    return plan_full
