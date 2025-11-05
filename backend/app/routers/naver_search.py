# app/routers/naver_search.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pathlib import Path
import os, re, httpx, logging

router = APIRouter(prefix="/api/search", tags=["search"])

# ── .env 강제 로드 (backend 루트의 .env) ──
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
except Exception:
    pass

NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json"
log = logging.getLogger(__name__)

def _get_creds() -> tuple[str | None, str | None]:
    cid = os.getenv("NAVER_CLIENT_ID") or os.getenv("client_id")
    sec = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("client_secret")
    return cid, sec

class Place(BaseModel):
    title: str                # Naver 응답의 title (HTML 태그 포함 가능)
    name: str                 # 태그 제거한 장소명
    address: str              # 지번주소
    roadAddress: str | None = None
    category: str | None = None
    telephone: str | None = None

def _strip_tags(s: str | None) -> str:
    return re.sub(r"<[^>]*>", "", s or "").strip()

@router.get("/places")
async def search_places(q: str = Query(..., min_length=1), display: int = 10):
    client_id, client_secret = _get_creds()
    if not client_id or not client_secret:
        # 500 대신 503으로 의도 표현 (설정 문제)
        raise HTTPException(status_code=503, detail="Naver API credentials not configured")

    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }
    params = {"query": q, "display": min(max(display, 1), 30)}  # 1~30로 클램프

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(NAVER_LOCAL_URL, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        # 401/403: 크리덴셜/쿼터 문제일 확률 높음 -> 502로 래핑
        log.exception("NAVER API HTTP error: %s", e)
        raise HTTPException(status_code=502, detail=f"Naver API error ({e.response.status_code})")
    except httpx.RequestError as e:
        # 네트워크/타임아웃 -> 504
        log.exception("NAVER API request error: %s", e)
        raise HTTPException(status_code=504, detail="Naver API request failed")

    items: list[Place] = []
    for it in data.get("items", []):
        items.append(Place(
            title=it.get("title") or "",
            name=_strip_tags(it.get("title")),
            address=it.get("address") or "",
            roadAddress=it.get("roadAddress"),
            category=it.get("category"),
            telephone=it.get("telephone"),
        ))

    return {"items": [i.model_dump() for i in items]}  # Pydantic v2
