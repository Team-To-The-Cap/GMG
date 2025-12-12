# app/services/naver_directions.py

from __future__ import annotations

from typing import Any, Dict, Optional, Literal, List
import httpx
import logging
from pathlib import Path
import os
import math

# ── .env 강제 로드 (backend 루트의 .env) ──
try:
    from dotenv import load_dotenv

    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except Exception:
    pass

log = logging.getLogger(__name__)
# Google Distance Matrix (교통 반영)
try:
    from ..services.google_distance_matrix import get_travel_time_single as _gdm_single
except Exception:
    _gdm_single = None

# 정확한(실시간) 값만 허용할지 여부
# - 기본값: 정확값만 (추정치 금지)
# - 필요 시 서버 env로 ALLOW_ESTIMATED_TRAVEL_TIME=true 설정
ALLOW_ESTIMATED_TRAVEL_TIME = os.getenv(
    "ALLOW_ESTIMATED_TRAVEL_TIME", ""
).strip().lower() in {"1", "true", "yes", "y"}


# 네이버 Directions API 엔드포인트
# 공식 문서: https://maps.apigw.ntruss.com/map-direction/v1/driving
NAVER_DRIVING_URL = "https://maps.apigw.ntruss.com/map-direction/v1/driving"
NAVER_WALKING_URL = "https://maps.apigw.ntruss.com/map-direction/v1/walking"

# OpenRouteService (OpenStreetMap 기반) API 엔드포인트
ORS_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY") or os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org/v2"

# 대중교통은 네이버에서 별도 API가 있거나, 다른 방식으로 처리해야 할 수 있습니다
# 일단 자동차/도보만 구현하고, 대중교통은 추후 확장 가능하도록 구조 설계


def _get_naver_apigw_credentials() -> tuple[str | None, str | None]:
    """
    Naver Maps/Directions(APIGW) 인증키.
    .env 파일의 client_id/client_secret만 사용합니다.
    """
    # core.config의 client_id/client_secret (.env의 client_id/client_secret)
    try:
        from core.config import client_id, client_secret

        if client_id and client_secret:
            # 따옴표 제거
            client_id_clean = str(client_id).strip().strip('"').strip("'")
            client_secret_clean = str(client_secret).strip().strip('"').strip("'")

            log.info(
                "[NAVER Credentials] Using client_id/client_secret from core.config (.env)"
            )
            return client_id_clean, client_secret_clean
    except Exception as e:
        log.warning("[NAVER Credentials] Failed to import from core.config: %s", e)

    log.error(
        "[NAVER Credentials] ✗ No credentials found | "
        "Please set client_id and client_secret in .env file"
    )
    return None, None


def _format_coordinates(lat: float, lng: float) -> str:
    """좌표를 네이버 API 형식으로 변환: "경도,위도" """
    return f"{lng},{lat}"


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """대략적인 직선거리(미터) 계산."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _fallback_travel_time(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: Literal["driving", "walking", "transit"],
) -> Dict[str, Any]:
    """
    네이버 API 실패 시 fallback 이동 시간.
    - driving/transit: 30km/h
    - walking: 4.5km/h
    """
    distance_m = _haversine_meters(start_lat, start_lng, goal_lat, goal_lng)
    speed_kmh = 4.5 if mode == "walking" else 30.0
    speed_mps = (speed_kmh * 1000.0) / 3600.0
    duration_s = max(60, int(distance_m / max(speed_mps, 0.1)))  # 최소 1분
    return {
        "duration_seconds": duration_s,
        "distance_meters": int(distance_m),
        "mode": mode,
        "success": True,
        "is_estimated": True,
    }


def _fail_unavailable(mode: str) -> Dict[str, Any]:
    return {"success": False, "mode": mode, "error": "travel_time_unavailable"}


async def _call_openrouteservice(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: Literal["driving", "walking"],
) -> Optional[Dict[str, Any]]:
    """
    OpenRouteService (OpenStreetMap 기반) API 호출
    - driving: driving-car 프로필
    - walking: foot-walking 프로필
    - 한국 지역 지원, 무료 티어 제공
    """
    if not ORS_API_KEY:
        log.debug("[ORS] API key not configured")
        return None

    # OpenRouteService 프로필 매핑
    profile_map = {
        "driving": "driving-car",
        "walking": "foot-walking",
    }
    profile = profile_map.get(mode)
    if not profile:
        return None

    url = f"{ORS_BASE_URL}/directions/{profile}"
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
    }

    # OpenRouteService는 [경도, 위도] 형식 사용
    body = {
        "coordinates": [[start_lng, start_lat], [goal_lng, goal_lat]],
        "units": "m",
        "format": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()

            routes = data.get("routes", [])
            if not routes:
                log.warning("[ORS] No routes returned")
                return None

            route = routes[0]
            summary = route.get("summary", {})
            duration_s = summary.get("duration")
            distance_m = summary.get("distance")

            if duration_s is None:
                log.warning("[ORS] Duration not found in response")
                return None

            log.info(
                "[ORS] ✓ Success for mode=%s | duration=%.1fs, distance=%.1fm",
                mode,
                duration_s,
                distance_m or 0,
            )

            return {
                "duration_seconds": int(duration_s),
                "distance_meters": int(distance_m) if distance_m else None,
                "mode": mode,
                "success": True,
                "source": "openrouteservice",
            }

    except httpx.HTTPStatusError as e:
        body_text = None
        try:
            body_text = e.response.text
        except Exception:
            pass
        log.warning(
            "[ORS] HTTP error: %s | status=%s | body=%s",
            e,
            e.response.status_code,
            body_text[:200] if body_text else None,
        )
        return None
    except httpx.RequestError as e:
        log.warning("[ORS] Request error: %s", e)
        return None
    except (KeyError, ValueError, TypeError) as e:
        log.warning("[ORS] Response parse error: %s", e)
        return None


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
    client_id, client_secret = _get_naver_apigw_credentials()

    # 자격 증명 값 검증 및 정리
    if not client_id or not client_secret:
        log.error(
            "[NAVER Directions] [DRIVING API] ✗ API credentials not configured | "
            "client_id=%s, client_secret=%s",
            client_id,
            client_secret,
        )
        return None

    # 공백이나 따옴표 제거
    client_id_clean = str(client_id).strip().strip('"').strip("'")
    client_secret_clean = str(client_secret).strip().strip('"').strip("'")

    if not client_id_clean or not client_secret_clean:
        log.error(
            "[NAVER Directions] [DRIVING API] ✗ Credentials are empty after cleaning | "
            "client_id_clean=%s, client_secret_clean=%s",
            client_id_clean,
            client_secret_clean,
        )
        return None

    # 자격 증명 값 상세 검증
    log.warning(
        "[NAVER Directions] [DRIVING API] Credential details: "
        "key_id=%r (len=%d, repr=%s) | key=%r (len=%d, repr=%s)",
        client_id_clean,
        len(client_id_clean),
        repr(client_id_clean),
        client_secret_clean,
        len(client_secret_clean),
        repr(client_secret_clean),
    )

    # 숨겨진 공백이나 특수문자 확인
    if (
        client_id_clean != client_id_clean.strip()
        or client_secret_clean != client_secret_clean.strip()
    ):
        log.error(
            "[NAVER Directions] [DRIVING API] ✗ Credentials contain hidden whitespace!"
        )

    # 빈 문자열이나 None 체크
    if not client_id_clean or client_id_clean.isspace():
        log.error(
            "[NAVER Directions] [DRIVING API] ✗ client_id is empty or whitespace only"
        )
        return None
    if not client_secret_clean or client_secret_clean.isspace():
        log.error(
            "[NAVER Directions] [DRIVING API] ✗ client_secret is empty or whitespace only"
        )
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id_clean,
        "X-NCP-APIGW-API-KEY": client_secret_clean,
    }

    params = {
        "start": _format_coordinates(start_lat, start_lng),
        "goal": _format_coordinates(goal_lat, goal_lng),
        "option": option,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            log.warning(
                "[NAVER Directions] [DRIVING API] Request: URL=%s | params=%s | "
                "header_KEY_ID=%s (len=%d) | header_KEY=%s (len=%d)",
                NAVER_DRIVING_URL,
                params,
                (
                    headers.get("X-NCP-APIGW-API-KEY-ID", "MISSING")[:15] + "..."
                    if len(headers.get("X-NCP-APIGW-API-KEY-ID", "")) > 15
                    else headers.get("X-NCP-APIGW-API-KEY-ID", "MISSING")
                ),
                len(headers.get("X-NCP-APIGW-API-KEY-ID", "")),
                (
                    headers.get("X-NCP-APIGW-API-KEY", "MISSING")[:15] + "..."
                    if len(headers.get("X-NCP-APIGW-API-KEY", "")) > 15
                    else headers.get("X-NCP-APIGW-API-KEY", "MISSING")
                ),
                len(headers.get("X-NCP-APIGW-API-KEY", "")),
            )
            response = await client.get(
                NAVER_DRIVING_URL, headers=headers, params=params
            )
            log.warning(
                "[NAVER Directions] [DRIVING API] Response: status=%s | content_type=%s",
                response.status_code,
                response.headers.get("content-type"),
            )

            # 401 에러도 응답 본문을 확인하기 위해 raise_for_status 전에 처리
            if response.status_code == 401:
                try:
                    error_body = response.json()
                    log.error(
                        "[NAVER Directions] [DRIVING API] 401 Authentication Failed | body=%s",
                        str(error_body)[:500],
                    )
                except Exception:
                    log.error(
                        "[NAVER Directions] [DRIVING API] 401 Authentication Failed | body=%s",
                        response.text[:500],
                    )

            # 네이버 API는 인증 실패 시 HTTP 200으로 응답하지만 본문에 error 객체를 포함
            data = response.json()
            
            # 인증 실패 체크 (errorCode: 200, message: "Authentication Failed")
            if "error" in data:
                error_info = data.get("error", {})
                error_code = error_info.get("errorCode")
                error_message = error_info.get("message", "")
                
                if error_code == "200" or "Authentication Failed" in error_message:
                    log.error(
                        "[NAVER Directions] [DRIVING API] ✗ Authentication Failed | "
                        "errorCode=%s, message=%s, details=%s | "
                        "해결 방법: 네이버 클라우드 플랫폼 콘솔에서 Application에 'Directions 5' 또는 'Directions 15' 서비스를 등록했는지 확인하세요. "
                        "또한 API 키가 Directions API용인지 확인하세요.",
                        error_code,
                        error_message,
                        error_info.get("details", ""),
                    )
                    return None
                else:
                    log.error(
                        "[NAVER Directions] [DRIVING API] ✗ API error: errorCode=%s, message=%s, details=%s",
                        error_code,
                        error_message,
                        error_info.get("details", ""),
                    )
                    return None

            response.raise_for_status()

            log.warning(
                "[NAVER Directions] [DRIVING API] Response data: code=%s, message=%s, has_route=%s, route_keys=%s",
                data.get("code"),
                data.get("message"),
                "route" in data,
                list(data.get("route", {}).keys()) if data.get("route") else None,
            )

            if data.get("code") != 0:
                log.error(
                    "[NAVER Directions] [DRIVING API] ✗ API error: code=%s, message=%s | full_response=%s",
                    data.get("code"),
                    data.get("message"),
                    str(data)[:500],
                )
                return None

            log.warning(
                "[NAVER Directions] [DRIVING API] ✓ SUCCESS | route_keys=%s",
                list(data.get("route", {}).keys()) if data.get("route") else None,
            )
            return data

    except httpx.HTTPStatusError as e:
        body = None
        try:
            body = e.response.text
        except Exception:
            body = None

        # 401 Unauthorized는 인증 실패 (API 키 문제)
        if e.response.status_code == 401:
            log.error(
                "[NAVER Directions] Authentication failed (401) - API credentials invalid or missing | "
                "Please check client_id and client_secret in .env file | "
                "body=%s",
                body,
            )
        else:
            log.warning(
                "[NAVER Directions] HTTP error: %s | status=%s | body=%s",
                e,
                e.response.status_code,
                body,
            )
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
    client_id, client_secret = _get_naver_apigw_credentials()

    if not client_id or not client_secret:
        log.error(
            "[NAVER Directions] [WALKING API] ✗ API credentials not configured | "
            "client_id=%s, client_secret=%s",
            client_id,
            client_secret,
        )
        return None

    # 공백이나 따옴표 제거
    client_id_clean = str(client_id).strip().strip('"').strip("'")
    client_secret_clean = str(client_secret).strip().strip('"').strip("'")

    if not client_id_clean or not client_secret_clean:
        log.error(
            "[NAVER Directions] [WALKING API] ✗ Credentials are empty after cleaning"
        )
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id_clean,
        "X-NCP-APIGW-API-KEY": client_secret_clean,
    }

    params = {
        "start": _format_coordinates(start_lat, start_lng),
        "goal": _format_coordinates(goal_lat, goal_lng),
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                NAVER_WALKING_URL, headers=headers, params=params
            )
            
            # 네이버 API는 인증 실패 시 HTTP 200으로 응답하지만 본문에 error 객체를 포함
            data = response.json()
            
            # 인증 실패 체크 (errorCode: 200, message: "Authentication Failed")
            if "error" in data:
                error_info = data.get("error", {})
                error_code = error_info.get("errorCode")
                error_message = error_info.get("message", "")
                
                if error_code == "200" or "Authentication Failed" in error_message:
                    log.error(
                        "[NAVER Directions] [WALKING API] ✗ Authentication Failed | "
                        "errorCode=%s, message=%s, details=%s | "
                        "해결 방법: 네이버 클라우드 플랫폼 콘솔에서 Application에 'Directions 5' 또는 'Directions 15' 서비스를 등록했는지 확인하세요.",
                        error_code,
                        error_message,
                        error_info.get("details", ""),
                    )
                    return None
                else:
                    log.error(
                        "[NAVER Directions] [WALKING API] ✗ API error: errorCode=%s, message=%s",
                        error_code,
                        error_message,
                    )
                    return None

            response.raise_for_status()

            if data.get("code") != 0:
                log.warning(
                    "[NAVER Directions] API returned error code=%s, message=%s",
                    data.get("code"),
                    data.get("message"),
                )
                return None

            return data

    except httpx.HTTPStatusError as e:
        body = None
        try:
            body = e.response.text
        except Exception:
            body = None

        # 401 Unauthorized는 인증 실패 (API 키 문제)
        if e.response.status_code == 401:
            log.error(
                "[NAVER Directions] Authentication failed (401) - API credentials invalid or missing | "
                "Please check client_id and client_secret in .env file | "
                "body=%s",
                body,
            )
        else:
            log.warning(
                "[NAVER Directions] HTTP error: %s | status=%s | body=%s",
                e,
                e.response.status_code,
                body,
            )
        return None
    except httpx.RequestError as e:
        log.warning("[NAVER Directions] Request error: %s", e)
        return None
    except ValueError as e:
        log.warning("[NAVER Directions] JSON parse error: %s", e)
        return None


def extract_travel_time_from_driving_response(
    data: Dict[str, Any], option: str = "trafast"
) -> Optional[int]:
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


def _extract_route_path_points(
    data: Dict[str, Any],
    preferred_key: Optional[str] = None,
) -> Optional[List[Dict[str, float]]]:
    """
    네이버 Directions 응답에서 path 좌표를 추출해 [{lat, lng}, ...]로 변환.
    - Naver 응답 path는 보통 [[lng, lat], ...] 형태.
    """
    try:
        route = data.get("route", {})
        if not route or not isinstance(route, dict):
            return None

        keys: List[str] = []
        if preferred_key and preferred_key in route:
            keys.append(preferred_key)
        # fallback: route에 있는 첫 키부터 탐색
        keys.extend([k for k in route.keys() if k not in keys])

        for key in keys:
            paths = route.get(key)
            if not paths or not isinstance(paths, list):
                continue
            first = paths[0] if paths else None
            if not first or not isinstance(first, dict):
                continue
            raw_path = first.get("path")
            if not raw_path or not isinstance(raw_path, list):
                continue

            points: List[Dict[str, float]] = []
            for pair in raw_path:
                if (
                    isinstance(pair, (list, tuple))
                    and len(pair) >= 2
                    and isinstance(pair[0], (int, float))
                    and isinstance(pair[1], (int, float))
                ):
                    lng = float(pair[0])
                    lat = float(pair[1])
                    points.append({"lat": lat, "lng": lng})
            return points if points else None

        return None
    except Exception as e:
        log.warning("[NAVER Directions] Failed to extract route path: %s", e)
        return None


def extract_route_path_from_driving_response(
    data: Dict[str, Any],
    option: str = "trafast",
) -> Optional[List[Dict[str, float]]]:
    return _extract_route_path_points(data, preferred_key=option)


def extract_route_path_from_walking_response(
    data: Dict[str, Any],
) -> Optional[List[Dict[str, float]]]:
    # walking은 traoptimal 키를 우선 사용
    return _extract_route_path_points(data, preferred_key="traoptimal")


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
        log.info(
            "[TRAVEL_TIME] driving mode | start=(%.6f,%.6f) goal=(%.6f,%.6f)",
            start_lat,
            start_lng,
            goal_lat,
            goal_lng,
        )

        # 자동차: Naver Directions API만 사용
        log.info("[TRAVEL_TIME] [DRIVING] Step 1: Calling Naver Directions API...")
        data = await get_driving_direction(
            start_lat, start_lng, goal_lat, goal_lng, option=driving_option
        )
        if not data:
            # Naver API 실패 시 계산 실패 반환
            log.error(
                "[TRAVEL_TIME] [DRIVING] ✗ Step 1 FAILED: Naver Directions API returned None - calculation failed"
            )
            return _fail_unavailable("driving")

        log.info(
            "[TRAVEL_TIME] [DRIVING] ✓ Step 1 SUCCESS: Naver Directions API returned data | "
            "route_keys=%s, option=%s",
            list(data.get("route", {}).keys()) if data.get("route") else None,
            driving_option,
        )

        log.info("[TRAVEL_TIME] [DRIVING] Step 2: Extracting duration from response...")
        duration = extract_travel_time_from_driving_response(
            data, option=driving_option
        )
        if duration is None:
            # 경로는 찾았지만 duration 추출 실패 시 계산 실패 반환
            log.error(
                "[TRAVEL_TIME] [DRIVING] ✗ Step 2 FAILED: Failed to extract duration from response | "
                "data_keys=%s, option=%s",
                list(data.keys()) if isinstance(data, dict) else None,
                driving_option,
            )
            return _fail_unavailable("driving")

        log.info(
            "[TRAVEL_TIME] [DRIVING] ✓ Step 2 SUCCESS: Duration extracted | duration=%ds",
            duration,
        )

        # 거리 정보 추출 (선택적)
        distance = None
        try:
            route = data.get("route", {})
            path_key = (
                driving_option if driving_option in route else list(route.keys())[0]
            )
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
            "is_estimated": False,
            "source": "naver_directions",
        }

    elif mode == "walking":
        log.info(
            "[TRAVEL_TIME] walking mode | start=(%.6f,%.6f) goal=(%.6f,%.6f)",
            start_lat,
            start_lng,
            goal_lat,
            goal_lng,
        )

        # 도보: calc_func.py처럼 거리/속도로 계산 (나이브한 방법)
        # calc_func.py의 MODE_SPEED_KMPH["walking"] = 4.0 km/h 사용
        log.warning(
            "[TRAVEL_TIME] [WALKING] Calculating using Haversine distance and speed (calc_func.py 방식)"
        )

        WALKING_SPEED_KMPH = 4.0  # calc_func.py와 동일

        distance_m = _haversine_meters(start_lat, start_lng, goal_lat, goal_lng)
        speed_mps = (WALKING_SPEED_KMPH * 1000.0) / 3600.0  # m/s로 변환
        duration_s = max(60, int(distance_m / max(speed_mps, 0.1)))  # 최소 1분

        log.warning(
            "[TRAVEL_TIME] [WALKING] ✓ SUCCESS: Calculated | distance=%.1fm, speed=%.1f km/h, duration=%ds (%.1f min)",
            distance_m,
            WALKING_SPEED_KMPH,
            duration_s,
            duration_s / 60.0,
        )

        return {
            "duration_seconds": duration_s,
            "distance_meters": int(distance_m),
            "mode": "walking",
            "success": True,
            "is_estimated": False,  # calc_func.py와 동일한 방식이므로 정상 계산값
            "source": "haversine_calculation",
        }

    elif mode == "transit":
        log.info(
            "[TRAVEL_TIME] transit mode | start=(%.6f,%.6f) goal=(%.6f,%.6f)",
            start_lat,
            start_lng,
            goal_lat,
            goal_lng,
        )

        # 대중교통: Google transit만 사용
        if _gdm_single is not None:
            log.info(
                "[TRAVEL_TIME] [TRANSIT] Step 1: Calling Google Distance Matrix API..."
            )
            g = _gdm_single(
                start_lat=start_lat,
                start_lng=start_lng,
                goal_lat=goal_lat,
                goal_lng=goal_lng,
                mode="transit",
            )

            log.info(
                "[TRAVEL_TIME] [TRANSIT] Google API response: result=%s, success=%s, source=%s",
                "None" if g is None else "dict",
                g.get("success") if g else None,
                g.get("source") if g else None,
            )

            if g and g.get("success"):
                log.info(
                    "[TRAVEL_TIME] [TRANSIT] ✓ Step 1 SUCCESS: Google Distance Matrix | "
                    "duration=%ds, distance=%sm, source=%s",
                    g.get("duration_seconds"),
                    g.get("distance_meters"),
                    g.get("source", "unknown"),
                )
                return {
                    "duration_seconds": int(g["duration_seconds"]),
                    "distance_meters": g.get("distance_meters"),
                    "mode": "transit",
                    "success": True,
                    "is_estimated": False,
                    "source": "google_distance_matrix",
                }
            else:
                log.error(
                    "[TRAVEL_TIME] [TRANSIT] ✗ Step 1 FAILED: Google Distance Matrix | "
                    "result=%s, success=%s, error=%s",
                    "None" if g is None else "dict",
                    g.get("success") if g else None,
                    g.get("error") if g else None,
                )
        else:
            log.error(
                "[TRAVEL_TIME] [TRANSIT] ✗ Google Distance Matrix not available (_gdm_single is None)"
            )

        # Google API 실패 시 계산 실패 반환
        log.error(
            "[TRAVEL_TIME] [TRANSIT] ✗ FINAL FAILED: Google API failed for transit - calculation failed"
        )
        return _fail_unavailable("transit")

    else:
        log.warning("[NAVER Directions] Unknown mode: %s", mode)
        # 알 수 없는 mode는 계산 실패 반환
        return _fail_unavailable(str(mode))


async def get_route(
    start_lat: float,
    start_lng: float,
    goal_lat: float,
    goal_lng: float,
    mode: Literal["driving", "walking", "transit"] = "driving",
    driving_option: str = "trafast",
) -> Optional[Dict[str, Any]]:
    """
    출발지와 도착지 간의 경로(geometry) + 이동 시간 반환.
    반환 형태:
        {
            "duration_seconds": int,
            "distance_meters": int | None,
            "mode": str,
            "path": [{"lat": float, "lng": float}, ...],
            "success": bool,
        }
    """
    if mode == "driving":
        data = await get_driving_direction(
            start_lat, start_lng, goal_lat, goal_lng, option=driving_option
        )
        if not data:
            return None

        duration = extract_travel_time_from_driving_response(
            data, option=driving_option
        )
        path = extract_route_path_from_driving_response(data, option=driving_option)
        if duration is None or not path:
            return None

        distance = None
        try:
            route = data.get("route", {})
            path_key = (
                driving_option if driving_option in route else list(route.keys())[0]
            )
            paths = route.get(path_key, [])
            if paths:
                summary = paths[0].get("summary", {})
                distance = summary.get("distance")
        except Exception:
            pass

        return {
            "duration_seconds": int(duration),
            "distance_meters": distance,
            "mode": "driving",
            "path": path,
            "success": True,
        }

    if mode == "walking":
        data = await get_walking_direction(start_lat, start_lng, goal_lat, goal_lng)
        if not data:
            return None

        duration = extract_travel_time_from_walking_response(data)
        path = extract_route_path_from_walking_response(data)
        if duration is None or not path:
            return None

        distance = None
        try:
            route = data.get("route", {})
            paths = route.get("traoptimal", [])
            if paths:
                summary = paths[0].get("summary", {})
                distance = summary.get("distance")
        except Exception:
            pass

        return {
            "duration_seconds": int(duration),
            "distance_meters": distance,
            "mode": "walking",
            "path": path,
            "success": True,
        }

    # NOTE: transit은 임시로 driving route를 반환 (도로 기반)
    if mode == "transit":
        data = await get_driving_direction(
            start_lat, start_lng, goal_lat, goal_lng, option=driving_option
        )
        if not data:
            return None

        duration = extract_travel_time_from_driving_response(
            data, option=driving_option
        )
        path = extract_route_path_from_driving_response(data, option=driving_option)
        if duration is None or not path:
            return None

        distance = None
        try:
            route = data.get("route", {})
            path_key = (
                driving_option if driving_option in route else list(route.keys())[0]
            )
            paths = route.get(path_key, [])
            if paths:
                summary = paths[0].get("summary", {})
                distance = summary.get("distance")
        except Exception:
            pass

        return {
            "duration_seconds": int(duration),
            "distance_meters": distance,
            "mode": "transit",
            "path": path,
            "success": True,
        }

    log.warning("[NAVER Directions] Unknown mode for route: %s", mode)
    return None
