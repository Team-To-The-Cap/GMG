# app/services/google_places_service.py
from typing import Any, Dict, List, Optional

import requests
from core.config import GOOGLE_MAPS_API_KEY

# 역세권 판단용 타입 집합
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
    """
    Google Places Nearby Search API 호출해서
    raw results 리스트를 그대로 반환.
    (필터링/정제는 사용하는 쪽에서)
    """
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

    res = requests.get(url, params=params, timeout=5)
    data = res.json()
    return data.get("results", [])


def fetch_nearby_stations(
    lat: float,
    lng: float,
    radius: int = 1500,
) -> List[Dict[str, Any]]:
    """
    주변 역(지하철/기차/버스) 후보들만 필터링해서 반환.
    """
    places = fetch_nearby_places(lat=lat, lng=lng, radius=radius)
    stations = [
        p
        for p in places
        if any(t in STATION_TYPES for t in (p.get("types") or []))
    ]
    return stations
