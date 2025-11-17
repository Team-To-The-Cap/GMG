# app/routers/course.py (예시 경로)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
import math

# google_api.py 위치에 맞게 import 경로 조정
# 예: from api.v1.endpoints.google_api import get_nearby_places
from .google_api import get_nearby_places  # 같은 폴더라면 이렇게

router = APIRouter(prefix="/courses", tags=["Courses"])


# ---------- Pydantic Models ----------

class StepInput(BaseModel):
    query: str = Field(..., description="검색어, 예: 영화관, 파스타, 카페")
    type: str = Field("restaurant", description="Google Places type, 예: movie_theater, restaurant, cafe")


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
    step_index: int  # 0: 1단계(예: 영화), 1: 2단계(밥), 2: 3단계(카페)


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

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def to_candidates(
    raw_places: list[dict],
    step_index: int,
) -> List[PlaceCandidate]:
    """
    /maps/places 응답의 cleaned place(dict)를 PlaceCandidate로 변환
    """
    candidates: List[PlaceCandidate] = []
    for p in raw_places:
        loc = p.get("location") or {}
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
                address=p.get("address"),
                step_index=step_index,
            )
        )
    return candidates


def score_course(a: PlaceCandidate, b: PlaceCandidate, c: PlaceCandidate) -> Course:
    """
    길이 3 코스의 점수를 계산한다.
    - 평점 보너스: rating 합
    - 이동 거리 패널티: 총 거리(m)에 -lambda 곱
    (lambda는 경험적으로 조정)
    """
    # a -> b -> c 거리
    d1 = haversine_distance(a.lat, a.lng, b.lat, b.lng)
    d2 = haversine_distance(b.lat, b.lng, c.lat, c.lng)
    total_d = d1 + d2

    rating_sum = a.rating + b.rating + c.rating

    # 간단한 예시 스코어:
    #   평점 1점 = +1
    #   거리 100m당 0.05점 패널티
    lambda_ = 0.05 / 100.0
    score = rating_sum - lambda_ * total_d

    return Course(
        score=score,
        total_distance_m=total_d,
        places=[a, b, c],
    )


# ---------- Main Endpoint ----------

@router.post("/plan", response_model=CourseResponse)
def plan_fixed_length_3_course(req: CourseRequest) -> CourseResponse:
    """
    길이 3(예: 영화관 -> 밥집 -> 카페) 코스를 추천하는 API

    - 내부적으로 기존 /maps/places(get_nearby_places)를 재사용
    - 각 step마다 per_step_limit 개수만큼 후보를 가져와서
      모든 조합을 완탐하여 점수가 높은 코스를 반환
    """
    if len(req.steps) != 3:
        raise HTTPException(status_code=400, detail="steps must have length 3")

    all_candidates: List[List[PlaceCandidate]] = []

    for idx, step in enumerate(req.steps):
        # 기존 google_api.get_nearby_places 재사용
        # get_nearby_places(
        #   query, type, min_rating, limit, lat, lng, radius
        # )
        res = get_nearby_places(
            query=step.query,
            type=step.type,
            min_rating=0.0,  # 여기서는 전체 후보를 보고 코스 차원에서 평가
            limit=req.per_step_limit,
            lat=req.center_lat,
            lng=req.center_lng,
            radius=req.radius,
        )
        places_data = res.get("places", [])

        if not places_data:
            raise HTTPException(
                status_code=404,
                detail=f"No candidates found for step {idx} (query={step.query}, type={step.type})",
            )

        step_candidates = to_candidates(places_data, step_index=idx)
        if not step_candidates:
            raise HTTPException(
                status_code=404,
                detail=f"No valid candidates (with lat/lng) for step {idx}",
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

    # 점수 기준 내림차순, 상위 5개 반환
    best_courses.sort(key=lambda x: x.score, reverse=True)
    top_k = best_courses[:5]

    return CourseResponse(courses=top_k)
