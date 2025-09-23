import os
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import httpx

app = FastAPI(title="gmg")

# --- CORS 허용 ---
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 템플릿/정적파일 경로 ---
BASE_DIR = os.path.dirname(__file__)
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# --- 환경변수 ---
NCP_CLIENT_ID = os.getenv("NAVER_MAPS_CLIENT_ID", "")
NCP_CLIENT_SECRET = os.getenv("NAVER_MAPS_CLIENT_SECRET", "")

# --- 라우트들 ---
@app.get("/health")
def health():
    return {"status": "ok"}

# 지도 띄우는 HTML
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "ncp_client_id": NCP_CLIENT_ID},
    )

# 지오코딩 API 프록시
@app.get("/api/geocode")
async def geocode(query: str = Query(..., min_length=1)):
    if not NCP_CLIENT_ID or not NCP_CLIENT_SECRET:
        return JSONResponse({"error": "NAVER credentials not set"}, status_code=500)
    url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": NCP_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": NCP_CLIENT_SECRET,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, headers=headers, params={"query": query})
    return JSONResponse(r.json(), status_code=r.status_code)

# 길찾기 API 프록시
@app.get("/api/directions")
async def directions(start: str, goal: str, option: str = "trafast"):
    if not NCP_CLIENT_ID or not NCP_CLIENT_SECRET:
        return JSONResponse({"error": "NAVER credentials not set"}, status_code=500)
    url = "https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/driving"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": NCP_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": NCP_CLIENT_SECRET,
    }
    params = {"start": start, "goal": goal, "option": option}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, headers=headers, params=params)
    return JSONResponse(r.json(), status_code=r.status_code)
