# app/services/google_distance_matrix.py

from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
import logging
from datetime import datetime, timezone, timedelta

from core.config import GOOGLE_MAPS_API_KEY

log = logging.getLogger(__name__)


def _transportation_to_google_mode(transportation: Optional[str]) -> str:
    """
    Participant.transportation 문자열을
    Google Distance Matrix mode(driving/walking/transit)로 변환.
    """
    if not transportation:
        return "driving"

    s = transportation.strip().lower()

    # 도보
    if s in {"도보", "걷기", "walk", "walking", "w"}:
        return "walking"

    # 대중교통
    if s in {"대중교통", "지하철", "버스", "subway", "train", "transit", "t"}:
        return "transit"

    # 자동차
    if s in {"자동차", "차", "car", "drive", "driving", "d"}:
        return "driving"

    # 기타는 일단 자동차 취급
    return "driving"


def _to_routes_travel_mode(mode: str) -> str:
    m = (mode or "").strip().lower()
    if m == "driving":
        return "DRIVE"
    if m == "walking":
        return "WALK"
    if m == "transit":
        return "TRANSIT"
    return "DRIVE"


def _parse_duration_seconds(duration: Any) -> Optional[int]:
    """
    Routes API duration은 보통 "123s" 형태(string)로 옵니다.
    """
    if duration is None:
        return None
    if isinstance(duration, (int, float)):
        return int(duration)
    if isinstance(duration, str):
        s = duration.strip()
        if s.endswith("s"):
            try:
                return int(float(s[:-1]))
            except ValueError:
                return None
    return None


def _call_routes_compute_routes(
    *,
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: str,
) -> Optional[Dict[str, Any]]:
    """
    Google Routes API(신규) 호출 래퍼.
    - 기존 Distance Matrix(legacy)가 막힌 프로젝트에서도 사용 가능(단, Routes API 활성화 필요).
    - driving일 때 TRAFFIC_AWARE_OPTIMAL + departureTime(now)로 실시간 교통 반영.
    """
    if not GOOGLE_MAPS_API_KEY:
        log.warning("[GROUTES] GOOGLE_MAPS_API_KEY not configured")
        return None

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    travel_mode = _to_routes_travel_mode(mode)

    body: Dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {"latitude": float(start_lat), "longitude": float(start_lng)}
            }
        },
        "destination": {
            "location": {
                "latLng": {"latitude": float(goal_lat), "longitude": float(goal_lng)}
            }
        },
        "travelMode": travel_mode,
        "languageCode": "ko-KR",
        "regionCode": "KR",
        "units": "METRIC",
        "computeAlternativeRoutes": False,
    }

    if travel_mode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE_OPTIMAL"
        # Routes API는 departureTime이 "미래"여야 하는 경우가 있어
        # now로 보내면 서버 처리 지연/시계 오차로 과거로 판정되어 400이 날 수 있음.
        dt = (datetime.now(timezone.utc) + timedelta(minutes=2)).replace(microsecond=0)
        body["departureTime"] = dt.isoformat().replace("+00:00", "Z")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
    }

    try:
        # Routes API는 FieldMask가 필수라서, 디버깅 단계에서는 fields=* 로 전체 응답을 받습니다.
        # (안정화 후에는 fields를 필요한 것만으로 좁혀 비용/지연을 줄이세요)
        res = requests.post(url, headers=headers, params={"fields": "*"}, json=body, timeout=8)
    except requests.RequestException as e:
        log.warning("[GROUTES] request error: %s", e)
        return None

    if res.status_code != 200:
        log.warning(
            "[GROUTES] non-200 status=%s, content_type=%s, body=%s",
            res.status_code,
            res.headers.get("content-type"),
            res.text[:800],
        )
        return None

    try:
        data = res.json()
    except ValueError:
        log.warning(
            "[GROUTES] invalid JSON | content_type=%s, body=%s",
            res.headers.get("content-type"),
            res.text[:800],
        )
        return None

    if not isinstance(data, dict) or not data.get("routes"):
        # Routes API는 오류 시 error 객체를 주는 경우가 많음
        log.warning(
            "[GROUTES] no routes | content_type=%s, payload=%s, raw=%s",
            res.headers.get("content-type"),
            str(data)[:800],
            res.text[:800],
        )
        return None

    return data


def get_travel_time_single(
    *,
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: str,
) -> Optional[Dict[str, Any]]:
    """
    단일 출발지→도착지에 대한 이동 시간/거리 반환.
    - driving: departure_time=now가 적용되므로 duration_in_traffic 우선 사용 가능
    """
    data = _call_routes_compute_routes(
        start_lat=start_lat,
        start_lng=start_lng,
        goal_lat=goal_lat,
        goal_lng=goal_lng,
        mode=mode,
    )
    if not data:
        return None

    routes = data.get("routes") or []
    first = routes[0] if routes else None
    if not isinstance(first, dict):
        return None

    distance_m = first.get("distanceMeters")
    duration_s = _parse_duration_seconds(first.get("duration"))
    if duration_s is None:
        return None

    return {
        "duration_seconds": int(duration_s),
        "distance_meters": int(distance_m) if isinstance(distance_m, (int, float)) else None,
        "mode": mode,
        "success": True,
    }


def compute_minimax_travel_times(
    participants: List[Dict[str, Any]],
    candidates: List[Dict[str, float]],
) -> Optional[Dict[str, Any]]:
    """
    하이브리드 공평성 보정 핵심 함수.

    participants: [
        {"lat": float, "lng": float, "transportation": str},
        ...
    ]

    candidates: [
        {"lat": float, "lng": float, ...},
        ...
    ]

    반환:
    {
        "max_times": [float, ...],   # 각 후보별 참가자 최대 소요시간(sec)
        "best_index": int,           # minimax 기준 최적 후보 인덱스
    }
    """
    if not participants or not candidates:
        return None

    # 후보별 최대 소요시간 초기화
    n_candidates = len(candidates)
    max_times: List[float] = [0.0 for _ in range(n_candidates)]

    used_any = False
    # Routes API로 각 (참가자, 후보) 쌍을 계산 (top_k가 작으므로 OK)
    for j, c in enumerate(candidates):
        clat = c.get("lat")
        clng = c.get("lng")
        if clat is None or clng is None:
            continue

        worst = 0.0
        ok_any = False

        for p in participants:
            plat = p.get("lat")
            plng = p.get("lng")
            if plat is None or plng is None:
                continue

            mode = _transportation_to_google_mode(p.get("transportation"))
            r = get_travel_time_single(
                start_lat=float(plat),
                start_lng=float(plng),
                goal_lat=float(clat),
                goal_lng=float(clng),
                mode=mode,
            )
            if not r or not r.get("success"):
                ok_any = False
                break

            ok_any = True
            t = float(r["duration_seconds"])
            if t > worst:
                worst = t

        if ok_any:
            used_any = True
            max_times[j] = worst

    if not used_any:
        return None

    # 5) minimax 기준: max_times[j] 가 최소인 j 선택
    best_index = min(range(n_candidates), key=lambda idx: max_times[idx])

    return {
        "max_times": max_times,
        "best_index": best_index,
    }