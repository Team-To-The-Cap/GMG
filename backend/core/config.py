from dotenv import load_dotenv
from pathlib import Path
import os

# 운영에서도 확실히 backend/.env 를 읽도록 고정
try:
    BACKEND_ROOT = Path(__file__).resolve().parents[1]  # backend/
    load_dotenv(dotenv_path=BACKEND_ROOT / ".env")
except Exception:
    # 환경변수로 주입되는 경우도 있으므로 실패해도 무시
    load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

client_id = os.getenv("client_id")
client_secret = os.getenv("client_secret")
