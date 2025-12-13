# app/services/course_builder.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional, Dict
import json

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models
from ..routers.calc_func import save_calculated_places
from ..routers.course import (
    StepInput,
    CourseRequest,
    CourseResponse,
    plan_courses_internal,
)


@dataclass
class MeetingContext:
    meeting: models.Meeting
    plan: Optional[models.MeetingPlan]
    must_visit_places: List[models.MeetingMustVisitPlace]
    participants: List[models.Participant]
    common_dates: List[date]
    center_lat: Optional[float]
    center_lng: Optional[float]


def _build_common_dates(meeting: models.Meeting) -> List[date]:
    dates: set[date] = set()

    for p in meeting.participants:
        for t in p.available_times:
            d = t.start_time.date()
            dates.add(d)

    return sorted(dates)


def load_meeting_context(db: Session, meeting_id: int) -> MeetingContext:
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants)
            .joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan)
            .joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    plan = meeting.plan
    common_dates = _build_common_dates(meeting)
    center_lat = plan.latitude if plan else None
    center_lng = plan.longitude if plan else None

    return MeetingContext(
        meeting=meeting,
        plan=plan,
        must_visit_places=meeting.must_visit_places,
        participants=meeting.participants,
        common_dates=common_dates,
        center_lat=center_lat,
        center_lng=center_lng,
    )


# ----------------------------------------
# 1) 프로필 → Step(1/2/3 코스) 설계
# ----------------------------------------

def _normalize_list_field(value: Optional[str]) -> List[str]:
    """
    Meeting.vibe / Meeting.purpose 처럼 comma-separated 로 들어올 수 있는 필드를
    소문자 리스트로 변환.
    """
    if not value:
        return []
    return [v.strip().lower() for v in value.split(",") if v.strip()]


def _parse_subcategories(participants: List[models.Participant]) -> Dict[str, List[str]]:
    """
    참가자들의 fav_subcategories JSON을 파싱하여 
    메인 카테고리별 서브 카테고리 리스트를 반환.
    """
    all_subcats: Dict[str, List[str]] = {}
    
    for p in participants:
        if not p.fav_subcategories:
            continue
        
        try:
            subcats_dict = json.loads(p.fav_subcategories)
            if isinstance(subcats_dict, dict):
                for main_cat, subcats in subcats_dict.items():
                    if isinstance(subcats, list):
                        if main_cat not in all_subcats:
                            all_subcats[main_cat] = []
                        all_subcats[main_cat].extend(subcats)
        except (json.JSONDecodeError, TypeError):
            continue
    
    # 중복 제거
    for main_cat in all_subcats:
        all_subcats[main_cat] = list(set(all_subcats[main_cat]))
    
    return all_subcats


def _pick_activity_query(fav_activities: List[str], subcategories: Dict[str, List[str]]) -> tuple[str, str]:
    """
    참가자 fav_activity와 서브 카테고리를 보고 1코스 '놀거리' 검색어와 type을 선택.
    Returns: (query, type) 튜플
    
    Google Places API에서 잘 지원되는 type 사용:
    - cafe, restaurant, bar
    - movie_theater, museum, library, art_gallery
    - park, amusement_park, tourist_attraction
    - campground
    """
    # 서브 카테고리 우선 확인 (더 구체적)
    activity_subcats = subcategories.get("액티비티", [])
    rest_subcats = subcategories.get("휴식", [])
    culture_subcats = subcategories.get("문화시설", [])
    nature_subcats = subcategories.get("자연관광", [])
    
    all_subcat_text = " ".join(activity_subcats + rest_subcats + culture_subcats + nature_subcats).lower()
    
    # 액티비티 서브 카테고리
    if any(k in all_subcat_text for k in ["보드게임"]):
        return ("보드게임", "cafe")  # "보드게임 카페"보다 "보드게임"이 더 일반적
    if any(k in all_subcat_text for k in ["방탈출"]):
        return ("방탈출", "cafe")  # "방탈출 카페"보다 "방탈출"이 더 일반적
    if any(k in all_subcat_text for k in ["실내스포츠", "스포츠"]):
        return ("실내 스포츠", "tourist_attraction")  # gym은 지원 안 할 수 있으므로 tourist_attraction 사용
    if any(k in all_subcat_text for k in ["공방"]):
        return ("체험 공방", "tourist_attraction")
    if any(k in all_subcat_text for k in ["놀이공원"]):
        return ("놀이공원", "amusement_park")
    
    # 휴식 서브 카테고리 - spa는 지원 안 할 수 있으므로 keyword만 사용
    if any(k in all_subcat_text for k in ["찜질방"]):
        return ("찜질방", "tourist_attraction")  # spa 대신 tourist_attraction 사용
    if any(k in all_subcat_text for k in ["마사지"]):
        return ("마사지", "tourist_attraction")
    if any(k in all_subcat_text for k in ["만화카페"]):
        return ("만화", "cafe")  # 더 일반적인 검색어
    if any(k in all_subcat_text for k in ["수면카페"]):
        return ("카페", "cafe")  # 수면카페는 너무 구체적이므로 일반 카페로
    
    # 문화시설 서브 카테고리
    if any(k in all_subcat_text for k in ["영화관"]):
        return ("영화관", "movie_theater")
    if any(k in all_subcat_text for k in ["박물관", "미술관"]):
        return ("박물관", "museum")
    if any(k in all_subcat_text for k in ["갤러리"]):
        return ("갤러리", "tourist_attraction")  # art_gallery보다는 tourist_attraction이 더 안전
    if any(k in all_subcat_text for k in ["도서관"]):
        return ("도서관", "library")
    
    # 자연관광 서브 카테고리
    if any(k in all_subcat_text for k in ["공원"]):
        return ("공원", "park")
    if any(k in all_subcat_text for k in ["산"]):
        return ("등산로", "park")
    if any(k in all_subcat_text for k in ["바다"]):
        return ("해변", "tourist_attraction")
    if any(k in all_subcat_text for k in ["캠핑"]):
        return ("캠핑장", "campground")
    if any(k in all_subcat_text for k in ["전망대"]):
        return ("전망대", "tourist_attraction")
    
    # 메인 카테고리로 fallback
    fav_text = " ".join(fav_activities).lower()
    
    if any(k in fav_text for k in ["보드게임", "board", "보드"]):
        return ("보드게임", "cafe")
    if any(k in fav_text for k in ["방탈출", "escape"]):
        return ("방탈출", "cafe")
    if any(k in fav_text for k in ["노래방", "karaoke"]):
        return ("코인 노래방", "tourist_attraction")  # night_club보다는 tourist_attraction
    if any(k in fav_text for k in ["pc방", "pc bang", "pc방"]):
        return ("피시방", "tourist_attraction")
    if any(k in fav_text for k in ["전시", "museum", "미술관"]):
        return ("전시회", "museum")

    return ("놀거리", "tourist_attraction")


def build_steps_from_meeting(
    meeting: models.Meeting,
    participants: List[models.Participant],
) -> List[StepInput]:
    """
    Meeting.with_whom / purpose / vibe / budget + 참가자 fav_activity 및 서브 카테고리를 보고
    코스를 설계하는 함수 (최소 1개 이상의 steps 생성).

    대략적인 규칙:
      - purpose=activity / fav_activity 있으면 1코스는 놀거리/체험
      - purpose=meal/drinks 이면 2코스는 식사 위주
      - vibe, budget 에 따라 '가성비 맛집', '고급 한정식', '분위기 좋은 바' 등 검색어 변경
      - 서브 카테고리를 활용하여 더 구체적인 검색어 생성
    """
    purposes = _normalize_list_field(meeting.purpose)
    vibes = _normalize_list_field(meeting.vibe)
    with_whom = (meeting.with_whom or "").lower()
    budget = (meeting.budget or "").strip()  # "1","2","3","4" 중 하나라고 가정

    fav_activities = [
        p.fav_activity for p in participants
        if p.fav_activity
    ]
    
    # 서브 카테고리 파싱
    subcategories = _parse_subcategories(participants)

    steps: List[StepInput] = []

    # ---------- 1코스: 가볍게 / 활동 ----------
    wants_activity = any(p in purposes for p in ["activity", "play", "game"])
    has_fav_activity = len(fav_activities) > 0

    if wants_activity or has_fav_activity:
        query, place_type = _pick_activity_query(fav_activities, subcategories)
        steps.append(StepInput(query=query, type=place_type))
    else:
        # 회의/미팅이면 조용한 카페부터
        if "meeting" in purposes:
            steps.append(
                StepInput(query="회의하기 좋은 카페", type="cafe")
            )
        # 술자리가 메인인 약속
        elif "drinks" in purposes:
            steps.append(
                StepInput(query="가볍게 한잔하기 좋은 술집", type="bar")
            )
        else:
            # 기본: 가벼운 식사
            steps.append(
                StepInput(query="가볍게 먹기 좋은 식당", type="restaurant")
            )

    # ---------- 2코스: 메인 식사 ----------
    # 서브 카테고리에서 맛집 관련 추출
    restaurant_subcats = subcategories.get("맛집", [])
    restaurant_subcat_text = " ".join(restaurant_subcats).lower() if restaurant_subcats else ""
    
    # budget, vibe, with_whom, 서브 카테고리에 따라 검색어 변경
    base_query = None
    
    # 서브 카테고리 우선 확인 (더 구체적)
    if restaurant_subcats:
        if any(k in restaurant_subcat_text for k in ["한식"]):
            base_query = "한식당"
        elif any(k in restaurant_subcat_text for k in ["일식"]):
            base_query = "일식당"
        elif any(k in restaurant_subcat_text for k in ["중식"]):
            base_query = "중식당"
        elif any(k in restaurant_subcat_text for k in ["양식"]):
            base_query = "양식 레스토랑"
        elif any(k in restaurant_subcat_text for k in ["고기"]):
            base_query = "고기집"
        elif any(k in restaurant_subcat_text for k in ["해산물"]):
            base_query = "해산물 요리"
        elif any(k in restaurant_subcat_text for k in ["돈까스"]):
            base_query = "돈까스집"
        elif any(k in restaurant_subcat_text for k in ["비건"]):
            base_query = "비건 식당"
        elif any(k in restaurant_subcat_text for k in ["분식"]):
            base_query = "분식집"
        elif any(k in restaurant_subcat_text for k in ["패스트푸드"]):
            base_query = "패스트푸드"
    
    # 서브 카테고리가 없거나 기본값을 사용할 때
    if not base_query:
        if "meal" in purposes or "drinks" in purposes:
            # 가성비 위주
            if "cheap" in vibes or budget == "1":
                base_query = "가성비 좋은 맛집"
            # 커플 + 분위기 좋은
            elif with_whom == "couple" and ("mood" in vibes or "calm" in vibes):
                base_query = "분위기 좋은 레스토랑"
            # 직장동료 + 조용/미팅
            elif with_whom == "coworkers" and ("calm" in vibes or "meeting" in purposes):
                base_query = "조용한 식당"
            # 가족
            elif with_whom == "family":
                base_query = "가족 모임 하기 좋은 한식당"
            else:
                base_query = "맛집"
        else:
            # 식사가 주목적이 아니면, 그래도 하나는 식사 넣어둔다.
            base_query = "근처 맛집"
    
    query = base_query
    steps.append(StepInput(query=query, type="restaurant"))

    # ---------- 3코스: 카페 or 술 or 휴식 ----------
    # 이미 사용된 type 확인 (카테고리 중복 방지)
    used_types = {step.type for step in steps}
    
    # 서브 카테고리에서 카페/술자리/휴식 관련 추출
    cafe_subcats = subcategories.get("카페", [])
    drink_subcats = subcategories.get("술자리", [])
    rest_subcats = subcategories.get("휴식", [])
    cafe_subcat_text = " ".join(cafe_subcats).lower() if cafe_subcats else ""
    drink_subcat_text = " ".join(drink_subcats).lower() if drink_subcats else ""
    rest_subcat_text = " ".join(rest_subcats).lower() if rest_subcats else ""
    
    noisy = any(v in vibes for v in ["noisy-fun", "party"])
    calm = any(v in vibes for v in ["calm"])
    mood = any(v in vibes for v in ["mood"])
    
    # 참가자 선호도 확인
    has_cafe_pref = any("카페" in fav for fav in fav_activities) or cafe_subcats
    has_drink_pref = any("술" in fav or "bar" in fav.lower() for fav in fav_activities) or drink_subcats
    has_rest_pref = any("휴식" in fav for fav in fav_activities) or rest_subcats

    # 휴식 선호가 있고 아직 사용되지 않았으면 휴식 우선
    if has_rest_pref and "spa" not in used_types and "beauty_salon" not in used_types:
        if rest_subcats:
            if any(k in rest_subcat_text for k in ["마사지", "스파"]):
                query = "마사지"
                steps.append(StepInput(query=query, type="spa"))
            elif any(k in rest_subcat_text for k in ["찜질방"]):
                query = "찜질방"
                steps.append(StepInput(query=query, type="tourist_attraction"))
            else:
                query = "스파"
                steps.append(StepInput(query=query, type="spa"))
        else:
            query = "마사지 스파"
            steps.append(StepInput(query=query, type="spa"))
    # 술자리 선호가 있고 cafe가 이미 사용되지 않았으면
    elif ("drinks" in purposes or has_drink_pref) and "bar" not in used_types:
        # 서브 카테고리 우선 확인
        if drink_subcats:
            if any(k in drink_subcat_text for k in ["포차"]):
                query = "포차"
            elif any(k in drink_subcat_text for k in ["펍", "펍바"]):
                query = "펍"
            elif any(k in drink_subcat_text for k in ["와인바"]):
                query = "와인바"
            elif any(k in drink_subcat_text for k in ["칵테일바"]):
                query = "칵테일바"
            elif any(k in drink_subcat_text for k in ["이자카야"]):
                query = "이자카야"
            else:
                query = "술집"
        else:
            # 시끄럽게 놀기 좋은 술집
            if noisy:
                query = "시끄럽게 놀기 좋은 술집"
            # 비교적 조용/분위기
            elif mood:
                query = "분위기 좋은 와인바"
            else:
                query = "깔끔한 주점"
        
        steps.append(StepInput(query=query, type="bar"))
    # 카페 선호가 있고 cafe가 이미 사용되지 않았으면
    elif has_cafe_pref and "cafe" not in used_types:
        # 서브 카테고리 우선 확인
        if cafe_subcats:
            if any(k in cafe_subcat_text for k in ["브런치"]):
                query = "브런치"
            elif any(k in cafe_subcat_text for k in ["디저트"]):
                query = "디저트"
            elif any(k in cafe_subcat_text for k in ["빵집"]):
                query = "베이커리"
            elif any(k in cafe_subcat_text for k in ["스터디"]):
                query = "스터디 카페"
            elif any(k in cafe_subcat_text for k in ["애견"]):
                query = "애견카페"
            else:
                query = "카페"
        else:
            # 카페 방향 (기존 로직)
            if calm or "meeting" in purposes:
                query = "조용한 카페"
            elif mood:
                query = "분위기 좋은 디저트 카페"
            else:
                query = "수다 떨기 좋은 카페"
        
        steps.append(StepInput(query=query, type="cafe"))
    # 모두 사용되었거나 선호가 없으면, 휴식이나 기본값
    else:
        if has_rest_pref and rest_subcats:
            if any(k in rest_subcat_text for k in ["마사지"]):
                query = "마사지"
                steps.append(StepInput(query=query, type="spa"))
            else:
                query = "스파"
                steps.append(StepInput(query=query, type="spa"))
        else:
            # 기본: 조용한 카페 (이미 cafe가 사용되었어도 fallback)
            query = "조용한 카페"
            steps.append(StepInput(query=query, type="cafe"))

    # 모든 steps 반환 (3개 고정 제거)
    return steps


# ----------------------------------------
# 2) 카테고리 매핑 (UI용)
# ----------------------------------------

def _category_for_step_index(idx: int) -> str:
    mapping: Dict[int, str] = {
        0: "activity",    # 1코스: 활동/가벼운 시작
        1: "restaurant",  # 2코스: 식사
        2: "cafe",        # 3코스: 카페/술집
    }
    return mapping.get(idx, "activity")


def _category_for_step(step: StepInput, idx: int) -> str:
    t = (step.type or "").lower()
    q = (step.query or "").lower()

    if t == "restaurant":
        return "restaurant"
    if t in ("cafe", "bar"):
        return "cafe"
    if t in ("tourist_attraction", "movie_theater", "amusement_park"):
        return "activity"

    if "카페" in q or "cafe" in q or "커피" in q:
        return "cafe"
    if "맛집" in q or "식당" in q or "레스토랑" in q:
        return "restaurant"

    return _category_for_step_index(idx)


# ----------------------------------------
# 3) Meeting 기준 코스 생성 + 저장
# ----------------------------------------

def build_and_save_courses_for_meeting(
    db: Session,
    meeting_id: int,
) -> CourseResponse:
    """
    1) MeetingContext 로드 (중간 위치 포함)
    2) profile 기반 step 생성
    3) course.py 내부 로직으로 코스 후보 생성
    4) must-visit 장소를 Course 앞쪽에 포함시켜 MeetingPlace 테이블에 저장
    5) CourseResponse 그대로 반환
    """
    context = load_meeting_context(db, meeting_id)

    if context.center_lat is None or context.center_lng is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Meeting plan (중간 위치)가 설정되어 있지 않습니다. "
                "먼저 시간/장소 자동 계산을 실행해 주세요."
            ),
        )

    # 1) 프로필 + 참가자 선호 기반 step 설계
    steps = build_steps_from_meeting(context.meeting, context.participants)

    # 참가자들의 fav_activity 수집
    participant_fav_activities = [
        p.fav_activity
        for p in context.participants
        if p.fav_activity
    ]

    # 2) 중심 좌표 기준 코스 요청
    req = CourseRequest(
        center_lat=context.center_lat,
        center_lng=context.center_lng,
        radius=1000,
        steps=steps,
        per_step_limit=5,
    )

    course_response = plan_courses_internal(
        req,
        participant_fav_activities=participant_fav_activities,
    )

    # 3) 베스트 코스 하나를 MeetingPlace 후보 리스트로 변환
    best_course = course_response.courses[0]

    auto_candidates: list[dict] = []
    for idx, p in enumerate(best_course.places):
        step_idx = getattr(p, "step_index", idx)
        step_def: Optional[StepInput] = (
            steps[step_idx] if 0 <= step_idx < len(steps) else None
        )
        category = (
            _category_for_step(step_def, step_idx)
            if step_def
            else _category_for_step_index(step_idx)
        )

        auto_candidates.append(
            {
                "name": p.name,
                "poi_name": p.name,
                "address": p.address or "",
                "lat": p.lat,
                "lng": p.lng,
                "category": category,
                "duration": None,
            }
        )

    # 4) must-visit 장소를 코스에 포함
    #    - 좌표(lat,lng)가 있는 것만 MeetingPlace에 넣을 수 있음
    must_visit_candidates: list[dict] = []
    for mv in context.must_visit_places:
        if mv.latitude is None or mv.longitude is None:
            # 좌표 없는 MustVisit은 Meeting.must_visit_places로만 유지 (코스에는 표시 X)
            continue

        # UI에서 티 나도록 [필수] prefix
        label = f"[필수] {mv.name}"

        must_visit_candidates.append(
            {
                "name": label,
                "poi_name": mv.name,
                "address": mv.address or "",
                "lat": mv.latitude,
                "lng": mv.longitude,
                # 카테고리를 따로 모르면 activity 정도로 두거나 None 으로 두어도 OK
                "category": "must_visit",
                "duration": None,
            }
        )

    # 5) 최종 MeetingPlace 후보 순서 구성
    #    - 1차 버전: 필수 장소들 → 자동 추천 3코스
    #    - (원하면 나중에 [필수]를 2코스로 끼워 넣는 로직으로 바꿀 수 있음)
    final_candidates = must_visit_candidates + auto_candidates

    # 6) calc_func.save_calculated_places 재사용
    save_calculated_places(db, meeting_id, final_candidates)

    return course_response