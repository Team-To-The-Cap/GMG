# app/services/google_places_service.py
from typing import Any, Dict, List, Optional

import logging
import requests
import json  # ✅ 추가
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

    # ✅ 여기만 임시로 print로 바꾸자
    print(
        "[PLACES] nearby result sample:",
        json.dumps(data.get("results", [])[:3], ensure_ascii=False, indent=2),
        flush=True,   # 버퍼링 방지
    )

    return data.get("results", [])

def fetch_nearby_stations(
    lat: float,
    lng: float,
    radius: int = 1500,
) -> List[Dict[str, Any]]:
    places = fetch_nearby_places(
        lat=lat,
        lng=lng,
        radius=radius,
        type="transit_station",
    )

    stations = [
        p
        for p in places
        if any(t in STATION_TYPES for t in (p.get("types") or []))
    ]

    log.info(
        "[GGL] stations search lat=%.6f, lng=%.6f, radius=%d -> %d stations",
        lat,
        lng,
        radius,
        len(stations),
    )

    return stations