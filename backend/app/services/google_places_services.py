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

    print(
        f"[GGL] Request: url={url}, params={params}",
        flush=True
    )

    try:
        res = requests.get(url, params=params, timeout=5)
    except requests.RequestException as e:
        log.warning(f"[GGL] request error: {e}")
        print(f"[GGL] Request exception: {e}", flush=True)
        return []

    if res.status_code != 200:
        log.warning(
            "[GGL] non-200 response: status=%s, body=%s",
            res.status_code,
            res.text[:200],
        )
        print(
            f"[GGL] Non-200 response: status={res.status_code}, body={res.text[:500]}",
            flush=True
        )
        return []

    data = res.json()
    
    # API 응답 상태 확인
    status = data.get("status", "UNKNOWN")
    results = data.get("results", [])
    error_message = data.get("error_message", None)
    
    print(
        f"[GGL] Response: status={status}, results_count={len(results)}",
        flush=True
    )
    
    if status != "OK" and status != "ZERO_RESULTS":
        error_detail = f"status={status}"
        if error_message:
            error_detail += f", error_message={error_message}"
        print(
            f"[GGL] API error: {error_detail}",
            flush=True
        )
        # REQUEST_DENIED인 경우 명확히 표시
        if status == "REQUEST_DENIED":
            print(
                f"[GGL] WARNING: Places API (Legacy) is not enabled. "
                f"Please enable 'Places API (Legacy)' in Google Cloud Console or migrate to Places API (New).",
                flush=True
            )

    # ✅ 여기만 임시로 print로 바꾸자
    if results:
        print(
            "[PLACES] nearby result sample:",
            json.dumps(results[:3], ensure_ascii=False, indent=2),
            flush=True,   # 버퍼링 방지
        )
    else:
        print(
            f"[PLACES] No results found. API status: {status}",
            flush=True
        )

    return results

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