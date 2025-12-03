# backend/app/routers/google_api.py
from fastapi import APIRouter, Query
import requests
from core.config import GOOGLE_MAPS_API_KEY

router = APIRouter(prefix="/maps", tags=["Google Maps"])

@router.get("/places")
def get_nearby_places(
    query: str = Query(..., description="검색어 예: 돈까스"),
    type: str = Query("restaurant", description="장소 유형, 예: restaurant, cafe"),
    min_rating: float = Query(0.0, description="최소 평점 (0~5)"),
    limit: int = Query(10, description="최대 결과 개수"),
    lat: float = Query(..., description="중심 위도"),
    lng: float = Query(..., description="중심 경도"),
    radius: int = Query(1000, description="검색 반경 (미터 단위)")
):
    """
    Google Places Nearby Search API 기반
    - 지정한 좌표(lat,lng) 중심
    - 지정한 반경(radius) 내에서 keyword, type 기준으로 검색
    """

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "keyword": query, 
        "type": type,   
        "language": "ko",
        "key": GOOGLE_MAPS_API_KEY
    }

    res = requests.get(url, params=params).json()

    filtered = [
        p for p in res.get("results", [])
        if p.get("rating", 0) >= min_rating
    ][:limit]

    cleaned = [
        {
            "name": p.get("name"),
            "rating": p.get("rating"),
            "user_ratings_total": p.get("user_ratings_total"),
            "address": p.get("vicinity"),
            "location": p.get("geometry", {}).get("location", {}),
            "open_now": p.get("opening_hours", {}).get("open_now"),
            "types": p.get("types"),
            "place_id": p.get("place_id"),
        }
        for p in filtered
    ]

    return {"count": len(cleaned), "places": cleaned}
