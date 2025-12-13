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
    steps: List[StepInput] = Field(..., min_items=3, max_items=3)
    per_step_limit: int = Field(5, description="각 단계별 후보 최대 개수")


class PlaceCandidate(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    rating: float = 0.0
    user_ratings_total: int = 0
    address: str | None = None
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
                step_index=step_index,
            )
        )
    return candidates


def score_course(a: PlaceCandidate, b: PlaceCandidate, c: PlaceCandidate) -> Course:
    """
    길이 3 코스의 점수를 계산한다.
    - 평점 보너스: rating 합
    - 이동 거리 패널티: 총 거리(m)에 -lambda 곱
    """
    d1 = haversine_distance(a.lat, a.lng, b.lat, b.lng)
    d2 = haversine_distance(b.lat, b.lng, c.lat, c.lng)
    total_d = d1 + d2

    rating_sum = a.rating + b.rating + c.rating

    # 거리 패널티 정도는 나중에 튜닝 가능
    lambda_ = 0.05 / 100.0
    score = rating_sum - lambda_ * total_d

    return Course(
        score=score,
        total_distance_m=total_d,
        places=[a, b, c],
    )


# ---------- 내부 로직 함수 (서비스/다른 라우터에서 재사용용) ----------

def plan_courses_internal(req: CourseRequest) -> CourseResponse:
    """
    실제 코스 생성 로직.
    - FastAPI 의존성 없이 순수 Python 함수라
      /courses/plan 이나 /meetings/{id}/courses/auto 에서 재사용 가능.
    """
    if len(req.steps) != 3:
        raise HTTPException(status_code=400, detail="steps must have length 3")

    all_candidates: List[List[PlaceCandidate]] = []

    for idx, step in enumerate(req.steps):
        # ✅ 서비스 레벨 fetch_nearby_places 사용
        print(
            f"[COURSE] Step {idx}: Searching with keyword='{step.query}', type='{step.type}', "
            f"location=({req.center_lat:.6f}, {req.center_lng:.6f}), radius={req.radius}",
            flush=True
        )
        
        places_raw = fetch_nearby_places(
            lat=req.center_lat,
            lng=req.center_lng,
            radius=req.radius,
            keyword=step.query,
            type=step.type,
        )

        print(
            f"[COURSE] Step {idx}: Raw results count = {len(places_raw)}",
            flush=True
        )

        # 평점/개수 필터 (필요하면 여기서 min_rating, sorting 등 추가)
        filtered = places_raw[: req.per_step_limit]
        step_candidates = to_candidates(filtered, step_index=idx)

        print(
            f"[COURSE] Step {idx}: Valid candidates (with lat/lng) count = {len(step_candidates)}",
            flush=True
        )

        if not step_candidates:
            # API 응답에서 상태 확인 (실패 원인 파악)
            # places_raw가 비어있으면 fetch_nearby_places에서 이미 로그를 남겼지만
            # 여기서도 명확하게 표시
            error_detail = (
                f"No valid candidates (with lat/lng) for step {idx}. "
                f"Search params: keyword='{step.query}', type='{step.type}', "
                f"location=({req.center_lat:.6f}, {req.center_lng:.6f}), radius={req.radius}. "
                f"Raw results from API: {len(places_raw)} places found. "
                f"Possible causes: 1) Google Places API not enabled/configured correctly, "
                f"2) No places match the search criteria in the area, "
                f"3) API key issues. Check server logs for [GGL] messages for details."
            )
            print(f"[COURSE] ERROR: {error_detail}", flush=True)
            raise HTTPException(
                status_code=404,
                detail=error_detail,
            )

        all_candidates.append(step_candidates)

    movies = all_candidates[0]
    meals = all_candidates[1]
    cafes = all_candidates[2]

    best_courses: List[Course] = []

    # 길이 3 완전 탐색 (movie × meal × cafe)
    for a in movies:
        for b in meals:
            for c in cafes:
                course = score_course(a, b, c)
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