# app/services/google_distance_matrix.py

from __future__ import annotations

from typing import Any, Dict, List, Optional
import requests
import logging

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


def _call_distance_matrix(
    origins: str,
    destinations: str,
    mode: str,
) -> Optional[Dict[str, Any]]:
    """
    Google Distance Matrix API 호출 래퍼.
    origins, destinations는 "lat,lng|lat,lng|..." 형식.
    """
    if not GOOGLE_MAPS_API_KEY:
        log.warning("[GDM] GOOGLE_MAPS_API_KEY not configured")
        return None

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params: Dict[str, Any] = {
        "origins": origins,
        "destinations": destinations,
        "mode": mode,
        "language": "ko",
        "key": GOOGLE_MAPS_API_KEY,
    }

    # driving일 때만 교통량 반영 옵션
    if mode == "driving":
        params["departure_time"] = "now"

    try:
        res = requests.get(url, params=params, timeout=5)
    except requests.RequestException as e:
        log.warning("[GDM] request error: %s", e)
        return None

    if res.status_code != 200:
        log.warning(
            "[GDM] non-200 status=%s, body=%s",
            res.status_code,
            res.text[:200],
        )
        return None

    data = res.json()
    if data.get("status") != "OK":
        log.warning("[GDM] API status not OK: %s", data.get("status"))
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
    data = _call_distance_matrix(
        origins=f"{start_lat},{start_lng}",
        destinations=f"{goal_lat},{goal_lng}",
        mode=mode,
    )
    if not data:
        return None

    rows = data.get("rows") or []
    if not rows:
        return None
    elements = (rows[0] or {}).get("elements") or []
    if not elements:
        return None

    elem = elements[0] or {}
    if elem.get("status") != "OK":
        return None

    distance_m = (elem.get("distance") or {}).get("value")
    duration_s = None

    if mode == "driving":
        duration_s = ((elem.get("duration_in_traffic") or {}) or {}).get("value")
    if duration_s is None:
        duration_s = (elem.get("duration") or {}).get("value")

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

    # 1) 참가자들을 Google mode 기준으로 그룹핑
    mode_to_participants: Dict[str, List[Dict[str, Any]]] = {}

    for p in participants:
        lat = p.get("lat")
        lng = p.get("lng")
        if lat is None or lng is None:
            continue

        mode = _transportation_to_google_mode(p.get("transportation"))
        mode_to_participants.setdefault(mode, []).append(p)

    if not mode_to_participants:
        return None

    # 2) destinations 문자열 (모든 후보 공통)
    dest_coords = [
        f"{c['lat']},{c['lng']}"
        for c in candidates
        if c.get("lat") is not None and c.get("lng") is not None
    ]
    if len(dest_coords) != len(candidates):
        log.warning("[GDM] some candidates lack lat/lng; they will be ignored")
    destinations_str = "|".join(dest_coords)

    if not destinations_str:
        return None

    # 3) 후보별 최대 소요시간 초기화
    n_candidates = len(candidates)
    max_times: List[float] = [0.0 for _ in range(n_candidates)]
    used_any = False

    # 4) mode 그룹별로 Distance Matrix 호출
    for mode, plist in mode_to_participants.items():
        if not plist:
            continue

        origins_str = "|".join(
            f"{p['lat']},{p['lng']}"
            for p in plist
        )
        if not origins_str:
            continue

        data = _call_distance_matrix(
            origins=origins_str,
            destinations=destinations_str,
            mode=mode,
        )
        if not data:
            continue

        rows = data.get("rows", [])
        if not rows:
            continue

        # rows[i] = i번째 origin에 대한 결과
        for row in rows:
            elements = row.get("elements", [])
            for j, elem in enumerate(elements):
                if j >= n_candidates:
                    break

                if elem.get("status") != "OK":
                    continue

                # driving인 경우 duration_in_traffic 우선 사용도 가능
                dur_sec = None
                if mode == "driving":
                    dur_sec = (
                        elem.get("duration_in_traffic") or {}
                    ).get("value")
                if dur_sec is None:
                    dur_sec = (elem.get("duration") or {}).get("value")

                if dur_sec is None:
                    continue

                used_any = True
                t = float(dur_sec)
                if t > max_times[j]:
                    max_times[j] = t

    if not used_any:
        return None

    # 5) minimax 기준: max_times[j] 가 최소인 j 선택
    best_index = min(range(n_candidates), key=lambda idx: max_times[idx])

    return {
        "max_times": max_times,
        "best_index": best_index,
    }