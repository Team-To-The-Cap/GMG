import os
import math
import requests
from typing import Dict, Any, List, Optional

NAVER_DEV_CLIENT_ID = os.getenv("NAVER_DEV_CLIENT_ID") or "YDXhhSgySL8j1g5knCeD"
NAVER_DEV_CLIENT_SECRET = os.getenv("NAVER_DEV_CLIENT_SECRET") or "WIlqk_QToI"

LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"

def haversine(lat1, lng1, lat2, lng2) -> float:
    """두 좌표 간 거리(m)"""
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def normalize_wgs84(value: str) -> Optional[float]:
    """
    지역검색 API의 mapx/mapy는 WGS84 경/위도지만 정수 스케일로 오는 경우가 있어요.
    합리적인 스케일 후보로 나눠서 (-200~200) 범위에 들어오면 채택합니다.
    """
    try:
        v = float(value)
    except Exception:
        return None
    if -200 <= v <= 200:
        return v
    for scale in (1e7, 1e6, 1e5, 1e4):
        vv = v / scale
        if -200 <= vv <= 200:
            return vv
    return None

def naver_local_search(query: str, display: int = 5, start: int = 1) -> Dict[str, Any]:
    if not NAVER_DEV_CLIENT_ID or not NAVER_DEV_CLIENT_SECRET:
        raise RuntimeError("환경변수 NAVER_DEV_CLIENT_ID / NAVER_DEV_CLIENT_SECRET가 비어있습니다.")
    headers = {
        "X-Naver-Client-Id": NAVER_DEV_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_DEV_CLIENT_SECRET,
    }
    params = {"query": query, "display": display, "start": start, "sort": "random"}
    r = requests.get(LOCAL_SEARCH_URL, headers=headers, params=params, timeout=10)
    # 에러 핸들링
    try:
        r.raise_for_status()
    except requests.HTTPError:
        print(f"[HTTP {r.status_code}] {r.text}")
        raise
    return r.json()

def search_nearby_keyword(center_lat: float, center_lng: float, keyword: str,
                          radius_m: int = 1500, per_page: int = 30, max_pages: int = 3) -> List[Dict[str, Any]]:
    """
    키워드로 검색 → 좌표 정규화 → 중심좌표 반경 필터링
    (Developers 지역검색은 위치 파라미터가 없어 우리가 필터링)
    """
    results: List[Dict[str, Any]] = []
    start = 1
    pages = 0
    while pages < max_pages:
        data = naver_local_search(keyword, display=per_page, start=start)
        items = data.get("items", [])
        if not items:
            break
        for it in items:
            name = (it.get("title") or "").replace("<b>", "").replace("</b>", "")
            lng = normalize_wgs84(it.get("mapx", ""))
            lat = normalize_wgs84(it.get("mapy", ""))
            if lat is None or lng is None:
                continue
            dist = haversine(center_lat, center_lng, lat, lng)
            if dist <= radius_m:
                results.append({
                    "name": name,
                    "lat": lat,
                    "lng": lng,
                    "address": it.get("roadAddress") or it.get("address") or "",
                    "category": it.get("category") or "",
                    "distance_m": int(dist)
                })
        total = data.get("total", 0)
        start += per_page
        pages += 1
        if start > total:
            break
    # 거리 가까운 순 정렬
    results.sort(key=lambda x: x["distance_m"])
    return results

if __name__ == "__main__":
    # 예: 서울시청(37.5665, 126.9780) 기준 1.5km 반경 "카페" 검색
    center_lat, center_lng = 37.5665, 126.9780
    keyword = "카페"
    places = search_nearby_keyword(center_lat, center_lng, keyword, radius_m=1500, per_page=30, max_pages=5)
    print(f"Found {len(places)} places within 1.5km for '{keyword}'")
    for p in places[:10]:
        print(p)
