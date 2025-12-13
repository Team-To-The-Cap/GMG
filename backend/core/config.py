import os
from pathlib import Path

# python-dotenv이 없더라도 동작하도록 안전하게 로드
try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:  # 라이브러리 미설치 시 무시
    load_dotenv = None

# 운영에서도 확실히 backend/.env 를 읽도록 고정
if load_dotenv:
    try:
        BACKEND_ROOT = Path(__file__).resolve().parents[1]  # backend/
        load_dotenv(dotenv_path=BACKEND_ROOT / ".env")
    except Exception:
        # 환경변수로 주입되는 경우도 있으므로 실패해도 무시
        load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# 네이버 Maps API (Geocoding, Directions, Reverse Geocoding)
NAVER_MAP_CLIENT_ID = os.getenv("NAVER_MAP_CLIENT_ID")
NAVER_MAP_CLIENT_SECRET = os.getenv("NAVER_MAP_CLIENT_SECRET")

# 네이버 Search API (Local Search)
NAVER_SEARCH_CLIENT_ID = os.getenv("NAVER_SEARCH_CLIENT_ID")
NAVER_SEARCH_CLIENT_SECRET = os.getenv("NAVER_SEARCH_CLIENT_SECRET")

# 하위 호환성을 위한 변수 (deprecated - 사용하지 않는 것을 권장)
client_id = os.getenv("client_id")
client_secret = os.getenv("client_secret")
