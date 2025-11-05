from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

# PostgreSQL 접속 주소 (duram/mydatabase 설정 기반)
SQLALCHEMY_DATABASE_URL = "postgresql://duram:duram@localhost:5432/mydatabase"

# SQLAlchemy 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)

# DB 접속 세션 공장
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# DB 모델이 상속할 기본 클래스
Base = declarative_base()

# DB 세션 의존성 함수
def get_db() -> Generator[Session, None, None]:
    """API 요청마다 새로운 DB 세션을 생성하고, 요청이 끝나면 세션을 닫습니다."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()