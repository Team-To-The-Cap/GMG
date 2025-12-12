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


def _call_google_directions_api(
    *,
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: str,
) -> Optional[Dict[str, Any]]:
    """
    Google Directions API(legacy JSON) fallback.
    - driving: departure_time=now + duration_in_traffic 사용
    - walking/transit: duration 사용
    """
    if not GOOGLE_MAPS_API_KEY:
        return None

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params: Dict[str, Any] = {
        "origin": f"{start_lat},{start_lng}",
        "destination": f"{goal_lat},{goal_lng}",
        "mode": mode,
        "language": "ko",
        "key": GOOGLE_MAPS_API_KEY,
    }
    if mode in {"driving", "transit"}:
        params["departure_time"] = "now"
    if mode == "driving":
        params["traffic_model"] = "best_guess"

    try:
        res = requests.get(url, params=params, timeout=10)
    except requests.RequestException as e:
        log.warning("[GDIRECTIONS] request error: %s", e)
        return None

    if res.status_code != 200:
        log.warning(
            "[GDIRECTIONS] non-200 status=%s, body=%s", res.status_code, res.text[:400]
        )
        return None

    try:
        data = res.json()
    except ValueError:
        log.warning("[GDIRECTIONS] invalid JSON body=%s", res.text[:400])
        return None

    if data.get("status") != "OK":
        log.warning(
            "[GDIRECTIONS] status not OK: %s | error_message=%s",
            data.get("status"),
            data.get("error_message"),
        )
        return None

    routes = data.get("routes") or []
    if not routes:
        return None
    legs = (routes[0] or {}).get("legs") or []
    if not legs:
        return None
    leg0 = legs[0] or {}

    distance_m = (leg0.get("distance") or {}).get("value")
    if mode == "driving":
        duration_s = (leg0.get("duration_in_traffic") or {}).get("value")
    else:
        duration_s = (leg0.get("duration") or {}).get("value")

    if duration_s is None:
        return None

    return {
        "duration_seconds": int(duration_s),
        "distance_meters": (
            int(distance_m) if isinstance(distance_m, (int, float)) else None
        ),
        "mode": mode,
        "success": True,
        "source": "google_directions_api",
    }


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

    base_body: Dict[str, Any] = {
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

    def _with_traffic(b: Dict[str, Any]) -> Dict[str, Any]:
        bb = dict(b)
        bb["routingPreference"] = "TRAFFIC_AWARE"
        # Routes API는 departureTime이 "미래"여야 하는 경우가 있어
        dt = (datetime.now(timezone.utc) + timedelta(minutes=2)).replace(microsecond=0)
        bb["departureTime"] = dt.isoformat().replace("+00:00", "Z")
        return bb

    # Routes API는 FieldMask가 필수.
    # 문서 예시와 동일하게 polyline까지 포함해서 디버깅/확인을 쉽게 함.
    field_mask = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,geocodingResults"
    headers = {
        "Content-Type": "application/json",
        # Routes API 권장 방식: 헤더로 API Key/FieldMask 전달
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": field_mask,
    }

    def _post(body: Dict[str, Any]) -> Optional[requests.Response]:
        try:
            return requests.post(url, headers=headers, json=body, timeout=10)
        except requests.RequestException as e:
            log.warning("[GROUTES] request error: %s", e)
            return None

    # 1) driving이면 교통 반영 옵션으로 먼저 시도 → routes가 없으면 옵션 제거 후 재시도
    bodies: List[Dict[str, Any]] = []
    if travel_mode == "DRIVE":
        bodies.append(_with_traffic(base_body))
        bodies.append(dict(base_body))  # traffic 옵션 제거 fallback
    else:
        bodies.append(dict(base_body))

    last_non200: Optional[requests.Response] = None
    for attempt_idx, body in enumerate(bodies):
        res = _post(body)
        if res is None:
            return None
        if res.status_code != 200:
            last_non200 = res
            continue

        try:
            data = res.json()
        except ValueError:
            log.warning(
                "[GROUTES] invalid JSON | content_type=%s, body=%s",
                res.headers.get("content-type"),
                res.text[:800],
            )
            return None

        if isinstance(data, dict) and data.get("routes"):
            if travel_mode == "DRIVE" and attempt_idx == 1:
                log.warning(
                    "[GROUTES] traffic-aware returned no routes; fell back to non-traffic route"
                )
            return data

        # 200인데 routes가 아예 없으면 비정상 케이스라, 디버깅을 위해 응답/헤더/URL을 함께 남김
        log.warning(
            "[GROUTES] no routes | status=%s, content_type=%s, request_id=%s, url=%s, headers=%s, payload=%s, raw=%s | req=%s",
            res.status_code,
            res.headers.get("content-type"),
            res.headers.get("x-goog-request-id") or res.headers.get("x-goog-requestid"),
            str(getattr(res, "url", "")),
            dict(res.headers),
            str(data)[:800],
            res.text[:800],
            {
                "travelMode": travel_mode,
                "has_routingPreference": "routingPreference" in body,
                "has_departureTime": "departureTime" in body,
            },
        )

    if last_non200 is not None:
        log.warning(
            "[GROUTES] non-200 status=%s, content_type=%s, request_id=%s, body=%s",
            last_non200.status_code,
            last_non200.headers.get("content-type"),
            last_non200.headers.get("x-goog-request-id"),
            last_non200.text[:800],
        )
    return None


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
        # Routes가 계속 비정상(geocodingResults만)이라 Directions API로 fallback
        return _call_google_directions_api(
            start_lat=start_lat,
            start_lng=start_lng,
            goal_lat=goal_lat,
            goal_lng=goal_lng,
            mode=mode,
        )

    routes = data.get("routes") or []
    first = routes[0] if routes else None
    if not isinstance(first, dict):
        return _call_google_directions_api(
            start_lat=start_lat,
            start_lng=start_lng,
            goal_lat=goal_lat,
            goal_lng=goal_lng,
            mode=mode,
        )

    distance_m = first.get("distanceMeters")
    duration_s = _parse_duration_seconds(first.get("duration"))
    if duration_s is None:
        return _call_google_directions_api(
            start_lat=start_lat,
            start_lng=start_lng,
            goal_lat=goal_lat,
            goal_lng=goal_lng,
            mode=mode,
        )

    return {
        "duration_seconds": int(duration_s),
        "distance_meters": (
            int(distance_m) if isinstance(distance_m, (int, float)) else None
        ),
        "mode": mode,
        "success": True,
        "source": "google_routes_api",
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
