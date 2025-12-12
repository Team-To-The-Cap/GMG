# app/services/naver_directions.py

from __future__ import annotations

from typing import Any, Dict, Optional, Literal
import httpx
import logging
from pathlib import Path
import os

# ── .env 강제 로드 (backend 루트의 .env) ──
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except Exception:
    pass

log = logging.getLogger(__name__)

# 네이버 Directions API 엔드포인트
NAVER_DRIVING_URL = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving"
NAVER_WALKING_URL = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/walking"

# 대중교통은 네이버에서 별도 API가 있거나, 다른 방식으로 처리해야 할 수 있습니다
# 일단 자동차/도보만 구현하고, 대중교통은 추후 확장 가능하도록 구조 설계


def _get_naver_credentials() -> tuple[str | None, str | None]:
    """네이버 클라우드 플랫폼 인증 정보 가져오기"""
    client_id = os.getenv("NAVER_CLIENT_ID") or os.getenv("client_id")
    client_secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("client_secret")
    return client_id, client_secret


def _format_coordinates(lat: float, lng: float) -> str:
    """좌표를 네이버 API 형식으로 변환: "경도,위도" """
    return f"{lng},{lat}"


async def get_driving_direction(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    option: str = "trafast",  # trafast: 빠른길, tracomfort: 편한길, traoptimal: 최적
) -> Optional[Dict[str, Any]]:
    """
    네이버 Directions API를 사용하여 자동차 경로 정보 조회
    
    Args:
        start_lat: 출발지 위도
        start_lng: 출발지 경도
        goal_lat: 도착지 위도
        goal_lng: 도착지 경도
        option: 경로 옵션 (trafast: 빠른길, tracomfort: 편한길, traoptimal: 최적)
    
    Returns:
        API 응답 데이터 또는 None (실패 시)
    """
    client_id, client_secret = _get_naver_credentials()
    if not client_id or not client_secret:
        log.warning("[NAVER Directions] API credentials not configured")
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
    }

    params = {
        "start": _format_coordinates(start_lat, start_lng),
        "goal": _format_coordinates(goal_lat, goal_lng),
        "option": option,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NAVER_DRIVING_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != 0:
                log.warning(
                    "[NAVER Directions] API returned error code=%s, message=%s",
                    data.get("code"),
                    data.get("message"),
                )
                return None
            
            return data
            
    except httpx.HTTPStatusError as e:
        log.warning("[NAVER Directions] HTTP error: %s", e)
        return None
    except httpx.RequestError as e:
        log.warning("[NAVER Directions] Request error: %s", e)
        return None
    except ValueError as e:
        log.warning("[NAVER Directions] JSON parse error: %s", e)
        return None


async def get_walking_direction(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
) -> Optional[Dict[str, Any]]:
    """
    네이버 Directions API를 사용하여 도보 경로 정보 조회
    
    Args:
        start_lat: 출발지 위도
        start_lng: 출발지 경도
        goal_lat: 도착지 위도
        goal_lng: 도착지 경도
    
    Returns:
        API 응답 데이터 또는 None (실패 시)
    """
    client_id, client_secret = _get_naver_credentials()
    if not client_id or not client_secret:
        log.warning("[NAVER Directions] API credentials not configured")
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
    }

    params = {
        "start": _format_coordinates(start_lat, start_lng),
        "goal": _format_coordinates(goal_lat, goal_lng),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NAVER_WALKING_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != 0:
                log.warning(
                    "[NAVER Directions] API returned error code=%s, message=%s",
                    data.get("code"),
                    data.get("message"),
                )
                return None
            
            return data
            
    except httpx.HTTPStatusError as e:
        log.warning("[NAVER Directions] HTTP error: %s", e)
        return None
    except httpx.RequestError as e:
        log.warning("[NAVER Directions] Request error: %s", e)
        return None
    except ValueError as e:
        log.warning("[NAVER Directions] JSON parse error: %s", e)
        return None


def extract_travel_time_from_driving_response(data: Dict[str, Any], option: str = "trafast") -> Optional[int]:
    """
    자동차 경로 응답에서 이동 시간(초) 추출
    
    Args:
        data: 네이버 Directions API 응답 데이터
        option: 사용한 경로 옵션 (trafast, tracomfort, traoptimal)
    
    Returns:
        이동 시간(초) 또는 None
    """
    try:
        route = data.get("route", {})
        if not route:
            return None
        
        # option에 따라 키가 다름: trafast, tracomfort, traoptimal
        path_key = option
        if path_key not in route:
            # fallback: 첫 번째 경로 사용
            path_key = list(route.keys())[0] if route else None
            if not path_key:
                return None
        
        paths = route.get(path_key, [])
        if not paths:
            return None
        
        # 첫 번째 경로의 summary에서 duration 추출
        summary = paths[0].get("summary", {})
        duration = summary.get("duration")
        
        if duration is not None:
            return int(duration)
        
        return None
        
    except (KeyError, ValueError, TypeError) as e:
        log.warning("[NAVER Directions] Failed to extract duration: %s", e)
        return None


def extract_travel_time_from_walking_response(data: Dict[str, Any]) -> Optional[int]:
    """
    도보 경로 응답에서 이동 시간(초) 추출
    
    Args:
        data: 네이버 Directions API 응답 데이터
    
    Returns:
        이동 시간(초) 또는 None
    """
    try:
        route = data.get("route", {})
        if not route:
            return None
        
        # 도보는 traoptimal 키 사용
        paths = route.get("traoptimal", [])
        if not paths:
            return None
        
        # 첫 번째 경로의 summary에서 duration 추출
        summary = paths[0].get("summary", {})
        duration = summary.get("duration")
        
        if duration is not None:
            return int(duration)
        
        return None
        
    except (KeyError, ValueError, TypeError) as e:
        log.warning("[NAVER Directions] Failed to extract duration: %s", e)
        return None


async def get_travel_time(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: Literal["driving", "walking", "transit"] = "driving",
    driving_option: str = "trafast",
) -> Optional[Dict[str, Any]]:
    """
    출발지와 도착지 간의 이동 시간 계산 (통합 함수)
    
    Args:
        start_lat: 출발지 위도
        start_lng: 출발지 경도
        goal_lat: 도착지 위도
        goal_lng: 도착지 경도
        mode: 이동 수단 (driving, walking, transit)
        driving_option: 자동차 경로 옵션 (trafast, tracomfort, traoptimal)
    
    Returns:
        {
            "duration_seconds": int,  # 이동 시간(초)
            "distance_meters": int,   # 거리(미터) - 가능한 경우
            "mode": str,              # 사용한 이동 수단
            "success": bool,          # 성공 여부
        } 또는 None
    """
    if mode == "driving":
        data = await get_driving_direction(
            start_lat, start_lng, goal_lat, goal_lng, option=driving_option
        )
        if not data:
            return None
        
        duration = extract_travel_time_from_driving_response(data, option=driving_option)
        if duration is None:
            return None
        
        # 거리 정보 추출 (선택적)
        distance = None
        try:
            route = data.get("route", {})
            path_key = driving_option if driving_option in route else list(route.keys())[0]
            paths = route.get(path_key, [])
            if paths:
                summary = paths[0].get("summary", {})
                distance = summary.get("distance")
        except (KeyError, ValueError, TypeError):
            pass
        
        return {
            "duration_seconds": duration,
            "distance_meters": distance,
            "mode": "driving",
            "success": True,
        }
    
    elif mode == "walking":
        data = await get_walking_direction(start_lat, start_lng, goal_lat, goal_lng)
        if not data:
            return None
        
        duration = extract_travel_time_from_walking_response(data)
        if duration is None:
            return None
        
        # 거리 정보 추출 (선택적)
        distance = None
        try:
            route = data.get("route", {})
            paths = route.get("traoptimal", [])
            if paths:
                summary = paths[0].get("summary", {})
                distance = summary.get("distance")
        except (KeyError, ValueError, TypeError):
            pass
        
        return {
            "duration_seconds": duration,
            "distance_meters": distance,
            "mode": "walking",
            "success": True,
        }
    
    elif mode == "transit":
        # 대중교통은 네이버에서 별도 API가 필요할 수 있습니다
        # 현재는 None 반환 (추후 확장 가능)
        log.warning("[NAVER Directions] Transit mode not yet implemented")
        return None
    
    else:
        log.warning("[NAVER Directions] Unknown mode: %s", mode)
        return None

