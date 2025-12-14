# app/routers/course.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
import math

# ✅ 서비스 레벨 Google Places 호출 사용 (파일 이름에 s 붙음!)
from ..services.google_places_services import fetch_nearby_places

router = APIRouter(prefix="/courses", tags=["Courses"])


# ---------- Pydantic Models ----------

class StepInput(BaseModel):
    query: str = Field(..., description="검색어, 예: 영화관, 파스타, 카페")
    type: str = Field(
        "restaurant",
        description="Google Places type, 예: movie_theater, restaurant, cafe",
    )


class CourseRequest(BaseModel):
    center_lat: float
    center_lng: float
    radius: int = Field(1000, description="미터 단위 검색 반경")
    steps: List[StepInput] = Field(..., min_items=1, description="코스 단계 (최소 1개 이상)")
    per_step_limit: int = Field(5, description="각 단계별 후보 최대 개수")


class PlaceCandidate(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    rating: float = 0.0
    user_ratings_total: int = 0
    address: str | None = None
    types: List[str] = []  # Google Places API의 types 필드
    step_index: int  # 0: 1단계, 1: 2단계, 2: 3단계


class Course(BaseModel):
    score: float
    total_distance_m: float
    places: List[PlaceCandidate]


class CourseResponse(BaseModel):
    courses: List[Course]


# ---------- Utils ----------

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    위경도 두 점 사이의 대략적인 거리(m)를 계산 (직선 거리)
    """
    R = 6371000  # 지구 반지름 (m)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def to_candidates(
    raw_places: list[dict],
    step_index: int,
) -> List[PlaceCandidate]:
    """
    fetch_nearby_places 응답의 place(dict)를 PlaceCandidate로 변환
    """
    candidates: List[PlaceCandidate] = []
    for p in raw_places:
        loc = p.get("geometry", {}).get("location", {})
        lat = loc.get("lat")
        lng = loc.get("lng")
        if lat is None or lng is None:
            continue

        candidates.append(
            PlaceCandidate(
                place_id=p.get("place_id"),
                name=p.get("name", ""),
                lat=lat,
                lng=lng,
                rating=p.get("rating", 0.0) or 0.0,
                user_ratings_total=p.get("user_ratings_total", 0) or 0,
                address=p.get("vicinity"),  # google_api에서 쓰던 필드명 그대로
                types=p.get("types", []),  # Google Places API의 types 저장
                step_index=step_index,
            )
        )
    return candidates


def _map_place_type_to_category(place_type: str) -> str:
    """
    Google Places type을 한글 카테고리로 매핑
    """
    type_lower = place_type.lower()
    
    # 맛집 관련
    if type_lower in ["restaurant", "food", "meal_delivery", "meal_takeaway"]:
        return "맛집"
    # 카페 관련
    if type_lower in ["cafe", "bakery"]:
        return "카페"
    # 술자리 관련
    if type_lower in ["bar", "night_club", "liquor_store"]:
        return "술자리"
    # 액티비티 관련
    if type_lower in [
        "movie_theater", "amusement_park", "aquarium", "bowling_alley",
        "gym", "park", "tourist_attraction", "zoo", "stadium", "museum",
        "art_gallery", "spa", "beauty_salon"
    ]:
        return "액티비티"
    # 휴식 관련
    if type_lower in ["spa", "beauty_salon", "hair_care", "massage"]:
        return "휴식"
    
    return "기타"


def score_course(
    places: List[PlaceCandidate],
    steps: List[StepInput] = None,
    participant_fav_activities: List[str] = None,
) -> Course:
    """
    가변 길이 코스의 점수를 계산한다 (휴리스틱 방식).
    - 평점 보너스: rating 합
    - 이동 거리 패널티: 총 거리(m)에 -lambda 곱
    - 참가자 선호도 보너스: fav_activity와 매칭되는 장소에 보너스
    - 카테고리 중복 패널티: 같은 카테고리가 연속되면 패널티
    """
    if len(places) < 1:
        raise ValueError("course must have at least 1 place")
    
    participant_fav_activities = participant_fav_activities or []
    steps = steps or []
    
    # 연속된 장소들 간의 거리 계산
    total_d = 0.0
    if len(places) > 1:
        for i in range(len(places) - 1):
            d = haversine_distance(
                places[i].lat, places[i].lng,
                places[i + 1].lat, places[i + 1].lng
            )
            total_d += d

    # 평점 합계
    rating_sum = sum(p.rating for p in places)
    
    # 참가자 선호도 보너스 계산
    preference_bonus = 0.0
    category_list = []  # 카테고리 추적용 (실제 Google Places API types 기반)
    
    # Google Places API types를 내부 category로 매핑하는 함수 import
    from core.place_category import map_google_types_to_category
    
    for place in places:
        # 실제 Google Places API의 types를 사용하여 정확한 category 결정
        place_types = getattr(place, "types", [])
        place_category = None
        
        if place_types:
            # Google Places API types를 내부 category로 매핑
            mapped_category = map_google_types_to_category(place_types)
            if mapped_category:
                # 내부 category를 한글 카테고리로 변환
                if mapped_category == "restaurant":
                    place_category = "맛집"
                elif mapped_category == "cafe":
                    place_category = "카페"
                elif mapped_category in ["activity", "culture", "nature"]:
                    place_category = "액티비티"
                elif mapped_category == "shopping":
                    place_category = "쇼핑"
                else:
                    place_category = "기타"
        
        # types가 없거나 매핑 실패 시 step 기반으로 fallback
        if not place_category:
            step_idx = place.step_index
            if 0 <= step_idx < len(steps):
                place_type = steps[step_idx].type
                place_category = _map_place_type_to_category(place_type)
            else:
                place_category = "기타"
        
        category_list.append(place_category)
        
        # 참가자들의 fav_activity와 매칭 확인
        for fav_activity in participant_fav_activities:
            fav_lower = fav_activity.lower().strip()
            category_lower = place_category.lower()
            
            # 직접 매칭
            if fav_lower == category_lower:
                preference_bonus += 3.0  # 높은 보너스 (2.0 -> 3.0 증가)
            # 부분 매칭 (예: "카페" in "카페/디저트")
            elif fav_lower in category_lower or category_lower in fav_lower:
                preference_bonus += 1.5  # 1.0 -> 1.5 증가
            # 유사 매칭 (예: "맛집"과 "restaurant")
            elif (fav_lower in ["맛집", "식당"] and category_lower == "맛집") or \
                 (fav_lower in ["술자리", "술집"] and category_lower == "술자리") or \
                 (fav_lower in ["액티비티", "놀거리"] and category_lower == "액티비티"):
                preference_bonus += 2.0  # 1.5 -> 2.0 증가
    
    # 카테고리 중복 패널티 계산 (강화)
    category_penalty = 0.0
    if len(category_list) > 1:
        from collections import Counter
        category_counter = Counter(category_list)
        
        # 전체 중복 패널티: 같은 카테고리가 2번 이상 나타나면 강한 패널티
        for category, count in category_counter.items():
            if category != "기타" and count > 1:
                # 중복 횟수에 따라 제곱으로 패널티 증가 (더 강하게)
                category_penalty += (count - 1) ** 2 * 1.5
        
        # 연속 중복 추가 패널티
        prev_category = None
        consecutive_same_category = 0
        for category in category_list:
            if category == prev_category and category != "기타":
                consecutive_same_category += 1
                # 연속 중복은 더 강한 패널티
                category_penalty += consecutive_same_category * 1.0
            else:
                consecutive_same_category = 0
            prev_category = category
    
    # 카테고리 다양성 보너스 (서로 다른 카테고리가 많을수록 보너스)
    diversity_bonus = 0.0
    if len(category_list) > 1:
        unique_categories = len(set([c for c in category_list if c != "기타"]))
        # 고유 카테고리 수가 많을수록 보너스 (최대 3개 카테고리까지)
        diversity_bonus = min(unique_categories - 1, 2) * 1.0  # 2개면 +1.0, 3개면 +2.0
    
    # 거리 패널티
    lambda_ = 0.05 / 100.0
    distance_penalty = lambda_ * total_d
    
    # 최종 점수 계산
    score = rating_sum + preference_bonus + diversity_bonus - distance_penalty - category_penalty
    
    # 단일 장소인 경우 거리 패널티 없음
    if len(places) == 1:
        total_d = 0.0

    return Course(
        score=score,
        total_distance_m=total_d,
        places=places,
    )


# ---------- 내부 로직 함수 (서비스/다른 라우터에서 재사용용) ----------

def plan_courses_internal(
    req: CourseRequest,
    participant_fav_activities: List[str] = None,
) -> CourseResponse:
    """
    실제 코스 생성 로직.
    - FastAPI 의존성 없이 순수 Python 함수라
      /courses/plan 이나 /meetings/{id}/courses/auto 에서 재사용 가능.
    - 유연한 개수의 steps 지원 (최소 1개 이상)
    - 참가자 선호도(fav_activity)를 고려한 휴리스틱 점수 계산
    """
    if len(req.steps) < 1:
        raise HTTPException(status_code=400, detail="steps must have at least 1 item")

    participant_fav_activities = participant_fav_activities or []

    all_candidates: List[List[PlaceCandidate]] = []

    for idx, step in enumerate(req.steps):
        # ✅ 서비스 레벨 fetch_nearby_places 사용
        places_raw = fetch_nearby_places(
            lat=req.center_lat,
            lng=req.center_lng,
            radius=req.radius,
            keyword=step.query,
            type=step.type,
        )

        # 평점/개수 필터 (필요하면 여기서 min_rating, sorting 등 추가)
        filtered = places_raw[: req.per_step_limit]
        step_candidates = to_candidates(filtered, step_index=idx)

        # 검색 결과가 없으면 더 단순한 검색어로 fallback 시도
        if not step_candidates:
            # keyword가 있으면 keyword 없이 type만으로 재시도
            if step.query:
                places_raw_fallback = fetch_nearby_places(
                    lat=req.center_lat,
                    lng=req.center_lng,
                    radius=req.radius,
                    keyword=None,  # keyword 제거
                    type=step.type,
                )
                filtered_fallback = places_raw_fallback[: req.per_step_limit]
                step_candidates = to_candidates(filtered_fallback, step_index=idx)
            
            # 여전히 결과가 없으면 에러
            if not step_candidates:
                error_detail = (
                    f"No valid candidates (with lat/lng) for step {idx}. "
                    f"Search params: keyword='{step.query}', type='{step.type}', "
                    f"location=({req.center_lat:.6f}, {req.center_lng:.6f}), radius={req.radius}. "
                    f"Raw results from API: {len(places_raw)} places found. "
                    f"Tried fallback without keyword, still no results. "
                    f"Possible causes: 1) Google Places API not enabled/configured correctly, "
                    f"2) No places match the search criteria in the area, "
                    f"3) API key issues. Check server logs for [GGL] messages for details."
                )
                raise HTTPException(
                    status_code=404,
                    detail=error_detail,
                )

        all_candidates.append(step_candidates)

    best_courses: List[Course] = []

    # 동적 길이 완전 탐색 (모든 조합 생성)
    # 예: 2 steps면 candidates[0] × candidates[1], 3 steps면 candidates[0] × candidates[1] × candidates[2]
    from itertools import product
    
    print(
        f"[COURSE] Scoring courses with participant preferences: {participant_fav_activities}",
        flush=True
    )
    
    for place_combination in product(*all_candidates):
        course = score_course(
            list(place_combination),
            steps=req.steps,
            participant_fav_activities=participant_fav_activities,
        )
        best_courses.append(course)

    if not best_courses:
        raise HTTPException(status_code=404, detail="No course candidates generated")

    best_courses.sort(key=lambda x: x.score, reverse=True)
    top_k = best_courses[:5]
    

    return CourseResponse(courses=top_k)


# ---------- HTTP Endpoint (기존 기능 유지) ----------

@router.post("/plan", response_model=CourseResponse)
def plan_fixed_length_3_course(req: CourseRequest) -> CourseResponse:
    """
    기존 /courses/plan 엔드포인트 (그대로 유지)
    """
    return plan_courses_internal(req)