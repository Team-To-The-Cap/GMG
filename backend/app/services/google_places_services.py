# app/services/google_places_service.py
from typing import Any, Dict, List, Optional

import logging
import requests
from core.config import GOOGLE_MAPS_API_KEY

log = logging.getLogger(__name__)

STATION_TYPES = {
    "subway_station",
    "train_station",
    "transit_station",
    "bus_station",
}


def fetch_nearby_places(
    lat: float,
    lng: float,
    radius: int = 1000,
    keyword: Optional[str] = None,
    type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params: Dict[str, Any] = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "language": "ko",
        "key": GOOGLE_MAPS_API_KEY,
    }

    if keyword:
        params["keyword"] = keyword
    if type:
        params["type"] = type

    try:
        res = requests.get(url, params=params, timeout=5)
    except requests.RequestException as e:
        log.warning(f"[GGL] request error: {e}")
        return []

    if res.status_code != 200:
        log.warning(
            "[GGL] non-200 response: status=%s, body=%s",
            res.status_code,
            res.text[:200],
        )
        return []

    data = res.json()
    return data.get("results", [])


def fetch_nearby_stations(
    lat: float,
    lng: float,
    radius: int = 1500,
) -> List[Dict[str, Any]]:
    """
    주변 역(지하철/기차/버스) 후보들만 필터링해서 반환.
    -> 너무 많은 로그 안 찍게 요약만 출력
    """
    # 1) transit_station 기준으로만 한 번 호출 (심플하게)
    places = fetch_nearby_places(
        lat=lat,
        lng=lng,
        radius=radius,
        type="transit_station",  # ★ 핵심: 역/환승 관련 장소만 가져오기
    )

    # 2) 역 타입만 필터링
    stations = [
        p
        for p in places
        if any(t in STATION_TYPES for t in (p.get("types") or []))
    ]

    # 3) 로그는 한 줄만 (몇 개 나왔는지만)
    log.info(
        "[GGL] stations search lat=%.6f, lng=%.6f, radius=%d -> %d stations",
        lat,
        lng,
        radius,
        len(stations),
    )

    return stations
