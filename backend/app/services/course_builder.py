# app/services/course_builder.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional, Dict
import json
import math

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
from ..services.naver_directions import get_travel_time


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


def _max_nonbar_restaurant_visits_by_duration(meeting_duration_minutes: int) -> int:
    """
    총 코스 시간(meeting_duration) 기준으로 '식당(바 제외)' 방문 횟수 상한을 반환.
    - 6시간(360분) 초과: 2회
    - 6시간(360분) 이하: 1회
    - 3시간(180분) 이하: 0회 (너무 짧으면 식당 제외)
    """
    if meeting_duration_minutes > 360:  # 6시간 초과
        return 2
    if meeting_duration_minutes > 180:  # 3시간 초과, 6시간 이하
        return 1
    return 0


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
    max_nonbar_restaurant_steps: Optional[int] = None,
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
    
    # meeting_duration 파싱 (분 단위 문자열, 예: "60", "120", "180", "240", "360", "480")
    meeting_duration_minutes = 0
    if meeting.meeting_duration:
        try:
            meeting_duration_minutes = int(meeting.meeting_duration)
        except (ValueError, TypeError):
            meeting_duration_minutes = 0

    # 식당(바 제외) step 추가 상한 (must_visit 반영은 caller에서 차감해서 넘겨줌)
    nonbar_restaurant_steps_allowed = (
        max_nonbar_restaurant_steps
        if max_nonbar_restaurant_steps is not None
        else _max_nonbar_restaurant_visits_by_duration(meeting_duration_minutes)
    )
    nonbar_restaurant_steps_added = 0

    # fav_activity를 파싱: "맛집,쇼핑" 같은 경우를 분리
    fav_activities: List[str] = []
    for p in participants:
        if p.fav_activity:
            # 쉼표로 구분된 여러 선호 활동을 분리
            activities = [a.strip() for a in p.fav_activity.split(",") if a.strip()]
            fav_activities.extend(activities)
    
    # 서브 카테고리 파싱
    subcategories = _parse_subcategories(participants)
    
    # 서브 카테고리 추출 (1코스에서도 사용하기 위해 미리 정의)
    cafe_subcats = subcategories.get("카페", [])
    drink_subcats = subcategories.get("술자리", [])
    rest_subcats = subcategories.get("휴식", [])
    shopping_subcats = subcategories.get("쇼핑", [])
    
    # fav_activities를 카테고리별로 분류
    cafe_favs = [f for f in fav_activities if "카페" in f.lower()]
    shopping_favs = [f for f in fav_activities if any(k in f.lower() for k in ["쇼핑", "백화점", "마켓"])]
    rest_favs = [f for f in fav_activities if "휴식" in f.lower()]
    activity_favs = [f for f in fav_activities if any(k in f.lower() for k in ["액티비티", "활동", "체험", "보드게임", "방탈출", "노래방", "pc방"])]

    steps: List[StepInput] = []
    
    # purpose 기반으로 코스 구성 전략 결정
    purpose_str = ",".join(purposes).lower()
    is_meal_focused = any(p in purposes for p in ["meal", "밥"])
    is_drink_focused = any(p in purposes for p in ["drinks", "술", "술 한잔"])
    is_cafe_focused = any(p in purposes for p in ["cafe", "카페", "수다", "카페/수다"])
    is_activity_focused = any(p in purposes for p in ["activity", "play", "game", "활동", "체험", "활동/체험"])
    is_meeting_focused = any(p in purposes for p in ["meeting", "미팅", "회의", "회의/미팅"])
    
    # budget에 따른 코스 길이 조정 (1=간단, 4=풀코스)
    budget_num = int(budget) if budget and budget.isdigit() else 2
    is_high_budget = budget_num >= 3  # 3만원 이상이면 더 다양한 코스
    is_low_budget = budget_num <= 1   # 1만원대면 간단한 코스
    
    # meeting_duration에 따른 최소 코스 개수 결정
    # - 1시간(60분): 최소 1-2개
    # - 2시간(120분): 최소 2개
    # - 3시간(180분): 최소 2-3개
    # - 4시간(240분): 최소 3개
    # - 6시간(360분): 최소 3-4개
    # - 8시간(480분): 최소 4-5개
    min_steps_from_duration = 1
    if meeting_duration_minutes >= 480:  # 8시간
        min_steps_from_duration = 4
    elif meeting_duration_minutes >= 360:  # 6시간
        min_steps_from_duration = 3
    elif meeting_duration_minutes >= 240:  # 4시간
        min_steps_from_duration = 3
    elif meeting_duration_minutes >= 180:  # 3시간
        min_steps_from_duration = 2
    elif meeting_duration_minutes >= 120:  # 2시간
        min_steps_from_duration = 2
    
    # vibe 확인
    is_cost_effective = any(v in vibes for v in ["cheap", "가성비", "가성비 위주"])
    is_calm = any(v in vibes for v in ["calm", "조용", "조용하고 편안한"])
    is_noisy = any(v in vibes for v in ["noisy-fun", "party", "떠들기", "깔깔 떠들기 좋은"])
    is_mood = any(v in vibes for v in ["mood", "분위기", "분위기 좋은"])

    # ---------- 1코스: 가볍게 / 활동 ----------
    # fav_activity를 카테고리별로 확인하여 우선순위 결정
    # 휴식 선호는 3코스에서 처리하고, 1코스는 다른 액티비티나 맛집/카페/쇼핑 우선
    non_rest_favs = [f for f in fav_activities if "휴식" not in f.lower()]
    wants_activity = is_activity_focused or (len(activity_favs) > 0 and len(rest_favs) == 0)
    
    # 1코스 우선순위: 활동(휴식 제외) > 카페 > 맛집 > 쇼핑
    if wants_activity and len(activity_favs) > 0:
        # 휴식 제외한 액티비티 선호가 있으면 1코스에 포함
        query, place_type = _pick_activity_query(activity_favs, subcategories)
        steps.append(StepInput(query=query, type=place_type))
    elif len(cafe_favs) > 0:
        # 카페 선호가 있으면 1코스에 카페 포함
        if cafe_subcats:
            if any(k in cafe_subcats for k in ["디저트"]):
                query = "디저트"
            else:
                query = "카페"
        else:
            query = "카페"
        steps.append(StepInput(query=query, type="cafe"))
    elif is_meeting_focused:
        # 회의/미팅이면 조용한 카페부터
        steps.append(
            StepInput(query="회의하기 좋은 카페", type="cafe")
        )
    elif is_drink_focused and not is_meal_focused:
        # 술자리가 메인이고 식사가 아니면
        steps.append(
            StepInput(query="가볍게 한잔하기 좋은 술집", type="bar")
        )
    elif is_cafe_focused and not is_meal_focused:
        # 카페/수다가 메인이고 식사가 아니면
        if is_calm:
            steps.append(
                StepInput(query="조용한 카페", type="cafe")
            )
        else:
            steps.append(
                StepInput(query="수다 떨기 좋은 카페", type="cafe")
            )
    elif not is_meal_focused:
        # 기본: 가벼운 식사 또는 활동
        # 식당(바 제외) step은 상한 내에서만 추가
        if nonbar_restaurant_steps_added < nonbar_restaurant_steps_allowed:
            steps.append(
                StepInput(query="가볍게 먹기 좋은 식당", type="restaurant")
            )
            nonbar_restaurant_steps_added += 1
        else:
            # 식당을 더 넣을 수 없으면 카페로 대체
            steps.append(
                StepInput(query="카페", type="cafe")
            )
    # meal_focused인 경우는 2코스에서 처리

    # ---------- 2코스: 메인 식사 (조건부 추가) ----------
    # 식당(바 제외) step은 상한 내에서만 추가
    should_add_meal = nonbar_restaurant_steps_added < nonbar_restaurant_steps_allowed
    
    # 간단한 목적(카페만, 회의만) + 저예산이면 식사 스킵 가능
    if (is_cafe_focused or is_meeting_focused) and is_low_budget and len(steps) >= 1:
        # 이미 카페/회의 장소가 있고 예산이 낮으면 식사 생략 가능
        should_add_meal = False
    
    if should_add_meal:
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
            if is_meal_focused or is_drink_focused:
                # 가성비 위주
                if is_cost_effective or budget_num == 1:
                    base_query = "가성비 좋은 맛집"
                # 커플 + 분위기 좋은
                elif with_whom == "couple" and (is_mood or is_calm):
                    base_query = "분위기 좋은 레스토랑"
                # 직장동료 + 조용/미팅
                elif with_whom == "coworkers" and (is_calm or is_meeting_focused):
                    base_query = "조용한 식당"
                # 가족
                elif with_whom == "family":
                    base_query = "가족 모임 하기 좋은 한식당"
                # 고예산
                elif is_high_budget:
                    base_query = "고급 식당"
                else:
                    base_query = "맛집"
            else:
                # 식사가 주목적이 아니면, 그래도 하나는 식사 넣어둔다.
                if is_low_budget:
                    base_query = "가성비 좋은 맛집"
                else:
                    base_query = "근처 맛집"
        
        query = base_query
        steps.append(StepInput(query=query, type="restaurant"))
        nonbar_restaurant_steps_added += 1

    # ---------- 3코스: 카페 or 술 or 휴식 (조건부 추가) ----------
    # meeting_duration과 min_steps_from_duration을 고려하여 결정
    should_add_third = True
    
    # 만남 시간이 짧고(2시간 미만) 간단한 목적 + 저예산이면 3코스 생략 가능
    if meeting_duration_minutes < 120:
        if (is_cafe_focused or is_meeting_focused) and is_low_budget:
            # 카페/회의만 목적이고 저예산이면 생략 가능
            should_add_third = False
        elif is_meal_focused and is_low_budget and not is_activity_focused:
            # 식사 중심 + 저예산 + 활동 없으면 생략 가능
            should_add_third = False
    
    # meeting_duration이 3시간 이상이면 최소 3코스는 필요
    if meeting_duration_minutes >= 180:
        should_add_third = True
    
    # 현재 steps가 min_steps_from_duration보다 적으면 추가
    if len(steps) < min_steps_from_duration:
        should_add_third = True
    
    if should_add_third:
        # 이미 사용된 type 확인 (카테고리 중복 방지)
        used_types = {step.type for step in steps}
        
        # 서브 카테고리 텍스트 변환 (이미 위에서 추출한 subcategories 사용)
        cafe_subcat_text = " ".join(cafe_subcats).lower() if cafe_subcats else ""
        drink_subcat_text = " ".join(drink_subcats).lower() if drink_subcats else ""
        rest_subcat_text = " ".join(rest_subcats).lower() if rest_subcats else ""
        shopping_subcat_text = " ".join(shopping_subcats).lower() if shopping_subcats else ""
        
        noisy = any(v in vibes for v in ["noisy-fun", "party"])
        calm = any(v in vibes for v in ["calm"])
        mood = any(v in vibes for v in ["mood"])
        
        # 참가자 선호도 확인 (카테고리별로 분류된 fav_activities 사용)
        has_cafe_pref = len(cafe_favs) > 0 or cafe_subcats
        has_drink_pref = any("술" in fav or "bar" in fav.lower() for fav in fav_activities) or drink_subcats
        has_rest_pref = len(rest_favs) > 0 or rest_subcats
        has_shopping_pref = len(shopping_favs) > 0
        
        # 이미 사용된 activity type 확인 (spa, tourist_attraction 등 activity 관련 type)
        has_activity_type = any(t in used_types for t in ["spa", "tourist_attraction", "amusement_park", "movie_theater", "museum"])

        # 3코스 우선순위: 쇼핑 > 카페 > 휴식 > 술자리 (activity 중복 방지)
        # 쇼핑 선호가 있고 shopping이 이미 사용되지 않았으면
        if has_shopping_pref and "shopping_mall" not in used_types:
            if shopping_favs:
                # 서브카테고리 우선 확인 (shopping_subcats는 이미 위에서 정의됨)
                if any(k in shopping_subcat_text for k in ["백화점"]):
                    query = "백화점"
                elif any(k in shopping_subcat_text for k in ["마켓", "시장"]):
                    query = "시장"
                else:
                    query = "쇼핑몰"
            else:
                query = "쇼핑몰"
            steps.append(StepInput(query=query, type="shopping_mall"))
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
                if is_calm or is_meeting_focused:
                    query = "조용한 카페"
                elif is_mood:
                    query = "분위기 좋은 디저트 카페"
                else:
                    query = "수다 떨기 좋은 카페"
            
            steps.append(StepInput(query=query, type="cafe"))
        # 휴식 선호가 있고 아직 activity type이 사용되지 않았으면
        elif has_rest_pref and not has_activity_type:
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
        elif (is_drink_focused or has_drink_pref) and "bar" not in used_types:
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
                # 시끄러운 분위기면 더 일반적인 검색어 사용
                if noisy:
                    query = "술집"  # "시끄럽게 놀기 좋은 술집"은 너무 구체적
                # 비교적 조용/분위기
                elif mood:
                    query = "와인바"  # "분위기 좋은 와인바"는 너무 구체적
                else:
                    query = "주점"
            
            steps.append(StepInput(query=query, type="bar"))
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
                if is_calm or is_meeting_focused:
                    query = "조용한 카페"
                elif is_mood:
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

    # ---------- 4코스 이상: 만남 시간이 길면 추가 코스 생성 ----------
    # meeting_duration이 6시간 이상이면 4코스 이상 고려
    while len(steps) < min_steps_from_duration:
        used_types = {step.type for step in steps}
        
        # 아직 사용하지 않은 카테고리 우선 선택
        if "bar" not in used_types and (is_drink_focused or has_drink_pref):
            # 술자리 추가
            if noisy:
                query = "시끄럽게 놀기 좋은 술집"
            elif mood:
                query = "분위기 좋은 와인바"
            else:
                query = "술집"
            steps.append(StepInput(query=query, type="bar"))
        elif "cafe" not in used_types:
            # 카페 추가
            if is_calm:
                query = "조용한 카페"
            elif is_mood:
                query = "분위기 좋은 디저트 카페"
            else:
                query = "카페"
            steps.append(StepInput(query=query, type="cafe"))
        elif "restaurant" not in used_types:
            # 식당 추가 (간단한 음식) - 하지만 이미 restaurant가 2개 이상이면 추가하지 않음
            # 현재 steps에서 restaurant 개수 확인
            restaurant_count_in_steps = sum(1 for s in steps if s.type == "restaurant")
            if restaurant_count_in_steps < 2:  # 최대 2개까지만
                if is_cost_effective or is_low_budget:
                    query = "가성비 좋은 맛집"
                else:
                    query = "간단한 식사"
                steps.append(StepInput(query=query, type="restaurant"))
            else:
                # restaurant가 이미 충분하면 카페로 대체
                query = "카페"
                steps.append(StepInput(query=query, type="cafe"))
        elif "tourist_attraction" not in used_types or "spa" not in used_types:
            # 활동/휴식 추가
            if has_rest_pref:
                query = "마사지 스파"
                steps.append(StepInput(query=query, type="spa"))
            elif is_activity_focused or len(fav_activities) > 0:
                query, place_type = _pick_activity_query(fav_activities, subcategories)
                steps.append(StepInput(query=query, type=place_type))
            else:
                # 기본: 카페
                query = "카페"
                steps.append(StepInput(query=query, type="cafe"))
        else:
            # 모든 카테고리를 사용했으면 기본값으로 추가
            query = "카페"
            steps.append(StepInput(query=query, type="cafe"))

    # 최소 1개는 보장 (steps가 비어있으면 기본 코스 추가)
    if len(steps) == 0:
        steps.append(StepInput(query="카페", type="cafe"))
    
    # 모든 steps 반환 (동적 개수)
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
# 2.5) Duration 조정 헬퍼 함수
# ----------------------------------------

def round_to_5_minutes(minutes: float) -> int:
    """5분 단위로 반올림 (예: 17분 -> 20분, 23분 -> 25분)"""
    return int(round(minutes / 5) * 5)


def adjust_duration_with_range(
    category: str, 
    duration: float,
    category_min_durations: dict,
    category_max_durations: dict
) -> int:
    """duration을 카테고리별 최소/최대 범위 내에서 5분 단위로 조정"""
    min_dur = category_min_durations.get(category, 30)
    max_dur = category_max_durations.get(category, 120)
    rounded = round_to_5_minutes(duration)
    return max(min_dur, min(rounded, max_dur))


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 위경도 지점 간의 거리(미터) 계산"""
    R = 6371000  # 지구 반지름 (m)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def optimize_course_order_with_constraints(
    places: List[dict],
    restaurant_min_gap_minutes: int = 300,
) -> List[dict]:
    """
    코스 순서를 이동시간 최소화하도록 최적화 (restaurant 간격 제약 포함)
    
    Args:
        places: 장소 리스트 (각 dict는 lat, lng, category, duration, original_type 포함)
        restaurant_min_gap_minutes: restaurant 간 최소 시간 간격 (분)
    
    Returns:
        최적화된 순서의 장소 리스트
    """
    if len(places) <= 1:
        return places
    
    def _cat(p: dict) -> str:
        # must_visit은 effective_category가 있으면 그걸 우선 사용 (실제 카테고리)
        return (p.get("effective_category") or p.get("category") or "").strip()
    
    def _is_restaurant(p: dict) -> bool:
        """restaurant인지 확인 (effective_category 또는 category 확인)"""
        category = p.get("category", "")
        effective_category = p.get("effective_category", "")
        return category == "restaurant" or effective_category == "restaurant"

    # restaurant와 non-restaurant 분리 (bar 제외)
    # bar는 이제 category="bar"로 저장되므로, category=="restaurant"만 체크해도 됨
    restaurants = [
        p for p in places 
        if _is_restaurant(p)
    ]
    non_restaurants = [
        p for p in places 
        if _cat(p) != "restaurant"
    ]
    
    # restaurant가 1개 이하면 단순히 nearest neighbor로 최적화
    if len(restaurants) <= 1:
        return _nearest_neighbor_optimize(places)
    
    # restaurant 간격 제약을 만족하면서 순서 최적화
    # 1. restaurant들을 먼저 배치 (균등 분산)
    # 2. 각 구간에 non-restaurant들을 nearest neighbor로 배치
    
    # restaurant 배치 위치 계산 (5시간 간격을 만족하도록)
    total_duration = sum(p.get("duration", 60) for p in places)
    # restaurant 개수에 따라 적절한 간격 계산
    num_slots = max(len(restaurants) + len(non_restaurants) // 2, len(restaurants) * 2)
    target_gap = max(restaurant_min_gap_minutes, total_duration // (len(restaurants) + 1))
    
    # restaurant 위치 결정 (누적 시간 기준)
    restaurant_slots = []
    cumulative_time = 0
    for i in range(len(restaurants)):
        restaurant_slots.append((cumulative_time, i))
        cumulative_time += target_gap
    
    # 모든 장소를 위치-시간 기준으로 정렬할 수 있도록 구성
    # 간단한 방법: restaurant를 균등 분산 배치하고, 나머지를 가까운 restaurant 옆에 배치
    
    # 가장 가까운 restaurant를 찾는 함수
    def find_nearest_restaurant_idx(place: dict, restaurant_list: List[dict]) -> int:
        if not restaurant_list:
            return 0
        min_dist = float('inf')
        nearest_idx = 0
        for idx, rest in enumerate(restaurant_list):
            dist = haversine_distance(
                place["lat"], place["lng"],
                rest["lat"], rest["lng"]
            )
            if dist < min_dist:
                min_dist = dist
                nearest_idx = idx
        return nearest_idx
    
    # restaurant 순서 최적화 (첫 restaurant는 중심에 가까운 것 선택)
    if restaurants:
        # 첫 restaurant는 중심 좌표(모든 장소의 평균)에 가까운 것 선택
        avg_lat = sum(p["lat"] for p in places) / len(places)
        avg_lng = sum(p["lng"] for p in places) / len(places)
        first_rest_idx = min(
            range(len(restaurants)),
            key=lambda i: haversine_distance(
                avg_lat, avg_lng,
                restaurants[i]["lat"], restaurants[i]["lng"]
            )
        )
        # 나머지 restaurant는 nearest neighbor로 순서 결정
        ordered_restaurants = [restaurants[first_rest_idx]]
        remaining_restaurants = [r for i, r in enumerate(restaurants) if i != first_rest_idx]
        current_rest = ordered_restaurants[0]
        while remaining_restaurants:
            nearest_idx = min(
                range(len(remaining_restaurants)),
                key=lambda i: haversine_distance(
                    current_rest["lat"], current_rest["lng"],
                    remaining_restaurants[i]["lat"], remaining_restaurants[i]["lng"]
                )
            )
            nearest_rest = remaining_restaurants.pop(nearest_idx)
            ordered_restaurants.append(nearest_rest)
            current_rest = nearest_rest
        restaurants = ordered_restaurants
    
    # non-restaurant를 restaurant 구간 사이에 배치
    # 각 non-restaurant를 가장 가까운 restaurant 옆에 배치
    restaurant_groups: List[List[dict]] = [[] for _ in restaurants]
    
    for nr in non_restaurants:
        nearest_rest_idx = find_nearest_restaurant_idx(nr, restaurants)
        restaurant_groups[nearest_rest_idx].append(nr)
    
    # 각 그룹 내에서 nearest neighbor로 순서 최적화
    for group_idx, group in enumerate(restaurant_groups):
        if len(group) > 1:
            restaurant_groups[group_idx] = _nearest_neighbor_optimize_group(
                group, restaurants[group_idx] if group_idx < len(restaurants) else None
            )
    
    # 최종 순서 구성: restaurant와 해당 그룹의 non-restaurant를 교차 배치
    # 간단하게: restaurant 사이에 non-restaurant 그룹을 배치
    result = []
    
    # 각 restaurant 사이에 non-restaurant 그룹 배치
    for rest_idx, restaurant in enumerate(restaurants):
        # 이 restaurant 앞에 배치할 non-restaurant 그룹
        group = restaurant_groups[rest_idx] if rest_idx < len(restaurant_groups) else []
        
        # 그룹의 non-restaurant 배치 (이미 최적화됨)
        result.extend(group)
        
        # restaurant 배치
        result.append(restaurant)
    
    # 마지막 restaurant 이후의 non-restaurant 그룹 배치
    if len(restaurant_groups) > len(restaurants):
        result.extend(restaurant_groups[len(restaurants):])
    
    # restaurant 간격 제약 확인 및 조정
    if len(restaurants) >= 2:
        def _is_restaurant_in_place(p: dict) -> bool:
            """restaurant인지 확인 (effective_category 또는 category 확인)"""
            category = p.get("category", "")
            effective_category = p.get("effective_category", "")
            return category == "restaurant" or effective_category == "restaurant"
        
        rest_indices = [
            i for i, p in enumerate(result) 
            if _is_restaurant_in_place(p)
        ]
        
        # 간격이 부족한 restaurant 쌍 찾기
        needs_adjustment = False
        for i in range(len(rest_indices) - 1):
            idx1, idx2 = rest_indices[i], rest_indices[i + 1]
            gap_time = sum(result[j].get("duration", 60) for j in range(idx1 + 1, idx2))
            if gap_time < restaurant_min_gap_minutes:
                needs_adjustment = True
                break
        
        # 간격 제약을 만족하지 못하는 경우가 많으면 단순 최적화로 폴백
        if needs_adjustment:
            # 제약을 완화하여 nearest neighbor로 최적화
            # (restaurant 간격은 가능한 한 유지하되, 완벽하지 않아도 됨)
            pass  # 현재 구조를 유지 (나중에 더 정교한 최적화 가능)
    
    return result


def _nearest_neighbor_optimize(places: List[dict]) -> List[dict]:
    """Nearest Neighbor 알고리즘으로 장소 순서 최적화 (이동시간 최소화)"""
    if len(places) <= 1:
        return places
    
    # 첫 장소는 중심에 가까운 것 선택
    avg_lat = sum(p["lat"] for p in places) / len(places)
    avg_lng = sum(p["lng"] for p in places) / len(places)
    first_idx = min(
        range(len(places)),
        key=lambda i: haversine_distance(avg_lat, avg_lng, places[i]["lat"], places[i]["lng"])
    )
    
    result = [places[first_idx]]
    remaining = [p for i, p in enumerate(places) if i != first_idx]
    
    while remaining:
        current = result[-1]
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: haversine_distance(
                current["lat"], current["lng"],
                remaining[i]["lat"], remaining[i]["lng"]
            )
        )
        result.append(remaining.pop(nearest_idx))
    
    return result


def _nearest_neighbor_optimize_group(group: List[dict], start_place: Optional[dict] = None) -> List[dict]:
    """그룹 내 장소들을 nearest neighbor로 순서 최적화"""
    if len(group) <= 1:
        return group
    
    if start_place:
        # 시작 장소에 가장 가까운 것부터
        nearest_idx = min(
            range(len(group)),
            key=lambda i: haversine_distance(
                start_place["lat"], start_place["lng"],
                group[i]["lat"], group[i]["lng"]
            )
        )
        result = [group[nearest_idx]]
        remaining = [p for i, p in enumerate(group) if i != nearest_idx]
    else:
        # 첫 장소는 중심에 가까운 것
        avg_lat = sum(p["lat"] for p in group) / len(group)
        avg_lng = sum(p["lng"] for p in group) / len(group)
        first_idx = min(
            range(len(group)),
            key=lambda i: haversine_distance(avg_lat, avg_lng, group[i]["lat"], group[i]["lng"])
        )
        result = [group[first_idx]]
        remaining = [p for i, p in enumerate(group) if i != first_idx]
    
    while remaining:
        current = result[-1]
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: haversine_distance(
                current["lat"], current["lng"],
                remaining[i]["lat"], remaining[i]["lng"]
            )
        )
        result.append(remaining.pop(nearest_idx))
    
    return result


# ----------------------------------------
# 3) Meeting 기준 코스 생성 + 저장
# ----------------------------------------

async def build_and_save_courses_for_meeting(
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

    # meeting_duration 파싱 (분)
    meeting_duration_minutes = 0
    if context.meeting.meeting_duration:
        try:
            meeting_duration_minutes = int(context.meeting.meeting_duration)
        except (ValueError, TypeError):
            meeting_duration_minutes = 0

    # Google Places API types를 내부 category로 매핑하는 함수 import
    from core.place_category import map_google_types_to_category
    from ..services.google_places_services import fetch_nearby_places

    # must_visit의 카테고리(특히 restaurant 여부)를 추정해서,
    # meeting_duration 기준 "식당(바 제외)" 방문 횟수 상한에서 차감한다.
    max_nonbar_restaurants_total = _max_nonbar_restaurant_visits_by_duration(meeting_duration_minutes)

    must_visit_meta: dict[int, dict] = {}
    must_visit_nonbar_restaurant_count = 0

    for mv in context.must_visit_places:
        if mv.id is None or mv.latitude is None or mv.longitude is None:
            continue

        inferred_category = None
        inferred_original_type = None

        try:
            # must_visit 좌표 주변에서 이름으로 검색해 types 추정
            results = fetch_nearby_places(
                lat=float(mv.latitude),
                lng=float(mv.longitude),
                radius=800,
                keyword=mv.name,
                type=None,
            )
            if results:
                # 가장 가까운 결과(좌표 기준) 선택
                def _dist_m(r: dict) -> float:
                    loc = (r.get("geometry") or {}).get("location") or {}
                    rlat = loc.get("lat")
                    rlng = loc.get("lng")
                    if rlat is None or rlng is None:
                        return float("inf")
                    return haversine_distance(float(mv.latitude), float(mv.longitude), float(rlat), float(rlng))

                best = min(results, key=_dist_m)
                place_types = best.get("types") or []
                if place_types:
                    inferred_category = map_google_types_to_category(place_types)
                    if "bar" in place_types:
                        inferred_original_type = "bar"
            print(
                f"[COURSE] must_visit meta | id={mv.id} name={mv.name!r} types={(place_types if 'place_types' in locals() else None)} -> {inferred_category!r}",
                flush=True,
            )
        except Exception:
            # 추정 실패해도 코스 생성은 계속
            pass

        must_visit_meta[int(mv.id)] = {
            "effective_category": inferred_category,  # 추정된 카테고리 (restaurant, cafe 등)
            "original_type": inferred_original_type,  # bar 타입 식별용
        }

        if inferred_category == "restaurant" and inferred_original_type != "bar":
            must_visit_nonbar_restaurant_count += 1

    remaining_nonbar_restaurant_steps = max(
        0,
        max_nonbar_restaurants_total - must_visit_nonbar_restaurant_count,
    )

    # 1) 프로필 + 참가자 선호 기반 step 설계
    steps = build_steps_from_meeting(
        context.meeting,
        context.participants,
        max_nonbar_restaurant_steps=remaining_nonbar_restaurant_steps,
    )

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

    # 카테고리별 기본 소비 시간 정의 (프론트엔드와 동일하게)
    category_base_durations = {
        "cafe": 60,           # 카페: 1시간
        "restaurant": 60,     # 맛집: 1시간
        "bar": 90,            # 술집: 1.5시간
        "activity": 120,      # 액티비티: 2시간
        "shopping": 60,       # 쇼핑: 1시간
        "culture": 90,        # 문화시설: 1.5시간
        "nature": 180,        # 자연관광: 3시간
        "must_visit": 60,     # 필수 방문: 1시간 (기본값)
    }
    
    # 카테고리별 최소/최대 소비 시간 정의 (5분 단위)
    category_min_durations = {
        "cafe": 30,           # 카페: 최소 30분
        "restaurant": 45,     # 맛집: 최소 45분
        "bar": 60,            # 술집: 최소 1시간
        "activity": 60,       # 액티비티: 최소 1시간
        "shopping": 30,       # 쇼핑: 최소 30분
        "culture": 60,        # 문화시설: 최소 1시간
        "nature": 120,        # 자연관광: 최소 2시간
        "must_visit": 15,     # 필수 방문: 최소 15분
    }
    
    category_max_durations = {
        "cafe": 120,          # 카페: 최대 2시간
        "restaurant": 150,    # 맛집: 최대 2.5시간
        "bar": 210,           # 술집: 최대 3.5시간
        "activity": 240,      # 액티비티: 최대 4시간
        "shopping": 120,      # 쇼핑: 최대 2시간
        "culture": 180,       # 문화시설: 최대 3시간
        "nature": 360,        # 자연관광: 최대 6시간
        "must_visit": 180,    # 필수 방문: 최대 3시간
    }
    
    # meeting_duration_minutes 는 위에서 이미 파싱됨

    # 기본 duration 계산
    auto_candidates: list[dict] = []
    total_base_activity_minutes = 0
    
    # 중복 장소 제거: place_id 또는 (lat, lng) 기준으로 중복 체크
    seen_place_ids: set[str] = set()
    seen_coords: set[tuple[float, float]] = set()
    
    for idx, p in enumerate(best_course.places):
        # place_id로 중복 체크
        place_id = getattr(p, "place_id", None)
        if place_id and place_id in seen_place_ids:
            print(f"[COURSE] Skipping duplicate place (place_id): {p.name} ({place_id})", flush=True)
            continue
        
        # 좌표로 중복 체크 (place_id가 없는 경우)
        coord_key = (round(p.lat, 6), round(p.lng, 6))  # 소수점 6자리까지 반올림하여 비교
        if coord_key in seen_coords:
            print(f"[COURSE] Skipping duplicate place (coordinates): {p.name} ({p.lat}, {p.lng})", flush=True)
            continue
        
        # 중복이 아니면 추가
        if place_id:
            seen_place_ids.add(place_id)
        seen_coords.add(coord_key)
        step_idx = getattr(p, "step_index", idx)
        step_def: Optional[StepInput] = (
            steps[step_idx] if 0 <= step_idx < len(steps) else None
        )
        
        # 실제 Google Places API의 types를 사용하여 정확한 category 결정
        place_types = getattr(p, "types", [])
        if place_types:
            # Google Places API types를 내부 category로 매핑
            # map_google_types_to_category는 bar를 우선 반환하므로, bar 타입은 자동으로 "bar"로 매핑됨
            mapped_category = map_google_types_to_category(place_types)
            if mapped_category:
                category = mapped_category
            else:
                # 매핑되지 않으면 step 기반으로 fallback
                category = (
                    _category_for_step(step_def, step_idx)
                    if step_def
                    else _category_for_step_index(step_idx)
                )
        else:
            # types가 없으면 step 기반으로 fallback
            category = (
                _category_for_step(step_def, step_idx)
                if step_def
                else _category_for_step_index(step_idx)
            )
        
        # bar 타입은 category를 "bar"로 저장 (프론트에서 restaurant로 보이지 않도록)
        # map_google_types_to_category가 이미 bar를 우선 반환하지만, 검색 의도도 확인
        original_type = None
        if category == "bar" or (place_types and "bar" in place_types):
            category = "bar"
            original_type = "bar"
        elif step_def and step_def.type == "bar" and category == "restaurant":
            # 검색 의도가 "bar"이고 결과가 restaurant인 경우 bar로 보정
            category = "bar"
            original_type = "bar"
        
        # 카테고리별 기본 소비 시간 계산 (5분 단위로 반올림, 범위 내에서)
        base_duration = category_base_durations.get(category, 60)
        base_duration = adjust_duration_with_range(category, base_duration, category_min_durations, category_max_durations)
        total_base_activity_minutes += base_duration
        
        auto_candidates.append(
            {
                "name": p.name,
                "poi_name": p.name,
                "address": p.address or "",
                "lat": p.lat,
                "lng": p.lng,
                "category": category,
                "effective_category": category,
                "duration": adjust_duration_with_range(category, base_duration, category_min_durations, category_max_durations),  # 기본 시간 (범위 내 5분 단위)
                "original_type": original_type,  # bar 타입 식별용
            }
        )
    
    # meeting_duration에 맞춰 코스 시간 조정 (장소 추가/삭제)
    if meeting_duration_minutes > 0 and len(auto_candidates) > 0:
        # 현재 총 예상 시간 계산 (활동 시간 + 이동 시간 추정)
        estimated_travel_minutes = (len(auto_candidates) - 1) * 15  # 장소 간 평균 15분 이동 시간
        current_total_minutes = total_base_activity_minutes + estimated_travel_minutes
        
        # 목표 시간과의 차이
        time_difference = meeting_duration_minutes - current_total_minutes
        
        # 목표 시간보다 1시간(60분) 이상 부족하면 장소 추가
        # 또는 목표 시간의 15% 이상 부족하면 장소 추가 (더 유연한 기준)
        threshold = max(60, int(meeting_duration_minutes * 0.15))
        if time_difference > threshold:
            # 필요한 추가 활동 시간 (추정 이동 시간 제외)
            additional_places_needed = max(1, (time_difference - 60) // 90)  # 평균 90분(활동+이동)당 1개 장소 추가
            max_additional_places = min(additional_places_needed, 3)  # 최대 3개까지만 추가
            
            # 추가 steps 생성
            # bar(요리주점)은 restaurant 카테고리로 매핑되지만,
            # "식당(바 제외)" 카운트/상한에는 포함하지 않도록 별도로 취급
            used_categories: set[str] = set()
            for c in auto_candidates:
                cat = c.get("category", "")
                used_categories.add(cat)  # bar는 이미 category="bar"로 저장됨
            purposes = _normalize_list_field(context.meeting.purpose)
            vibes = _normalize_list_field(context.meeting.vibe)
            fav_activities = [p.fav_activity for p in context.participants if p.fav_activity]
            subcategories = _parse_subcategories(context.participants)  # subcategories 파싱 추가
            
            is_drink_focused = any(p in purposes for p in ["drinks", "술", "술 한잔"])
            is_cafe_focused = any(p in purposes for p in ["cafe", "카페", "수다"])
            is_activity_focused = any(p in purposes for p in ["activity", "play", "game", "활동", "체험"])
            is_calm = any(v in vibes for v in ["calm", "조용", "조용하고 편안한"])
            is_noisy = any(v in vibes for v in ["noisy-fun", "party", "떠들기"])
            is_mood = any(v in vibes for v in ["mood", "분위기"])
            has_cafe_pref = any("카페" in fav for fav in fav_activities)
            has_drink_pref = any("술" in fav or "bar" in fav.lower() for fav in fav_activities)
            has_rest_pref = any("휴식" in fav for fav in fav_activities)
            
            # 추가 장소 생성 및 검색
            # 현재 "식당(바 제외)" 방문 횟수 확인 (must_visit 포함)
            nonbar_restaurant_count = (
                sum(
                    1
                    for c in auto_candidates
                    if c.get("category") == "restaurant"  # bar는 이미 category="bar"로 저장되므로 자동 제외
                )
                + must_visit_nonbar_restaurant_count
            )
            max_nonbar_restaurants = max_nonbar_restaurants_total
            
            additional_steps = []
            for _ in range(max_additional_places):
                # 아직 사용하지 않은 카테고리 우선 선택
                # restaurant는 이미 2개 이상이면 추가하지 않음
                if "activity" not in used_categories and (is_activity_focused or len(fav_activities) > 0):
                    query, place_type = _pick_activity_query(fav_activities, subcategories)
                    additional_steps.append(StepInput(query=query, type=place_type))
                    used_categories.add("activity")
                elif "cafe" not in used_categories:
                    if is_calm:
                        query = "조용한 카페"
                    else:
                        query = "카페"
                    additional_steps.append(StepInput(query=query, type="cafe"))
                    used_categories.add("cafe")
                elif "bar" not in used_categories and (is_drink_focused or has_drink_pref):
                    query = "술집"  # 요리주점 포함
                    additional_steps.append(StepInput(query=query, type="bar"))
                    used_categories.add("bar")
                elif "restaurant" not in used_categories and nonbar_restaurant_count < max_nonbar_restaurants:
                    # "식당(바 제외)" 상한 내에서만 추가
                    query = "가성비 좋은 맛집"
                    additional_steps.append(StepInput(query=query, type="restaurant"))
                    used_categories.add("restaurant")
                    nonbar_restaurant_count += 1
                else:
                    # 기본: 카페
                    additional_steps.append(StepInput(query="카페", type="cafe"))
                    used_categories.add("cafe")
            
            # 추가 장소 검색
            if additional_steps:
                additional_req = CourseRequest(
                    center_lat=context.center_lat,
                    center_lng=context.center_lng,
                    radius=1000,
                    steps=additional_steps,
                    per_step_limit=3,  # 추가 장소는 적게
                )
                additional_response = plan_courses_internal(
                    additional_req,
                    participant_fav_activities=participant_fav_activities,
                )
                
                # 추가 장소들을 기존 코스에 추가 (중복 체크 포함)
                for step_idx, add_step in enumerate(additional_steps):
                    if step_idx < len(additional_response.courses[0].places):
                        add_place = additional_response.courses[0].places[step_idx]
                        
                        # 중복 체크: place_id 또는 좌표 기준
                        add_place_id = getattr(add_place, "place_id", None)
                        add_coord_key = (round(add_place.lat, 6), round(add_place.lng, 6))
                        
                        # 이미 추가된 장소인지 확인
                        is_duplicate = False
                        if add_place_id and add_place_id in seen_place_ids:
                            is_duplicate = True
                        elif add_coord_key in seen_coords:
                            is_duplicate = True
                        
                        if is_duplicate:
                            print(f"[COURSE] Skipping duplicate additional place: {add_place.name}", flush=True)
                            continue
                        
                        # 중복이 아니면 추가
                        if add_place_id:
                            seen_place_ids.add(add_place_id)
                        seen_coords.add(add_coord_key)
                        
                        place_types = getattr(add_place, "types", [])
                        
                        # 카테고리 결정
                        if place_types:
                            # map_google_types_to_category는 bar를 우선 반환하므로, bar 타입은 자동으로 "bar"로 매핑됨
                            mapped_category = map_google_types_to_category(place_types)
                            if mapped_category:
                                category = mapped_category
                            else:
                                category = _category_for_step(add_step, len(auto_candidates))
                        else:
                            category = _category_for_step(add_step, len(auto_candidates))
                        
                        # bar 타입은 category를 "bar"로 저장 (프론트에서 restaurant로 보이지 않도록)
                        add_original_type = None
                        if category == "bar" or (place_types and "bar" in place_types):
                            category = "bar"
                            add_original_type = "bar"
                        elif add_step.type == "bar" and category == "restaurant":
                            # 검색 의도가 "bar"이고 결과가 restaurant인 경우 bar로 보정
                            category = "bar"
                            add_original_type = "bar"
                        
                        add_duration = category_base_durations.get(category, 60)
                        add_duration = adjust_duration_with_range(category, add_duration, category_min_durations, category_max_durations)
                        
                        auto_candidates.append({
                            "name": add_place.name,
                            "poi_name": add_place.name,
                            "address": add_place.address or "",
                            "lat": add_place.lat,
                            "lng": add_place.lng,
                            "category": category,
                            "effective_category": category,
                            "duration": add_duration,
                            "original_type": add_original_type,  # bar 타입 식별용
                        })
                        total_base_activity_minutes += add_duration
        
        # restaurant들이 연속되지 않도록 순서 재배치
        # restaurant들 사이에 최소 2시간(활동 시간 기준) 간격을 두도록 조정
        # 단, 요리주점(bar 타입)은 제외 (2차로 가는 곳이라 연속되어도 괜찮음)
        if len(auto_candidates) > 1:
            # bar 타입이 아닌 restaurant만 필터링
            restaurants = [
                c for c in auto_candidates 
                if c["category"] == "restaurant"  # bar는 이미 category="bar"로 저장되므로 자동 제외
            ]
            # bar와 non-restaurant를 함께 non_restaurants로 취급
            non_restaurants = [
                c for c in auto_candidates 
                if c["category"] != "restaurant"
            ]
            
            # restaurant가 2개 이상이고, non-restaurant가 충분하면 재배치
            if len(restaurants) >= 2 and len(non_restaurants) >= len(restaurants) - 1:
                # 현재 restaurant들의 위치 확인 (bar는 이미 category="bar"로 저장되므로 자동 제외)
                restaurant_positions = [
                    i for i, c in enumerate(auto_candidates) 
                    if c["category"] == "restaurant"
                ]
                
                # 연속된 restaurant가 있는지 확인
                has_consecutive = False
                for i in range(len(restaurant_positions) - 1):
                    if restaurant_positions[i + 1] - restaurant_positions[i] == 1:
                        has_consecutive = True
                        break
                
                # 연속된 restaurant가 있거나, 사이 간격이 5시간(300분) 미만이면 재배치
                needs_reordering = has_consecutive
                if not needs_reordering and len(restaurant_positions) >= 2:
                    min_gap_minutes = 300  # 5시간
                    for i in range(len(restaurant_positions) - 1):
                        pos1, pos2 = restaurant_positions[i], restaurant_positions[i + 1]
                        gap_minutes = sum(
                            auto_candidates[j]["duration"]
                            for j in range(pos1 + 1, pos2)
                        )
                        if gap_minutes < min_gap_minutes:
                            needs_reordering = True
                            break
                
                if needs_reordering:
                    # restaurant들을 균등하게 분산 배치
                    # 예: 5개 장소 중 2개가 restaurant면, 위치 0, 3 또는 1, 4에 배치
                    total_places = len(auto_candidates)
                    num_restaurants = len(restaurants)
                    num_non_restaurants = len(non_restaurants)
                    
                    # restaurant 배치 위치 계산 (균등 분산)
                    restaurant_positions_new = []
                    if num_restaurants > 0:
                        # 첫 restaurant는 앞쪽에
                        restaurant_positions_new.append(0)
                        # 나머지 restaurant들은 균등하게 분산
                        if num_restaurants > 1:
                            gap = max(1, num_non_restaurants // (num_restaurants - 1)) if num_restaurants > 1 else 1
                            for r_idx in range(1, num_restaurants):
                                pos = r_idx * gap + 1
                                restaurant_positions_new.append(min(pos, total_places - 1))
                    
                    # 중복 제거 및 정렬
                    restaurant_positions_new = sorted(list(set(restaurant_positions_new)))
                    
                    # 새 순서 구성: restaurant(bar 제외)와 non-restaurant(bar 포함)를 배치
                    new_order = []
                    restaurant_idx = 0
                    non_restaurant_idx = 0
                    
                    for i in range(total_places):
                        if i in restaurant_positions_new and restaurant_idx < len(restaurants):
                            new_order.append(restaurants[restaurant_idx])
                            restaurant_idx += 1
                        elif non_restaurant_idx < len(non_restaurants):
                            new_order.append(non_restaurants[non_restaurant_idx])
                            non_restaurant_idx += 1
                    
                    # 남은 장소들 추가 (혹시 모를 경우)
                    while restaurant_idx < len(restaurants):
                        new_order.append(restaurants[restaurant_idx])
                        restaurant_idx += 1
                    while non_restaurant_idx < len(non_restaurants):
                        new_order.append(non_restaurants[non_restaurant_idx])
                        non_restaurant_idx += 1
                    
                    # 재배치된 순서로 업데이트 (전체 장소 수 유지)
                    auto_candidates = new_order[:total_places]
        
        # 목표 시간보다 1시간(60분) 이상 초과하면 장소 제거 (뒤에서부터)
        elif time_difference < -60:
            # 제거할 장소 수 계산
            places_to_remove = min(
                max(1, (-time_difference - 60) // 90),  # 평균 90분당 1개 장소 제거
                len(auto_candidates) - 1  # 최소 1개는 남김
            )
            
            # 뒤에서부터 제거 (마지막 장소들 제거)
            for _ in range(places_to_remove):
                if len(auto_candidates) > 1:
                    removed = auto_candidates.pop()
                    removed_duration = removed.get("duration", 0) or 0
                    total_base_activity_minutes -= removed_duration
        
        # duration 미세 조정 (1시간 이내 차이는 duration으로 조정)
        else:
            # 목표 활동 시간 = meeting_duration - 추정 이동 시간
            estimated_travel_minutes = (len(auto_candidates) - 1) * 15
            target_activity_minutes = max(0, meeting_duration_minutes - estimated_travel_minutes)
            time_diff = target_activity_minutes - total_base_activity_minutes
            
            # 각 장소당 최대 20분까지만 추가
            if time_diff > 0:
                max_additional_per_place = 20
                total_possible_additional = len(auto_candidates) * max_additional_per_place
                actual_additional = min(time_diff, total_possible_additional)
                
                additional_per_place = min(
                    actual_additional // len(auto_candidates),
                    max_additional_per_place
                )
                
                for candidate in auto_candidates:
                    current_duration = candidate.get("duration", 0)
                    category = candidate.get("category", "activity")
                    new_duration = adjust_duration_with_range(
                        category, 
                        current_duration + additional_per_place,
                        category_min_durations,
                        category_max_durations
                    )
                    candidate["duration"] = new_duration
                
                remaining = actual_additional - (additional_per_place * len(auto_candidates))
                if remaining > 0 and len(auto_candidates) > 0:
                    max_add_to_last = max_additional_per_place - additional_per_place
                    add_to_last = min(remaining, max_add_to_last)
                    last_candidate = auto_candidates[-1]
                    last_category = last_candidate.get("category", "activity")
                    last_current_duration = last_candidate.get("duration", 0)
                    last_candidate["duration"] = adjust_duration_with_range(
                        last_category,
                        last_current_duration + add_to_last,
                        category_min_durations,
                        category_max_durations
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

        # must_visit의 실제 카테고리를 추정한 경우, 그 카테고리 기준으로 duration 설정
        meta = must_visit_meta.get(int(mv.id)) if mv.id is not None else None
        effective_category = (meta or {}).get("effective_category")
        original_type = (meta or {}).get("original_type")
        
        # effective_category가 없으면 이름 기반으로 추정 시도
        if not effective_category:
            name_lower = mv.name.lower()
            # 이름에 포함된 키워드로 카테고리 추정
            if any(keyword in name_lower for keyword in ["스시", "초밥", "회", "일식", "맛집", "식당", "레스토랑", "restaurant", "sushi"]):
                effective_category = "restaurant"
            elif any(keyword in name_lower for keyword in ["카페", "커피", "cafe", "coffee"]):
                effective_category = "cafe"
            elif any(keyword in name_lower for keyword in ["쇼핑", "몰", "마트", "백화점", "shopping", "mall"]):
                effective_category = "shopping"
            elif any(keyword in name_lower for keyword in ["술집", "바", "펜", "bar", "pub"]):
                effective_category = "bar"
            elif any(keyword in name_lower for keyword in ["공원", "전시", "박물관", "미술관", "culture", "museum"]):
                effective_category = "culture"
            else:
                # 추정 실패 시 기본값을 restaurant로 설정 (대부분의 must_visit이 식당이므로)
                effective_category = "restaurant"
        
        # category는 항상 effective_category로 저장 (must_visit이 아닌 실제 카테고리)
        save_category = effective_category
        
        # 디버깅: must_visit 카테고리 추정값 확인
        print(f"[COURSE] must_visit inferred | id={mv.id} name={mv.name!r} -> {save_category!r}", flush=True)

        base_dur = category_base_durations.get(save_category, category_base_durations.get("restaurant", 60))
        must_visit_duration = adjust_duration_with_range(
            save_category,
            base_dur,
            category_min_durations,
            category_max_durations,
        )
        
        must_visit_candidates.append(
            {
                "name": label,
                "poi_name": mv.name,
                "address": mv.address or "",
                "lat": mv.latitude,
                "lng": mv.longitude,
                # category는 항상 추정된 카테고리로 저장 (must_visit이 아님)
                "category": save_category,
                # 내부 제약 계산용(호환): effective_category에도 동일 값 유지
                "effective_category": effective_category,
                "original_type": original_type,
                "duration": must_visit_duration,
            }
        )

    # 5) 최종 MeetingPlace 후보 순서 구성
    #    - must_visit 장소와 겹치는 카테고리는 auto_candidates에서 제거
    #    - must_visit 장소를 적절한 위치에 배치 (첫/마지막이 아닌 중간 부분)
    #    - restaurant 간격 제약(5시간)을 만족하면서 이동시간 최소화
    
    # must_visit의 추정 카테고리 목록 (must_visit이 이미 해당 카테고리를 담당)
    # category를 직접 사용 (이제 category가 항상 추정된 카테고리로 저장됨)
    must_visit_categories = set()
    for mv_cand in must_visit_candidates:
        mv_category = mv_cand.get("category")
        if mv_category:  # category는 항상 추정된 카테고리이므로 그대로 사용
            must_visit_categories.add(mv_category)
    
    # auto_candidates에서 must_visit과 같은 카테고리 제거 (중복 방지)
    filtered_auto_candidates = []
    for auto_cand in auto_candidates:
        auto_category = auto_cand.get("category")
        if auto_category not in must_visit_categories:
            filtered_auto_candidates.append(auto_cand)
        else:
            print(
                f"[COURSE] Removing duplicate category '{auto_category}' from auto_candidates "
                f"(already covered by must_visit: {auto_cand.get('name')})",
                flush=True,
            )
    
    all_candidates = must_visit_candidates + filtered_auto_candidates
    
    # 최종 restaurant 개수 검증 및 제한 (must_visit의 effective_category도 고려)
    def _count_restaurants(candidates: list[dict]) -> int:
        """restaurant 카테고리 개수 카운트 (must_visit의 effective_category도 고려)"""
        count = 0
        for cand in candidates:
            # category가 "restaurant"이거나, effective_category가 "restaurant"인 경우
            category = cand.get("category", "")
            effective_category = cand.get("effective_category", "")
            if category == "restaurant" or effective_category == "restaurant":
                count += 1
        return count
    
    total_restaurant_count = _count_restaurants(all_candidates)
    
    # restaurant 제한 초과 시 auto_candidates에서 제거
    if total_restaurant_count > max_nonbar_restaurants_total:
        excess_count = total_restaurant_count - max_nonbar_restaurants_total
        removed_count = 0
        
        # auto_candidates에서 restaurant 제거 (must_visit은 보존)
        new_filtered_auto_candidates = []
        for auto_cand in filtered_auto_candidates:
            if removed_count >= excess_count:
                new_filtered_auto_candidates.append(auto_cand)
            else:
                category = auto_cand.get("category", "")
                if category == "restaurant":
                    removed_count += 1
                    print(
                        f"[COURSE] Removing excess restaurant '{auto_cand.get('name')}' "
                        f"(limit: {max_nonbar_restaurants_total}, current: {total_restaurant_count})",
                        flush=True,
                    )
                else:
                    new_filtered_auto_candidates.append(auto_cand)
        
        filtered_auto_candidates = new_filtered_auto_candidates
        all_candidates = must_visit_candidates + filtered_auto_candidates
    
    # 코스 순서 최적화 (이동시간 최소화 + restaurant 간격 제약)
    final_candidates = optimize_course_order_with_constraints(
        all_candidates,
        restaurant_min_gap_minutes=300  # 5시간
    )

    # 6) 각 장소 간 이동시간 계산 및 저장
    # 참가자들의 이동 수단 선호도 확인
    transit_pref_count = sum(
        1
        for p in context.participants
        if p.transportation
        and ("대중교통" in p.transportation or "transit" in p.transportation.lower())
    )
    driving_pref_count = sum(
        1
        for p in context.participants
        if p.transportation
        and (
            "자동차" in p.transportation
            or "driving" in p.transportation.lower()
            or "차" in p.transportation
        )
    )

    has_transit_pref = transit_pref_count > 0
    has_driving_pref = driving_pref_count > 0

    # 그룹 이동수단 선호:
    # - 혼합이면(대중교통+자동차) 기본은 대중교통 우선 (중간에 driving이 끼는 걸 방지)
    # - 전원이 자동차거나 자동차가 명확히 다수면 driving 우선
    prefer_transit_group = has_transit_pref and (transit_pref_count >= driving_pref_count)
    prefer_driving_group = has_driving_pref and (driving_pref_count > transit_pref_count)

    # 대중교통 우선 그룹에서도 driving이 압도적으로 빠르면(예: 20분 이상) 예외적으로 허용
    DRIVING_OVERRIDE_IF_FASTER_BY_MIN = 20
    
    # Haversine 공식으로 두 위경도 지점 간의 거리(미터) 계산
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371e3  # 지구 반지름 (미터)
        φ1 = math.radians(lat1)
        φ2 = math.radians(lat2)
        Δφ = math.radians(lat2 - lat1)
        Δλ = math.radians(lon2 - lon1)
        
        a = (
            math.sin(Δφ / 2) * math.sin(Δφ / 2) +
            math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) * math.sin(Δλ / 2)
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    # 보행 속도 (5 km/h = 5000m / 60min = 83.33 m/min)
    WALKING_SPEED_M_PER_MIN = 83.33
    
    # 거리(미터)를 보행 시간(분)으로 변환
    def calculate_walking_time_minutes(distance_meters: float) -> float:
        return distance_meters / WALKING_SPEED_M_PER_MIN
    
    # 각 장소 간 이동시간 계산
    for idx in range(1, len(final_candidates)):
        prev_candidate = final_candidates[idx - 1]
        current_candidate = final_candidates[idx]
        
        # 같은 좌표인 경우 이동 시간 0분
        if prev_candidate["lat"] == current_candidate["lat"] and prev_candidate["lng"] == current_candidate["lng"]:
            final_candidates[idx]["travel_time_from_prev"] = 0
            final_candidates[idx]["travel_mode_from_prev"] = "walking"
            continue
        
        # 도보 시간 계산 (항상 계산)
        distance_m = haversine_distance(
            prev_candidate["lat"], prev_candidate["lng"],
            current_candidate["lat"], current_candidate["lng"]
        )
        walking_minutes = calculate_walking_time_minutes(distance_m)
        
        # 대중교통, 자동차 시간 계산 (선호도가 있으면 계산)
        transit_minutes = None
        driving_minutes = None
        
        try:
            if has_transit_pref or not has_driving_pref:  # 대중교통 선호 또는 자동차 선호 없으면
                transit_result = await get_travel_time(
                    start_lat=prev_candidate["lat"],
                    start_lng=prev_candidate["lng"],
                    goal_lat=current_candidate["lat"],
                    goal_lng=current_candidate["lng"],
                    mode="transit",
                )
                if transit_result and transit_result.get("success"):
                    transit_minutes = transit_result["duration_seconds"] / 60.0
            
            if has_driving_pref or not has_transit_pref:  # 자동차 선호 또는 대중교통 선호 없으면
                driving_result = await get_travel_time(
                    start_lat=prev_candidate["lat"],
                    start_lng=prev_candidate["lng"],
                    goal_lat=current_candidate["lat"],
                    goal_lng=current_candidate["lng"],
                    mode="driving",
                )
                if driving_result and driving_result.get("success"):
                    driving_minutes = driving_result["duration_seconds"] / 60.0
        except Exception as e:
            # API 호출 실패 시 도보 시간만 사용
            pass
        
        # 최적 이동 수단 결정 (프론트엔드 로직과 동일)
        available_times = []
        if walking_minutes is not None:
            available_times.append(("walking", walking_minutes))

        # 그룹 선호를 반영해서 모드 후보를 구성
        if prefer_transit_group:
            if transit_minutes is not None:
                available_times.append(("transit", transit_minutes))
            # 대중교통 우선 그룹에서는 transit이 없을 때 driving으로 떨어지지 않도록 함
            # (이 경우 walking만으로 결정됨)
            # 둘 다 있는 경우, driving이 압도적으로 빠를 때만 허용
            if (
                transit_minutes is not None
                and driving_minutes is not None
                and (transit_minutes - driving_minutes) >= DRIVING_OVERRIDE_IF_FASTER_BY_MIN
            ):
                available_times.append(("driving", driving_minutes))
        elif prefer_driving_group:
            if driving_minutes is not None:
                available_times.append(("driving", driving_minutes))
            # 자동차가 없으면 transit을 fallback으로 허용
            if driving_minutes is None and transit_minutes is not None:
                available_times.append(("transit", transit_minutes))
        else:
            # 선호를 알 수 없으면 가능한 모드 모두 고려
            if transit_minutes is not None:
                available_times.append(("transit", transit_minutes))
            if driving_minutes is not None:
                available_times.append(("driving", driving_minutes))
        
        if not available_times:
            # 모든 계산 실패 시 도보 시간 사용
            final_candidates[idx]["travel_time_from_prev"] = int(round(walking_minutes))
            final_candidates[idx]["travel_mode_from_prev"] = "walking"
            continue
        
        # 최소 시간 찾기
        min_time_mode, min_time = min(available_times, key=lambda x: x[1])
        
        # 도보가 다른 모드와 10분 이내 차이면 도보 선택
        other_times = [t for mode, t in available_times if mode != "walking"]
        if other_times and walking_minutes is not None:
            min_other_time = min(other_times)
            if abs(walking_minutes - min_other_time) <= 10:
                min_time_mode = "walking"
                min_time = walking_minutes
        
        final_candidates[idx]["travel_time_from_prev"] = int(round(min_time))
        final_candidates[idx]["travel_mode_from_prev"] = min_time_mode
    
    # 첫 번째 장소는 이전 장소가 없으므로 None
    if final_candidates:
        final_candidates[0]["travel_time_from_prev"] = None
        final_candidates[0]["travel_mode_from_prev"] = None
    
    # 6-2) 실제 이동시간 계산 후 재조정 (목표 시간과의 차이가 크면 추가 조정)
    if meeting_duration_minutes > 0 and len(final_candidates) > 0:
        # 실제 총 시간 계산 (활동 시간 + 실제 이동 시간)
        actual_travel_minutes = sum(
            c.get("travel_time_from_prev", 0) or 0 
            for c in final_candidates
        )
        actual_activity_minutes = sum(
            (d if d is not None else 0)
            for c in final_candidates
            for d in [c.get("duration")]
        )
        actual_total_minutes = actual_activity_minutes + actual_travel_minutes
        
        # 목표 시간과의 차이
        time_difference = meeting_duration_minutes - actual_total_minutes
        
        # 목표 시간과 30분 이상 차이나면 추가 조정
        if abs(time_difference) > 30:
            if time_difference > 30:  # 목표 시간보다 부족
                # 장소당 최대 20분씩 추가할 수 있는 시간
                max_additional_per_place = 20
                total_possible_additional = len(final_candidates) * max_additional_per_place
                actual_additional = min(time_difference, total_possible_additional)
                
                if actual_additional > 0:
                    additional_per_place = actual_additional // len(final_candidates)
                    remaining = actual_additional % len(final_candidates)
                    
                    for candidate in final_candidates:
                        current_duration = candidate.get("duration")
                        if current_duration is None:
                            current_duration = category_base_durations.get(candidate.get("category", "activity"), 60)
                        category = candidate.get("category", "activity")
                        new_duration = adjust_duration_with_range(
                            category,
                            current_duration + additional_per_place,
                            category_min_durations,
                            category_max_durations
                        )
                        candidate["duration"] = new_duration
                    
                    # 남은 시간은 마지막 장소에 추가
                    if remaining > 0 and len(final_candidates) > 0:
                        last_candidate = final_candidates[-1]
                        last_duration = last_candidate.get("duration")
                        if last_duration is None:
                            last_duration = category_base_durations.get(last_candidate.get("category", "activity"), 60)
                        last_category = last_candidate.get("category", "activity")
                        last_candidate["duration"] = adjust_duration_with_range(
                            last_category,
                            last_duration + remaining,
                            category_min_durations,
                            category_max_durations
                        )
                    
                    print(f"[COURSE] 실제 이동시간 반영 후 duration 조정: +{actual_additional}분 분배")
            
            elif time_difference < -30:  # 목표 시간보다 초과
                # 장소당 최대 20분씩 감소
                max_reduction_per_place = 20
                total_possible_reduction = len(final_candidates) * max_reduction_per_place
                actual_reduction = min(abs(time_difference), total_possible_reduction)
                
                if actual_reduction > 0:
                    reduction_per_place = actual_reduction // len(final_candidates)
                    remaining = actual_reduction % len(final_candidates)
                    
                    for candidate in final_candidates:
                        current_duration = candidate.get("duration")
                        if current_duration is None:
                            current_duration = category_base_durations.get(candidate.get("category", "activity"), 60)
                        category = candidate.get("category", "activity")
                        new_duration = adjust_duration_with_range(
                            category,
                            current_duration - reduction_per_place,
                            category_min_durations,
                            category_max_durations
                        )
                        candidate["duration"] = new_duration
                    
                    # 남은 시간은 마지막 장소에서 감소
                    if remaining > 0 and len(final_candidates) > 0:
                        last_candidate = final_candidates[-1]
                        last_duration = last_candidate.get("duration")
                        if last_duration is None:
                            last_duration = category_base_durations.get(last_candidate.get("category", "activity"), 60)
                        last_category = last_candidate.get("category", "activity")
                        last_candidate["duration"] = adjust_duration_with_range(
                            last_category,
                            last_duration - remaining,
                            category_min_durations,
                            category_max_durations
                        )
                    
                    print(f"[COURSE] 실제 이동시간 반영 후 duration 조정: -{actual_reduction}분 감소")

    # 7) 코스 장소 저장 (meeting_point는 보존)
    _save_course_places(db, meeting_id, final_candidates)

    return course_response


def _save_course_places(db: Session, meeting_id: int, candidates: list[dict]):
    """
    코스 장소만 저장. meeting_point 카테고리는 보존 (중간 위치 후보 유지)
    """
    db_meeting = (
        db.query(models.Meeting)
        .options(joinedload(models.Meeting.places))
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # meeting_point 카테고리는 삭제하지 않고 보존
    meeting_points = [p for p in db_meeting.places if p.category == "meeting_point"]
    
    # meeting_point가 아닌 기존 장소만 삭제 (코스 장소)
    non_meeting_points = [p for p in db_meeting.places if p.category != "meeting_point"]
    for place in non_meeting_points:
        db.delete(place)
    
    db.commit()

    # 새 코스 장소 추가
    new_places: list[models.MeetingPlace] = []
    for c in candidates:
        db_place = models.MeetingPlace(
            meeting_id=meeting_id,
            name=c["name"],
            latitude=c["lat"],
            longitude=c["lng"],
            address=c["address"],
            category=c.get("category"),
            duration=c.get("duration"),
            poi_name=c.get("poi_name"),
            travel_time_from_prev=c.get("travel_time_from_prev"),
            travel_mode_from_prev=c.get("travel_mode_from_prev"),
        )
        db.add(db_place)
        new_places.append(db_place)

    db.commit()
    for p in new_places:
        db.refresh(p)

    return new_places