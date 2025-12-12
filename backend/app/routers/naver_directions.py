# app/routers/naver_directions.py

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Literal, Optional
import logging

from ..services.naver_directions import (
    get_travel_time,
    get_driving_direction,
    get_walking_direction,
    get_route,
)

# NOTE: 프론트에서 /directions/* 로 호출하고 있으므로 prefix를 /directions 로 맞춥니다.
# (기존 /api/directions 는 404를 유발하여 직선 fallback만 보이던 원인)
router = APIRouter(prefix="/directions", tags=["directions"])

log = logging.getLogger(__name__)


class TravelTimeRequest(BaseModel):
    """이동 시간 계산 요청 모델"""
    start_lat: float
    start_lng: float
    goal_lat: float
    goal_lng: float
    mode: Literal["driving", "walking", "transit"] = "driving"
    driving_option: Optional[str] = "trafast"  # trafast, tracomfort, traoptimal


class TravelTimeResponse(BaseModel):
    """이동 시간 계산 응답 모델"""
    duration_seconds: int
    duration_minutes: float
    distance_meters: Optional[int] = None
    mode: str
    success: bool


class RoutePoint(BaseModel):
    lat: float
    lng: float


class RouteResponse(BaseModel):
    duration_seconds: int
    duration_minutes: float
    distance_meters: Optional[int] = None
    mode: str
    path: List[RoutePoint]
    success: bool


class MultiPointTravelTimeRequest(BaseModel):
    """여러 지점 간 이동 시간 계산 요청 모델"""
    points: List[dict]  # [{"lat": float, "lng": float}, ...]
    mode: Literal["driving", "walking", "transit"] = "driving"
    driving_option: Optional[str] = "trafast"


class MultiPointTravelTimeResponse(BaseModel):
    """여러 지점 간 이동 시간 계산 응답 모델"""
    routes: List[dict]  # 각 경로별 정보
    total_duration_seconds: int
    total_duration_minutes: float


@router.post("/travel-time", response_model=TravelTimeResponse)
async def calculate_travel_time(request: TravelTimeRequest):
    """
    두 지점 간의 이동 시간 계산
    
    - driving: 자동차 경로
    - walking: 도보 경로
    - transit: 대중교통 (아직 미구현)
    """
    try:
        result = await get_travel_time(
            start_lat=request.start_lat,
            start_lng=request.start_lng,
            goal_lat=request.goal_lat,
            goal_lng=request.goal_lng,
            mode=request.mode,
            driving_option=request.driving_option or "trafast",
        )
        
        if not result or not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail="경로를 찾을 수 없습니다. 좌표나 이동 수단을 확인해주세요."
            )
        
        duration_sec = result["duration_seconds"]
        
        return TravelTimeResponse(
            duration_seconds=duration_sec,
            duration_minutes=round(duration_sec / 60.0, 2),
            distance_meters=result.get("distance_meters"),
            mode=result["mode"],
            success=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error calculating travel time: %s", e)
        raise HTTPException(status_code=500, detail=f"이동 시간 계산 중 오류가 발생했습니다: {str(e)}")


@router.get("/travel-time")
async def calculate_travel_time_get(
    start_lat: float = Query(..., description="출발지 위도"),
    start_lng: float = Query(..., description="출발지 경도"),
    goal_lat: float = Query(..., description="도착지 위도"),
    goal_lng: float = Query(..., description="도착지 경도"),
    mode: Literal["driving", "walking", "transit"] = Query("driving", description="이동 수단"),
    driving_option: str = Query("trafast", description="자동차 경로 옵션 (trafast, tracomfort, traoptimal)"),
):
    """
    두 지점 간의 이동 시간 계산 (GET 방식)
    """
    request = TravelTimeRequest(
        start_lat=start_lat,
        start_lng=start_lng,
        goal_lat=goal_lat,
        goal_lng=goal_lng,
        mode=mode,
        driving_option=driving_option,
    )
    return await calculate_travel_time(request)


@router.get("/route", response_model=RouteResponse)
async def get_route_get(
    start_lat: float = Query(..., description="출발지 위도"),
    start_lng: float = Query(..., description="출발지 경도"),
    goal_lat: float = Query(..., description="도착지 위도"),
    goal_lng: float = Query(..., description="도착지 경도"),
    mode: Literal["driving", "walking", "transit"] = Query("driving", description="이동 수단"),
    driving_option: str = Query("trafast", description="자동차 경로 옵션 (trafast, tracomfort, traoptimal)"),
):
    """
    두 지점 간의 경로(geometry) + 이동 시간 반환 (GET 방식)
    - driving/walking: 네이버 Directions의 path를 반환
    - transit: 미구현 (404)
    """
    try:
        result = await get_route(
            start_lat=start_lat,
            start_lng=start_lng,
            goal_lat=goal_lat,
            goal_lng=goal_lng,
            mode=mode,
            driving_option=driving_option,
        )

        if not result or not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail="경로를 찾을 수 없습니다. 좌표나 이동 수단을 확인해주세요.",
            )

        duration_sec = int(result["duration_seconds"])
        path = result.get("path") or []
        if not path:
            raise HTTPException(status_code=404, detail="경로 좌표를 찾을 수 없습니다.")

        return RouteResponse(
            duration_seconds=duration_sec,
            duration_minutes=round(duration_sec / 60.0, 2),
            distance_meters=result.get("distance_meters"),
            mode=result.get("mode", mode),
            path=[RoutePoint(**p) for p in path],
            success=True,
        )
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error getting route: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"경로 조회 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/travel-time/multi-point")
async def calculate_multi_point_travel_time(request: MultiPointTravelTimeRequest):
    """
    여러 지점을 순차적으로 이동하는 총 이동 시간 계산
    
    예: 지점 A -> 지점 B -> 지점 C 순으로 이동하는 총 시간 계산
    """
    if len(request.points) < 2:
        raise HTTPException(status_code=400, detail="최소 2개 이상의 지점이 필요합니다.")
    
    routes = []
    total_duration_sec = 0
    
    try:
        for i in range(len(request.points) - 1):
            start = request.points[i]
            goal = request.points[i + 1]
            
            if "lat" not in start or "lng" not in start:
                raise HTTPException(
                    status_code=400,
                    detail=f"{i}번째 지점에 lat, lng 정보가 없습니다."
                )
            if "lat" not in goal or "lng" not in goal:
                raise HTTPException(
                    status_code=400,
                    detail=f"{i+1}번째 지점에 lat, lng 정보가 없습니다."
                )
            
            result = await get_travel_time(
                start_lat=start["lat"],
                start_lng=start["lng"],
                goal_lat=goal["lat"],
                goal_lng=goal["lng"],
                mode=request.mode,
                driving_option=request.driving_option or "trafast",
            )
            
            if not result or not result.get("success"):
                routes.append({
                    "from": i,
                    "to": i + 1,
                    "success": False,
                    "error": "경로를 찾을 수 없습니다.",
                })
                continue
            
            duration_sec = result["duration_seconds"]
            total_duration_sec += duration_sec
            
            routes.append({
                "from": i,
                "to": i + 1,
                "duration_seconds": duration_sec,
                "duration_minutes": round(duration_sec / 60.0, 2),
                "distance_meters": result.get("distance_meters"),
                "success": True,
            })
        
        return MultiPointTravelTimeResponse(
            routes=routes,
            total_duration_seconds=total_duration_sec,
            total_duration_minutes=round(total_duration_sec / 60.0, 2),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error calculating multi-point travel time: %s", e)
        raise HTTPException(status_code=500, detail=f"이동 시간 계산 중 오류가 발생했습니다: {str(e)}")


@router.get("/travel-time/multi-point")
async def calculate_multi_point_travel_time_get(
    points: str = Query(..., description='지점 좌표들: "lat1,lng1|lat2,lng2|lat3,lng3" 형식'),
    mode: Literal["driving", "walking", "transit"] = Query("driving", description="이동 수단"),
    driving_option: str = Query("trafast", description="자동차 경로 옵션"),
):
    """
    여러 지점 간 이동 시간 계산 (GET 방식)
    
    points 형식: "lat1,lng1|lat2,lng2|lat3,lng3"
    """
    try:
        point_list = []
        for point_str in points.split("|"):
            parts = point_str.split(",")
            if len(parts) != 2:
                raise HTTPException(status_code=400, detail=f"잘못된 좌표 형식: {point_str}")
            
            point_list.append({
                "lat": float(parts[0].strip()),
                "lng": float(parts[1].strip()),
            })
        
        request = MultiPointTravelTimeRequest(
            points=point_list,
            mode=mode,
            driving_option=driving_option,
        )
        return await calculate_multi_point_travel_time(request)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"좌표 파싱 오류: {str(e)}")
    except Exception as e:
        log.exception("Error parsing points: %s", e)
        raise HTTPException(status_code=400, detail=f"요청 파라미터 오류: {str(e)}")

