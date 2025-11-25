# app/services/place_hotspot.py
from __future__ import annotations

from collections import Counter
from math import log1p
from typing import Any, Dict, List, Tuple

from core.place_category import (
    PlaceCategory,
    map_google_types_to_category,
)

# Google Places API 호출 함수 + STATION_TYPES
from .google_places_services import (
    fetch_nearby_places,
    fetch_nearby_stations,
    STATION_TYPES,
)


# 번화가 판단에 포함할 카테고리
BUSY_CATEGORIES: set[PlaceCategory] = {
    "restaurant",
    "cafe",
    "shopping",
    "activity",
    "culture",
    # "nature" 도 추가 가능
}


def score_area_with_places(
    lat: float,
    lng: float,
    radius: int = 400,
) -> Tuple[float, bool, int, Counter]:
    """
    특정 좌표 주변 radius(m)에 대해:
      - 역세권 여부
      - 번화가용 POI 개수
      - 카테고리별 카운트
      - 번화가 score 계산
    """

    places = fetch_nearby_places(lat=lat, lng=lng, radius=radius)
    if not places:
        return 0.0, False, 0, Counter()

    is_station_area = False
    category_counter: Counter = Counter()

    for p in places:
        types: List[str] = p.get("types") or []

        # 역세권 판정
        if any(t in STATION_TYPES for t in types):
            is_station_area = True

        # 우리 서비스 내부 카테고리로 매핑
        cat = map_google_types_to_category(types)
        if cat is not None:
            category_counter[cat] += 1

    # 번화가 POI 수
    poi_count = sum(
        count
        for cat, count in category_counter.items()
        if cat in BUSY_CATEGORIES
    )

    # 점수 계산
    score = 0.0

    # 역세권 보너스
    if is_station_area:
        score += 10.0

    # 번화가 밀도 점수 (log 스케일)
    score += 2.0 * log1p(poi_count)

    return score, is_station_area, poi_count, category_counter


def adjust_to_busy_station_area(
    lat: float,
    lng: float,
    base_radius: int = 400,            # 번화가 판정 반경
    station_search_radius: int = 1000, # 주변 역 탐색 반경
    min_score: float = 5.0,            # 번화가 유지 조건
    min_poi_count: int = 8,            # POI 최소 조건
) -> Dict[str, Any]:
    """
    1) (lat, lng)의 번화가 점수를 평가
    2) 충분히 번화한 곳이면 그대로 반환
    3) 부족하면 주변 역세권 후보를 찾고, 각 역 주변의 번화가 점수 계산
    4) 가장 점수 높은 역세권 좌표로 스냅

    return 구조:
    {
        "lat": float,
        "lng": float,
        "adjusted": bool,
        "reason": str,
        "original": {...},
        "chosen_station": {...} or None,
        "poi_name": str | None,   # ⭐ 역/POI 이름 (카드 큰 제목 용)
    }
    """

    # 1. 원래 위치 점수
    orig_score, orig_is_station, orig_poi_count, orig_cats = score_area_with_places(
        lat, lng, radius=base_radius
    )

    original_info = {
        "lat": lat,
        "lng": lng,
        "score": orig_score,
        "is_station_area": orig_is_station,
        "poi_count": orig_poi_count,
        "category_counts": dict(orig_cats),
    }

    # 2. 이미 충분히 번화가라면 그대로 반환
    if orig_score >= min_score and orig_poi_count >= min_poi_count:
        return {
            "lat": lat,
            "lng": lng,
            "adjusted": False,
            "reason": "original_point_is_already_busy",
            "original": original_info,
            "chosen_station": None,
            "poi_name": None,  # 🔹 아직 별도 POI 안 골랐으니 None
        }

    # 3. 주변 역 목록
    stations = fetch_nearby_stations(lat=lat, lng=lng, radius=station_search_radius)
    if not stations:
        return {
            "lat": lat,
            "lng": lng,
            "adjusted": False,
            "reason": "no_station_found_nearby",
            "original": original_info,
            "chosen_station": None,
            "poi_name": None,
        }

    # 4. 가장 좋은 역 찾기
    best_station = None
    best_station_score = -1.0
    best_station_info: Dict[str, Any] | None = None

    # NOTE: 원래 [:1:] 때문에 "첫 역만" 보고 있었음
    #       일단 기존 로직 유지
    for st in stations[:1]:
        loc = st.get("geometry", {}).get("location", {})
        s_lat = loc.get("lat")
        s_lng = loc.get("lng")

        if s_lat is None or s_lng is None:
            continue

        score, is_station, poi_count, cats = score_area_with_places(
            s_lat, s_lng, radius=base_radius
        )

        if score > best_station_score:
            best_station_score = score
            best_station = st
            best_station_info = {
                "lat": s_lat,
                "lng": s_lng,
                "name": st.get("name"),
                "place_id": st.get("place_id"),
                "score": score,
                "is_station_area": is_station,
                "poi_count": poi_count,
                "category_counts": dict(cats),
            }

    # 5. 역 후보가 없거나, 원래보다 나은 곳이 없다면 이동 안 함
    if best_station is None or best_station_score < orig_score:
        return {
            "lat": lat,
            "lng": lng,
            "adjusted": False,
            "reason": "no_better_station_area_found",
            "original": original_info,
            "chosen_station": None,
            "poi_name": None,
        }

    # 6. 가장 점수 높은 역세권으로 스냅 + poi_name 지정
    poi_name = best_station_info.get("name") if best_station_info else None

    return {
        "lat": best_station_info["lat"],
        "lng": best_station_info["lng"],
        "adjusted": True,
        "reason": "moved_to_better_station_area",
        "original": original_info,
        "chosen_station": best_station_info,
        "poi_name": poi_name,  # ⭐ 여기서 이름 흘려보냄
    }