# app/routers/naver_search.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pathlib import Path
import os, re, logging
import httpx

router = APIRouter(prefix="/api/search", tags=["search"])

# ── .env 강제 로드 (backend 루트의 .env) ──
try:
    from dotenv import load_dotenv
    # backend/app/routers/naver_search.py -> backend/.env
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except Exception:
    pass

NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json"
GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"

log = logging.getLogger(__name__)


def _get_search_creds() -> tuple[str | None, str | None]:
    """
    Naver Search API 자격 증명 가져오기
    .env 파일의 NAVER_SEARCH_CLIENT_ID/NAVER_SEARCH_CLIENT_SECRET을 사용합니다.
    """
    try:
        from core.config import NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET
        if NAVER_SEARCH_CLIENT_ID and NAVER_SEARCH_CLIENT_SECRET:
            return NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET
    except Exception as e:
        log.warning("[NAVER Search] Failed to import from core.config: %s", e)
    
    return None, None


def _get_map_creds() -> tuple[str | None, str | None]:
    """
    Naver Maps API 자격 증명 가져오기
    .env 파일의 NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET을 사용합니다.
    """
    try:
        from core.config import NAVER_MAP_CLIENT_ID, NAVER_MAP_CLIENT_SECRET
        if NAVER_MAP_CLIENT_ID and NAVER_MAP_CLIENT_SECRET:
            return NAVER_MAP_CLIENT_ID, NAVER_MAP_CLIENT_SECRET
    except Exception as e:
        log.warning("[NAVER Maps] Failed to import from core.config: %s", e)
    
    return None, None


class Place(BaseModel):
    title: str                # Naver 응답의 title (HTML 태그 포함 가능)
    name: str                 # 태그 제거한 장소명
    address: str              # 지번주소
    roadAddress: str | None = None
    category: str | None = None
    telephone: str | None = None

    # 🔹 검색 시 서버에서 붙여주는 좌표
    latitude: float | None = None
    longitude: float | None = None


def _strip_tags(s: str | None) -> str:
    return re.sub(r"<[^>]*>", "", s or "").strip()


async def _geocode_address(
    client: httpx.AsyncClient,
    address: str,
    client_id: str,
    client_secret: str,
) -> tuple[float, float] | None:
    """
    네이버 Geocoding API를 사용해 address → (lat, lon) 변환
    실패 시 None
    """
    if not address:
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
        "Accept": "application/json",
    }
    params = {"query": address}

    try:
        r = await client.get(GEOCODE_URL, headers=headers, params=params, timeout=7.0)
        r.raise_for_status()
        data = r.json()
    except httpx.HTTPError as e:
        log.warning("NAVER Geocode HTTP error: %s", e)
        return None
    except ValueError:
        log.warning("NAVER Geocode JSON parse error (address=%s)", address)
        return None

    addresses = data.get("addresses", [])
    if not addresses:
        log.info("NAVER Geocode 0 result for address=%r", address)
        return None

    first = addresses[0]
    try:
        x = float(first["x"])  # lon
        y = float(first["y"])  # lat
        return (y, x)
    except (KeyError, ValueError) as e:
        log.warning("NAVER Geocode coord parse error: %s | payload=%s", e, first)
        return None


@router.get("/places")
async def search_places(q: str = Query(..., min_length=1), display: int = 10):
    # 검색 API 키 사용
    search_client_id, search_client_secret = _get_search_creds()
    if not search_client_id or not search_client_secret:
        raise HTTPException(status_code=503, detail="Naver Search API credentials not configured")

    headers = {
        "X-Naver-Client-Id": search_client_id,
        "X-Naver-Client-Secret": search_client_secret,
    }
    params = {"query": q, "display": min(max(display, 1), 30)}  # 1~30로 클램프

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # 1) 네이버 로컬 검색 먼저 호출
            r = await client.get(NAVER_LOCAL_URL, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()

            items: list[Place] = []

            for it in data.get("items", []):
                title_raw = it.get("title") or ""
                name = _strip_tags(it.get("title"))
                address = it.get("address") or ""
                road_addr = it.get("roadAddress") or None
                category = it.get("category")
                telephone = it.get("telephone")

                # 🔹 지오코딩용 주소: 도로명/지번 둘 다 시도
                # Maps API 키 사용
                map_client_id, map_client_secret = _get_map_creds()
                lat = lng = None
                # 1순위: 도로명주소
                coords = None
                if road_addr and map_client_id and map_client_secret:
                    coords = await _geocode_address(
                        client,
                        road_addr,
                        map_client_id,
                        map_client_secret,
                    )
                # 2순위: 도로명 실패 시 지번주소로 재시도
                if not coords and address and map_client_id and map_client_secret:
                    coords = await _geocode_address(
                        client,
                        address,
                        map_client_id,
                        map_client_secret,
                    )

                if coords:
                    lat, lng = coords

                items.append(
                    Place(
                        title=title_raw,
                        name=name,
                        address=address,
                        roadAddress=road_addr,
                        category=category,
                        telephone=telephone,
                        latitude=lat,
                        longitude=lng,
                    )
                )

    except httpx.HTTPStatusError as e:
        log.exception("NAVER API HTTP error: %s", e)
        raise HTTPException(status_code=502, detail=f"Naver API error ({e.response.status_code})")
    except httpx.RequestError as e:
        log.exception("NAVER API request error: %s", e)
        raise HTTPException(status_code=504, detail="Naver API request failed")

    return {"items": [i.model_dump() for i in items]}